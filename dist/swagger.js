"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
// Use environment-aware file extensions
const fileExt = process.env.NODE_ENV === 'production' ? 'js' : 'ts';
const baseDir = process.env.NODE_ENV === 'production' ? './dist' : './src';
const options = {
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
let specs;
try {
    specs = (0, swagger_jsdoc_1.default)(options);
}
catch (error) {
    console.warn('⚠️  Swagger documentation generation failed:', error instanceof Error ? error.message : error);
    // Fallback to empty spec to prevent app crash
    specs = {
        ...options.definition,
        paths: {},
    };
}
const setupSwagger = (app) => {
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs));
};
exports.setupSwagger = setupSwagger;
