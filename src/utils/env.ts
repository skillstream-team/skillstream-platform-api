/**
 * Environment variable validation
 * Validates all required environment variables on startup
 */

interface EnvConfig {
  // Server
  NODE_ENV: string;
  PORT: string;
  
  // Database
  DATABASE_URL: string;
  
  // JWT
  JWT_SECRET: string;
  RESET_TOKEN_SECRET: string;
  
  // Optional
  REDIS_URL?: string;
  KAFKA_BROKERS?: string;
  FRONTEND_URL?: string;
  SERVER_URL?: string;
  
  // Email
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  SMTP_SECURE?: string;
  
  // Push Notifications (VAPID)
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_CONTACT_EMAIL?: string;
  
  // Course Import APIs
  UDEMY_CLIENT_ID?: string;
  UDEMY_CLIENT_SECRET?: string;
  YOUTUBE_API_KEY?: string;
  COURSERA_API_KEY?: string;
  PLURALSIGHT_API_KEY?: string;
}

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'RESET_TOKEN_SECRET',
] as const;

const optionalEnvVars = [
  'REDIS_URL',
  'KAFKA_BROKERS',
  'FRONTEND_URL',
  'SERVER_URL',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_CONTACT_EMAIL',
  'UDEMY_CLIENT_ID',
  'UDEMY_CLIENT_SECRET',
  'YOUTUBE_API_KEY',
  'COURSERA_API_KEY',
  'PLURALSIGHT_API_KEY',
] as const;

export function validateEnv(): EnvConfig {
  const missing: string[] = [];
  
  // Check required variables
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or environment configuration.'
    );
  }
  
  // Validate JWT_SECRET strength in production
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET!;
    if (jwtSecret.length < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters long in production'
      );
    }
    
    const resetSecret = process.env.RESET_TOKEN_SECRET!;
    if (resetSecret.length < 32) {
      throw new Error(
        'RESET_TOKEN_SECRET must be at least 32 characters long in production'
      );
    }
  }
  
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3000',
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    RESET_TOKEN_SECRET: process.env.RESET_TOKEN_SECRET!,
    REDIS_URL: process.env.REDIS_URL,
    KAFKA_BROKERS: process.env.KAFKA_BROKERS,
    FRONTEND_URL: process.env.FRONTEND_URL,
    SERVER_URL: process.env.SERVER_URL,
  };
}

export const env = validateEnv();

