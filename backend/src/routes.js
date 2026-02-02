const routes = require('express')();

/**
 * @openapi
 * /:
 *  get:
 *    description: Welcome to swagger-jsdoc!
 *    responses:
 *      200:
 *        description: Returns a mysterious string.
 */
routes.get('/', (req, res) => {
	res.send('Hello World!');
});

module.exports = routes;
