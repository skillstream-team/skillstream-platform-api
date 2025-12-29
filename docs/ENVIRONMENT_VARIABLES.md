# Environment Variables Documentation

This document lists all environment variables used by the SkillStream Platform API.

## Required Variables

These variables must be set for the application to start:

### Server Configuration
- `NODE_ENV` - Environment mode (`development`, `production`, `test`)
- `PORT` - Server port (default: `3000`)

### Database
- `DATABASE_URL` - MongoDB connection string
  - Example: `mongodb://localhost:27017/skillstream`
  - Production: `mongodb+srv://user:password@cluster.mongodb.net/skillstream`

### JWT Secrets
- `JWT_SECRET` - Secret key for JWT token signing (min 32 chars in production)
- `RESET_TOKEN_SECRET` - Secret key for password reset tokens (min 32 chars in production)

## Optional Variables

### Redis (Caching & Rate Limiting)
- `REDIS_URL` - Redis connection string
  - Example: `redis://localhost:6379`
  - Production: `redis://user:password@redis.example.com:6379`

### Kafka (Event Streaming)
- `KAFKA_BROKERS` - Comma-separated list of Kafka brokers
  - Example: `localhost:9092`
  - Production: `broker1:9092,broker2:9092`

### URLs
- `FRONTEND_URL` - Frontend application URL (for CORS and email links)
  - Example: `http://localhost:5173`
  - Production: `https://skillstream.com`
- `SERVER_URL` - Backend API URL
  - Example: `http://localhost:3000`
  - Production: `https://api.skillstream.com`

### Email Configuration (SMTP)
Required if you want to send emails:
- `SMTP_HOST` - SMTP server hostname
  - Gmail: `smtp.gmail.com`
  - SendGrid: `smtp.sendgrid.net`
- `SMTP_PORT` - SMTP port (usually `587` for TLS, `465` for SSL)
- `SMTP_USER` - SMTP username/email
- `SMTP_PASS` - SMTP password or app password
- `SMTP_FROM` - Default "from" email address
- `SMTP_SECURE` - Use SSL/TLS (`true` or `false`)

### Push Notifications (VAPID)
Required for push notifications:
- `VAPID_PUBLIC_KEY` - VAPID public key
- `VAPID_PRIVATE_KEY` - VAPID private key
- `VAPID_CONTACT_EMAIL` - Contact email for VAPID

Generate keys:
```bash
npx web-push generate-vapid-keys
```

### Course Import API Keys
Required for importing courses from external platforms:

#### Udemy
- `UDEMY_CLIENT_ID` - Udemy API client ID
- `UDEMY_CLIENT_SECRET` - Udemy API client secret

#### YouTube
- `YOUTUBE_API_KEY` - YouTube Data API v3 key

#### Coursera (Optional)
- `COURSERA_API_KEY` - Coursera API key (uses web scraping if not provided)

#### Pluralsight
- `PLURALSIGHT_API_KEY` - Pluralsight API key

### Cloudflare (Optional)
For R2 storage and Stream video hosting:
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `CLOUDFLARE_ACCESS_KEY_ID` - R2 access key ID
- `CLOUDFLARE_SECRET_ACCESS_KEY` - R2 secret access key
- `CLOUDFLARE_R2_BUCKET_NAME` - R2 bucket name
- `CLOUDFLARE_STREAM_API_TOKEN` - Stream API token

### Sentry (Error Tracking)
- `SENTRY_DSN` - Sentry DSN for error tracking

### OAuth (Optional)
For social login:
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `LINKEDIN_CLIENT_ID` - LinkedIn OAuth client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn OAuth client secret

## Example .env File

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=mongodb://localhost:27017/skillstream

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
RESET_TOKEN_SECRET=your-reset-token-secret-change-this-in-production-min-32-chars

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092

# URLs
FRONTEND_URL=http://localhost:5173
SERVER_URL=http://localhost:3000

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@skillstream.com
SMTP_SECURE=false

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_CONTACT_EMAIL=your-email@skillstream.com

# Course Import APIs
UDEMY_CLIENT_ID=your-udemy-client-id
UDEMY_CLIENT_SECRET=your-udemy-client-secret
YOUTUBE_API_KEY=your-youtube-api-key
COURSERA_API_KEY=your-coursera-api-key
PLURALSIGHT_API_KEY=your-pluralsight-api-key
```

## Security Notes

1. **Never commit `.env` files** to version control
2. **Use strong secrets** in production (min 32 characters for JWT secrets)
3. **Rotate secrets regularly** in production
4. **Use environment-specific values** (different values for dev/staging/prod)
5. **Store secrets securely** in production (use secret management services)

## Validation

The application validates required environment variables on startup. If any are missing, the application will exit with an error message listing the missing variables.

