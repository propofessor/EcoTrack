require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;


const db = createClient(supabaseUrl, supabaseKey, {
	auth: {
		flowType: 'pkce',
		persistSession: false,
		detectSessionInUrl: false
	}
});

const supabaseAdmin = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY
);


module.exports = {
	db,
	supabaseAdmin
};
