"use strict";
/**
 * Environment variable validation
 * Validates all required environment variables on startup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.validateEnv = validateEnv;
const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'RESET_TOKEN_SECRET',
    'SUPABASE_URL',
    'SUPABASE_KEY',
];
const optionalEnvVars = [
    'REDIS_URL',
    'KAFKA_BROKERS',
    'FRONTEND_URL',
    'SERVER_URL',
];
function validateEnv() {
    const missing = [];
    // Check required variables
    for (const varName of requiredEnvVars) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}\n` +
            'Please check your .env file or environment configuration.');
    }
    // Validate JWT_SECRET strength in production
    if (process.env.NODE_ENV === 'production') {
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret.length < 32) {
            throw new Error('JWT_SECRET must be at least 32 characters long in production');
        }
        const resetSecret = process.env.RESET_TOKEN_SECRET;
        if (resetSecret.length < 32) {
            throw new Error('RESET_TOKEN_SECRET must be at least 32 characters long in production');
        }
    }
    // Validate Supabase URL format
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
        console.warn('⚠️  SUPABASE_URL format may be incorrect');
    }
    return {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || '3000',
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        RESET_TOKEN_SECRET: process.env.RESET_TOKEN_SECRET,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_KEY: process.env.SUPABASE_KEY,
        REDIS_URL: process.env.REDIS_URL,
        KAFKA_BROKERS: process.env.KAFKA_BROKERS,
        FRONTEND_URL: process.env.FRONTEND_URL,
        SERVER_URL: process.env.SERVER_URL,
    };
}
exports.env = validateEnv();
