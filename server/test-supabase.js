const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
sb.from('reports').select('count').then(({data, error}) => {
  if (error) console.log('ERROR:', error.message);
  else console.log('SUCCESS - connected, rows:', data);
});