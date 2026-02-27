const jwt = require('jsonwebtoken');

const createSession = (user_id) => {
	if (!process.env.JWT_SECRET) {
		console.error('JWT_SECRET not set.');
		return null;
	}

	const token = jwt.sign({ user_id }, process.env.JWT_SECRET, {
		expiresIn: '7d'
	});

	return token;
};

const checkToken = (token, handler) => {
	if (!process.env.JWT_SECRET) {
		console.error('JWT_SECRET not set.');
		return null;
	}

	jwt.verify(token, process.env.JWT_SECRET, handler);
};

module.exports = { createSession, checkToken };
