// src/db.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Qui creiamo il client ufficiale
const db = createClient(supabaseUrl, supabaseKey);

// Assicurati che questa riga finale sia presente per ESPORTARE il client!
module.exports = db;
