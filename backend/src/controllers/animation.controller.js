const supabase = require('../config/supabase');

// Generate unique filename
const generateFilename = (originalName) => {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${random}.${extension}`;
};

// GET /api/animations
const getPublicAnimations = async (req, res) => {
    try {
        const { data: animations, error } = await supabase
            .from('animations')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error fetching public animations:', error);
            if (error.code === '42P01') return res.json([]);
            throw error;
        }

        if (!animations || animations.length === 0) return res.json([]);

        const creatorIds = [...new Set(animations.map(a => a.creator_id).filter(Boolean))];
        let profiles = [];
        
        if (creatorIds.length > 0) {
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('id, display_name, avatar_url')
                .in('id', creatorIds);
            if (profileData) profiles = profileData;
        }

        const enrichedAnimations = animations.map(anim => {
            const profile = profiles.find(p => p.id === anim.creator_id);
            return { ...anim, user_profiles: profile || null };
        });

        res.json(enrichedAnimations);
    } catch (err) {
        console.error('Error fetching animations:', err);
        res.status(500).json({ error: 'Failed to fetch animations' });
    }
};

// POST /api/animations/upload
const uploadAnimation = async (req, res) => {
    try {
        const { name, category, origin, gender, desc, is_public, creator_id } = req.body;
        const fbxFile = req.files['fbx'] ? req.files['fbx'][0] : null;

        const finalUserId = creator_id || '00000000-0000-0000-0000-000000000000';

        if (!name || !fbxFile) {
            return res.status(400).json({ error: 'Name and FBX file are required' });
        }

        const fbxFilename = `fbx/${generateFilename(fbxFile.originalname)}`;
        const { error: fbxUploadError } = await supabase.storage
            .from('animations')
            .upload(fbxFilename, fbxFile.buffer, {
                contentType: fbxFile.mimetype || 'application/octet-stream'
            });

        if (fbxUploadError) throw fbxUploadError;

        const { data: fbxData } = supabase.storage
            .from('animations')
            .getPublicUrl(fbxFilename);
        const fbxUrl = fbxData.publicUrl;

        const { data: animData, error: dbError } = await supabase
            .from('animations')
            .insert([{
                creator_id: finalUserId,
                name,
                category: category || 'Cơ bản & Di chuyển',
                origin: origin || 'Khác',
                gender: gender || 'Khác',
                description: desc || '',
                file_url: fbxUrl,
                is_public: is_public === 'true'
            }])
            .select();

        if (dbError) throw dbError;

        res.json({ message: 'Animation uploaded successfully', animation: animData[0] });
    } catch (err) {
        console.error('Error uploading animation:', err);
        res.status(500).json({ error: 'Failed to upload animation', details: err.message });
    }
};

// POST /api/animations/save/:id
const saveAnimation = async (req, res) => {
    try {
        const { id } = req.params;
        const { creator_id } = req.body;
        const finalUserId = creator_id || '00000000-0000-0000-0000-000000000000';

        const { data: animData, error: animError } = await supabase
            .from('animations')
            .select('id')
            .eq('id', id)
            .single();
            
        if (animError || !animData) return res.status(404).json({ error: 'Animation not found' });

        const { error: saveError } = await supabase
            .from('user_saved_animations')
            .insert([{ user_id: finalUserId, animation_id: id }]);

        if (saveError) {
             if (saveError.code === '23505') return res.status(400).json({ error: 'Animation already saved' });
             throw saveError;
        }

        res.json({ message: 'Animation saved successfully' });
    } catch (err) {
        console.error('Error saving animation:', err);
        res.status(500).json({ error: 'Failed to save animation' });
    }
};

// DELETE /api/animations/save/:id
const unsaveAnimation = async (req, res) => {
    try {
        const { id } = req.params;
        const { creator_id } = req.body;
        const finalUserId = creator_id || '00000000-0000-0000-0000-000000000000';

        const { error: unsaveError } = await supabase
            .from('user_saved_animations')
            .delete()
            .match({ user_id: finalUserId, animation_id: id });

        if (unsaveError) throw unsaveError;

        res.json({ message: 'Animation unsaved successfully' });
    } catch (err) {
        console.error('Error unsaving animation:', err);
        res.status(500).json({ error: 'Failed to unsave animation' });
    }
};

// GET /api/animations/my-saved
const getMySavedAnimations = async (req, res) => {
    try {
        const { creator_id } = req.query;
        if (!creator_id) return res.json([]);

        const { data, error } = await supabase
            .from('user_saved_animations')
            .select(`
                id,
                animation_id,
                animations (*)
            `)
            .eq('user_id', creator_id);

        if (error) {
            if (error.code === '42P01') return res.json([]);
            throw error;
        }
        
        const animations = (data || []).map(row => row.animations).filter(Boolean);
        res.json(animations);
    } catch (err) {
        console.error('Error fetching my saved animations:', err);
        res.status(500).json({ error: 'Failed to fetch saved animations' });
    }
};

// GET /api/animations/my-uploads
const getMyUploadsAnimations = async (req, res) => {
    try {
        const { creator_id } = req.query;
        if (!creator_id) return res.status(400).json({ error: 'creator_id is required' });

        const { data: animations, error } = await supabase
            .from('animations')
            .select('*')
            .eq('creator_id', creator_id)
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') return res.json([]);
            throw error;
        }
        res.json(animations);
    } catch (err) {
        console.error('Error fetching my uploaded animations:', err);
        res.status(500).json({ error: 'Failed to fetch my uploaded animations' });
    }
};

// DELETE /api/animations/:id
const deleteAnimation = async (req, res) => {
    try {
        const { id } = req.params;
        const { creator_id } = req.query;

        if (!creator_id) return res.status(400).json({ error: 'creator_id is required' });

        const { data: animData } = await supabase.from('animations').select('creator_id').eq('id', id).single();
        if (!animData || animData.creator_id !== creator_id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { error: deleteError } = await supabase.from('animations').delete().eq('id', id);
        if (deleteError) throw deleteError;

        res.json({ message: 'Animation deleted successfully' });
    } catch (err) {
        console.error('Error deleting animation:', err);
        res.status(500).json({ error: 'Failed to delete animation' });
    }
};
// PUT /api/animations/:id
const updateAnimation = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, desc, gender, origin, is_public, creator_id } = req.body;
        
        if (!creator_id) {
            return res.status(400).json({ error: 'creator_id is required' });
        }

        // Verify ownership
        const { data: animData } = await supabase.from('animations').select('creator_id').eq('id', id).single();
        if (!animData || animData.creator_id !== creator_id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const updateData = {
            name,
            category,
            description: desc,
            gender,
            origin,
            is_public: is_public === 'true'
        };

        if (req.files && req.files.fbx && req.files.fbx.length > 0) {
            const fbxFile = req.files.fbx[0];
            const fbxFileName = `anim_${Date.now()}_${Math.random().toString(36).substring(7)}.fbx`;
            const { data: fbxData, error: fbxError } = await supabase.storage
                .from('animations')
                .upload(fbxFileName, fbxFile.buffer, {
                    contentType: 'application/octet-stream',
                    upsert: false
                });

            if (fbxError) throw fbxError;
            
            const { data: fbxPublicData } = supabase.storage
                .from('animations')
                .getPublicUrl(fbxFileName);
            updateData.file_url = fbxPublicData.publicUrl;
        }

        const { error: updateError } = await supabase
            .from('animations')
            .update(updateData)
            .eq('id', id);

        if (updateError) throw updateError;

        res.json({ message: 'Animation updated successfully' });
    } catch (error) {
        console.error('Error updating animation:', error);
        res.status(500).json({ error: 'Failed to update animation' });
    }
};

module.exports = {
    getPublicAnimations,
    uploadAnimation,
    saveAnimation,
    unsaveAnimation,
    getMySavedAnimations,
    getMyUploadsAnimations,
    deleteAnimation,
    updateAnimation
};
