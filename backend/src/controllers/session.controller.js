const supabase = require('../config/supabase');

async function getSessions(req, res) {
    const { userId } = req.query;
    if (!userId || !supabase) return res.json([]);
    try {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
}

async function createSession(req, res) {
    const { userId, title } = req.body;
    if (!userId || !supabase) return res.json(null);
    try {
        const { data, error } = await supabase
            .from('chat_sessions')
            .insert({ user_id: userId, title: title })
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
}

async function deleteSession(req, res) {
    const { id } = req.params;
    if (!id || !supabase) return res.status(400).json({ error: 'Missing session ID' });
    try {
        const { error } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
}

module.exports = { getSessions, createSession, deleteSession };
