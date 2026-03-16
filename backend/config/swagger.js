const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EstateManager API',
      version: '1.0.0',
      description: 'API Documentation for Real Estate Property Management Platform',
      contact: {
        name: 'Admin',
        email: 'admin@estatemanager.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },

  // Read all route-level JSDoc annotations from ../routes
  apis: [path.join(__dirname, '../routes/*.js')],
}

module.exports = swaggerJsdoc(options);
