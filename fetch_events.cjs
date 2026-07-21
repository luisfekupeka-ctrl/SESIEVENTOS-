const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=\"(.*?)\"/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=\"(.*?)\"/);
const supabase = createClient(urlMatch[1], keyMatch[1]);
supabase.from('events').select('id, name, image_url, description').then(r => console.log(JSON.stringify(r.data, null, 2)));
