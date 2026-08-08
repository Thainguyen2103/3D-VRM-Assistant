const supabase = require('./src/config/supabase');

async function test() {
    try {
        const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
        console.log('Buckets:', buckets ? buckets.map(b => b.name) : bErr);
        
        const { data: cols, error: cErr } = await supabase.from('animations').select('*').limit(1);
        console.log('Animations table works?', cErr ? cErr.message : 'Yes', cols ? 'Has Data' : '');
    } catch (e) {
        console.error(e);
    }
}
test();
