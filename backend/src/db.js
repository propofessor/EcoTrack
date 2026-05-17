// src/db.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Qui creiamo il client ufficiale
const db = createClient(supabaseUrl, supabaseKey, {
	auth: {
		flowType: 'pkce', // Usa PKCE per una maggiore sicurezza
		persistSession: false, // Mantieni la sessione attiva
		detectSessionInUrl: false // Rileva la sessione nell'URL dopo il redirect
	}
});
// Client Admin (Bypassa le RLS - Da usare solo sul Server!)
const supabaseAdmin = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Esportiamo entrambi come un oggetto
module.exports = {
	db,
	supabaseAdmin
};
