import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

// Use environment-aware file extensions
const fileExt = process.env.NODE_ENV === 'production' ? 'js' : 'ts';
const baseDir = process.env.NODE_ENV === 'production' ? './dist' : './src';

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
    `${baseDir}/modules/**/routes/**/*.${fileExt}`,
    `${baseDir}/modules/**/services/*.${fileExt}`,
  ],
};

let specs: any;
try {
  specs = swaggerJsdoc(options);
} catch (error) {
  console.warn('⚠️  Swagger documentation generation failed:', error instanceof Error ? error.message : error);
  // Fallback to empty spec to prevent app crash
  specs = {
    ...options.definition,
    paths: {},
  };
}

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};