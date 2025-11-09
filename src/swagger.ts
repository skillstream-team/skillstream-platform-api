import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SkillStream API',
      version: '1.0.0',
      description: 'API documentation for SkillStream e-learning platform',
    },
    servers: [
      {
        url: process.env.SERVER_URL || 'http://localhost:3000',
        description: 'Server URL',
      },
    ],
  },
  apis: [
    './src/modules/**/routes/**/*.ts',
    './src/modules/**/services/*.ts',
  ],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};