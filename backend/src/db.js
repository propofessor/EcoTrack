require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const db = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SECRET_KEY
);

const getProviderTypeId = async (provider_type_name) => {
	const { data, error } = await db
		.from('provider_types')
		.select('id')
		.eq('label', provider_type_name)
		.single();

	if (error || !data) return null;
	return data.id;
};

const createUser = async (name) => {
	const { data, error } = await db
		.from('users')
		.insert({ name, plate: null, achievements: {}, preferences: {} })
		.select()
		.single();

	if (error || !data) return null;
	return data;
};

const createAuthProvider = async (
	user_id,
	provider_user_id,
	password,
	provider_type_name
) => {
	const provider_type_id = await getProviderTypeId(provider_type_name);
	if (!provider_type_id) return null;

	const hash = await bcrypt.hash(password, 12);

	const { data, error } = await db
		.from('auth_providers')
		.insert({
			user_id,
			provider_user_id,
			provider_data: { hash },
			provider_type_id
		})
		.select()
		.single();

	if (error || !data) return null;
	return data;
};

const getUserId = async (provider_user_id, password, provider_type_name) => {
	const provider_type_id = await getProviderTypeId(provider_type_name);
	if (!provider_type_id) return null;

	const { data, error } = await db
		.from('auth_providers')
		.select('user_id, provider_data')
		.eq('provider_user_id', provider_user_id)
		.eq('provider_type_id', provider_type_id)
		.single();

	if (error || !data) return null;

	const match = await bcrypt.compare(password, data.provider_data.hash);
	if (!match) return null;

	return data.user_id;
};

const getUser = async (user_id) => {
	const { data, error } = await db
		.from('users')
		.select('*')
		.eq('id', user_id)
		.single();

	if (error || !data) return null;
	return data;
};

console.log('Supabase client initialized');

module.exports = {
	client: db,
	getUserId,
	getProviderTypeId,
	getUser,
	createUser,
	createAuthProvider
};
