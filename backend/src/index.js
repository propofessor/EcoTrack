const express = require('express');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

const routes = require('./routes.js');

const app = express();

const swaggerOptions = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Hello World',
			version: '1.0.0'
		}
	},
	apis: ['./src/*.js']
};

const swaggerDocument = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

app.use('/', routes);

app.listen(3000, () => {
	console.log('Server is running on http://localhost:3000');
});

module.exports = app;
