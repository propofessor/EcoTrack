require('dotenv').config();
const express = require('express');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const routes = require('./routes.js');

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

const swaggerOptions = {
	failOnErrors: true,
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

app.use(express.static(path.join(__dirname, '../../frontend')));

app.listen(3000, () => {
	console.log('Server is running on http://localhost:3000');
});
module.exports = app;
