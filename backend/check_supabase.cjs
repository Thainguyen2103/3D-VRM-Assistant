require('dotenv').config({ path: 'd:/3D-VRM-Assistant-main/backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
    try {
        const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
        console.log('Buckets:', buckets ? buckets.map(b => b.name) : bErr);
        
        const { data: cols, error: cErr } = await supabase.from('animations').select('*').limit(1);
        console.log('Animations table works?', cErr ? cErr.message : 'Yes');
    } catch (e) {
        console.error(e);
    }
}
check();
