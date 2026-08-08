const supabase = require('../config/supabase');

// Generate unique filename
const generateFilename = (originalName) => {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${random}.${extension}`;
};

// GET /api/characters/discover
const getDiscoverCharacters = async (req, res) => {
    try {
        const { data: characters, error } = await supabase
            .from('public_characters')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error fetching public characters:', error);
            // Ignore error if table doesn't exist yet and just return empty array
            if (error.code === '42P01') {
                return res.json([]);
            }
            throw error;
        }

        if (!characters || characters.length === 0) {
            return res.json([]);
        }

        // Fetch user profiles for these characters
        const creatorIds = [...new Set(characters.map(c => c.creator_id).filter(Boolean))];
        let profiles = [];
        
        if (creatorIds.length > 0) {
            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('id, display_name, avatar_url')
                .in('id', creatorIds);
                
            if (!profileError && profileData) {
                profiles = profileData;
            } else if (profileError) {
                console.error('Supabase error fetching user profiles:', profileError);
            }
        }

        // Attach profile to characters
        const enrichedCharacters = characters.map(char => {
            const profile = profiles.find(p => p.id === char.creator_id);
            return {
                ...char,
                user_profiles: profile || null
            };
        });

        res.json(enrichedCharacters);
    } catch (err) {
        console.error('Error fetching discover characters:', err);
        res.status(500).json({ error: 'Failed to fetch characters' });
    }
};

// POST /api/characters/upload
const uploadCharacter = async (req, res) => {
    try {
        const { name, trait, voice_model_id, creator_id } = req.body;
        const iconFile = req.files['icon'] ? req.files['icon'][0] : null;
        const vrmFile = req.files['vrm'] ? req.files['vrm'][0] : null;

        // Use creator_id from client or fallback to dummy user id
        const finalUserId = creator_id || '00000000-0000-0000-0000-000000000000';

        if (!name || !vrmFile || !iconFile) {
            return res.status(400).json({ error: 'Name, icon and VRM file are required' });
        }

        // Upload icon to Supabase Storage
        const iconFilename = `icons/${generateFilename(iconFile.originalname)}`;
        const { error: iconUploadError } = await supabase.storage
            .from('characters_assets')
            .upload(iconFilename, iconFile.buffer, {
                contentType: iconFile.mimetype
            });

        if (iconUploadError) throw iconUploadError;
        
        // Get public URL for icon
        const { data: iconData } = supabase.storage
            .from('characters_assets')
            .getPublicUrl(iconFilename);
        const iconUrl = iconData.publicUrl;

        // Upload VRM to Supabase Storage
        const vrmFilename = `vrms/${generateFilename(vrmFile.originalname)}`;
        const { error: vrmUploadError } = await supabase.storage
            .from('characters_assets')
            .upload(vrmFilename, vrmFile.buffer, {
                contentType: vrmFile.mimetype || 'application/octet-stream'
            });

        if (vrmUploadError) throw vrmUploadError;

        // Get public URL for VRM
        const { data: vrmData } = supabase.storage
            .from('characters_assets')
            .getPublicUrl(vrmFilename);
        const vrmUrl = vrmData.publicUrl;

        // Insert into public_characters table
        const { data: characterData, error: dbError } = await supabase
            .from('public_characters')
            .insert([{
                creator_id: finalUserId,
                name,
                trait,
                voice_model_id,
                icon_url: iconUrl,
                vrm_url: vrmUrl
            }])
            .select();

        if (dbError) throw dbError;

        res.json({ message: 'Character uploaded successfully', character: characterData[0] });
    } catch (err) {
        console.error('Error uploading character:', err);
        res.status(500).json({ error: 'Failed to upload character', details: err.message });
    }
};

// POST /api/characters/save/:id
const saveCharacter = async (req, res) => {
    try {
        const { id } = req.params;
        const { creator_id } = req.body;
        const finalUserId = creator_id || '00000000-0000-0000-0000-000000000000'; // dummy auth fallback

        // Check if character exists
        const { data: charData, error: charError } = await supabase
            .from('public_characters')
            .select('id')
            .eq('id', id)
            .single();
            
        if (charError || !charData) {
            return res.status(404).json({ error: 'Character not found' });
        }

        // Insert into user_saved_characters
        const { error: saveError } = await supabase
            .from('user_saved_characters')
            .insert([{
                user_id: finalUserId,
                character_id: id
            }]);

        if (saveError) {
             // 23505 is unique violation code in Postgres
             if (saveError.code === '23505') {
                 return res.status(400).json({ error: 'Character already saved' });
             }
             throw saveError;
        }

        res.json({ message: 'Character saved successfully' });
    } catch (err) {
        console.error('Error saving character:', err);
        res.status(500).json({ error: 'Failed to save character' });
    }
};

// DELETE /api/characters/save/:id
const unsaveCharacter = async (req, res) => {
    try {
        const { id } = req.params;
        const { creator_id } = req.body;
        const finalUserId = creator_id || '00000000-0000-0000-0000-000000000000';

        const { error: unsaveError } = await supabase
            .from('user_saved_characters')
            .delete()
            .match({ user_id: finalUserId, character_id: id });

        if (unsaveError) {
            throw unsaveError;
        }

        res.json({ message: 'Character unsaved successfully' });
    } catch (err) {
        console.error('Error unsaving character:', err);
        res.status(500).json({ error: 'Failed to unsave character' });
    }
};

// GET /api/characters/my-saved
const getMySavedCharacters = async (req, res) => {
    try {
        const { creator_id } = req.query;
        if (!creator_id) {
            return res.json([]); // No user, return empty
        }

        const { data: savedRows, error: savedError } = await supabase
            .from('user_saved_characters')
            .select('character_id')
            .eq('user_id', creator_id);

        if (savedError) {
            console.error('Supabase error fetching saved characters ids:', savedError);
            if (savedError.code === '42P01') {
                return res.json([]);
            }
            throw savedError;
        }

        const charIds = (savedRows || []).map(row => row.character_id);

        if (charIds.length === 0) {
            return res.json([]);
        }

        const { data: characters, error: charError } = await supabase
            .from('public_characters')
            .select('*')
            .in('id', charIds)
            .order('created_at', { ascending: false });

        if (charError) {
             throw charError;
        }

        res.json(characters || []);
    } catch (err) {
        console.error('Error fetching my saved characters:', err);
        res.status(500).json({ error: 'Failed to fetch saved characters' });
    }
};

// POST /api/characters/preview-voice
const previewVoice = async (req, res) => {
    try {
        const { voice_model_id, text } = req.body;
        if (!voice_model_id) {
            return res.status(400).json({ error: 'Voice model ID is required' });
        }
        
        const aiService = require('../services/ai.service');
        const audioBase64 = await aiService.getVoiceAudio(text || "Xin chào, tôi là trợ lý ảo mới. Rất vui được gặp bạn!", "", { voice_model_id, url: "" });
        
        if (!audioBase64) {
            throw new Error('Could not generate voice audio');
        }
        
        res.json({ audioBase64 });
    } catch (err) {
        console.error('Error previewing voice:', err);
        res.status(500).json({ error: 'Failed to preview voice' });
    }
};

// GET /api/characters/my-uploads
const getMyUploadsCharacters = async (req, res) => {
    try {
        const { creator_id } = req.query;
        if (!creator_id) {
            return res.status(400).json({ error: 'creator_id is required' });
        }

        const { data: characters, error } = await supabase
            .from('public_characters')
            .select('*')
            .eq('creator_id', creator_id)
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') {
                return res.json([]);
            }
            throw error;
        }

        // Fetch user profiles for these characters
        const creatorIds = [...new Set((characters || []).map(c => c.creator_id).filter(Boolean))];
        let profiles = [];
        
        if (creatorIds.length > 0) {
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('id, display_name, avatar_url')
                .in('id', creatorIds);
            
            if (profileData) {
                profiles = profileData;
            }
        }

        // Attach profile to character
        const charactersWithProfiles = (characters || []).map(char => {
            const profile = profiles.find(p => p.id === char.creator_id);
            return {
                ...char,
                user_profiles: profile || null
            };
        });

        res.json(charactersWithProfiles);
    } catch (err) {
        console.error('Error fetching my uploaded characters:', err);
        res.status(500).json({ error: 'Failed to fetch my uploaded characters' });
    }
};

// PUT /api/characters/:id
const updateCharacter = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, trait, voice_model_id, creator_id } = req.body;
        
        if (!creator_id) return res.status(400).json({ error: 'creator_id is required for updating' });

        // Verify ownership
        const { data: charData } = await supabase.from('public_characters').select('creator_id').eq('id', id).single();
        if (!charData || charData.creator_id !== creator_id) {
            return res.status(403).json({ error: 'Forbidden: You do not own this character' });
        }

        let updateData = {
            name,
            trait,
            voice_model_id
        };

        const iconFile = req.files && req.files['icon'] ? req.files['icon'][0] : null;
        const vrmFile = req.files && req.files['vrm'] ? req.files['vrm'][0] : null;

        if (iconFile) {
            const iconFilename = `icons/${generateFilename(iconFile.originalname)}`;
            await supabase.storage.from('characters_assets').upload(iconFilename, iconFile.buffer, { contentType: iconFile.mimetype });
            const { data: iconUrlData } = supabase.storage.from('characters_assets').getPublicUrl(iconFilename);
            updateData.icon_url = iconUrlData.publicUrl;
        }

        if (vrmFile) {
            const vrmFilename = `vrms/${generateFilename(vrmFile.originalname)}`;
            await supabase.storage.from('characters_assets').upload(vrmFilename, vrmFile.buffer, { contentType: vrmFile.mimetype });
            const { data: vrmUrlData } = supabase.storage.from('characters_assets').getPublicUrl(vrmFilename);
            updateData.vrm_url = vrmUrlData.publicUrl;
        }

        const { error: updateError } = await supabase.from('public_characters').update(updateData).eq('id', id);
        if (updateError) throw updateError;

        res.json({ message: 'Character updated successfully' });
    } catch (err) {
        console.error('Error updating character:', err);
        res.status(500).json({ error: 'Failed to update character' });
    }
};

// DELETE /api/characters/:id
const deleteCharacter = async (req, res) => {
    try {
        const { id } = req.params;
        const { creator_id } = req.query; // Assuming passed in query

        if (!creator_id) return res.status(400).json({ error: 'creator_id is required' });

        const { data: charData } = await supabase.from('public_characters').select('creator_id').eq('id', id).single();
        if (!charData || charData.creator_id !== creator_id) {
            return res.status(403).json({ error: 'Forbidden: You do not own this character' });
        }

        const { error: deleteError } = await supabase.from('public_characters').delete().eq('id', id);
        if (deleteError) throw deleteError;

        res.json({ message: 'Character deleted successfully' });
    } catch (err) {
        console.error('Error deleting character:', err);
        res.status(500).json({ error: 'Failed to delete character' });
    }
};

module.exports = {
    getDiscoverCharacters,
    uploadCharacter,
    saveCharacter,
    unsaveCharacter,
    getMySavedCharacters,
    previewVoice,
    getMyUploadsCharacters,
    updateCharacter,
    deleteCharacter
};
