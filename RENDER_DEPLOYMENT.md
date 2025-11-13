# Render.com Deployment Guide

This guide will help you deploy the SkillStream Platform API on Render.com.

## Prerequisites

1. A Render.com account
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Create Database Service

1. In your Render dashboard, click "New +" → "PostgreSQL"
2. Configure:
   - **Name**: `skillstream-db` (or your preferred name)
   - **Database**: `skillstream`
   - **User**: Auto-generated
   - **Region**: Choose closest to your users
   - **Plan**: Select based on your needs
3. After creation, note the **Internal Database URL** and **External Database URL**

## Step 2: Create Redis Service (Optional but Recommended)

1. In your Render dashboard, click "New +" → "Redis"
2. Configure:
   - **Name**: `skillstream-redis`
   - **Region**: Same as your database
   - **Plan**: Select based on your needs
3. After creation, note the **Internal Redis URL** and **External Redis URL**

## Step 3: Create Kafka Service (Optional)

If you need Kafka for notifications:
- Render doesn't provide managed Kafka, so you'll need to use an external service like:
  - Confluent Cloud
  - AWS MSK
  - Upstash Kafka
  - Or self-hosted Kafka

Set the `KAFKA_BROKERS` environment variable with your Kafka broker addresses.

## Step 4: Deploy Web Service

1. In your Render dashboard, click "New +" → "Web Service"
2. Connect your Git repository
3. Configure the service:
   - **Name**: `skillstream-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Select based on your needs

## Step 5: Configure Environment Variables

In your Web Service settings, add the following environment variables:

### Required Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
SERVER_URL=https://your-app-name.onrender.com
FRONTEND_URL=https://your-frontend-url.com

# Database (from Step 1)
DATABASE_URL=<Internal Database URL from PostgreSQL service>

# JWT Configuration
JWT_SECRET=<generate-a-strong-random-secret>
RESET_TOKEN_SECRET=<generate-another-strong-random-secret>

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

### Optional Variables

```bash
# Redis (from Step 2) - Use Internal Redis URL
REDIS_URL=<Internal Redis URL from Redis service>

# Kafka (if using)
KAFKA_BROKERS=broker1:9092,broker2:9092
KAFKA_CLIENT_ID=skillstream-backend
KAFKA_GROUP_ID=skillstream-group

# Cloudflare R2 (if using)
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-bucket-name

# Cloudflare Stream (if using)
CLOUDFLARE_STREAM_API_TOKEN=your-stream-api-token
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
```

## Step 6: Run Database Migrations

After your service is deployed, you need to run Prisma migrations:

1. Go to your Web Service → "Shell" tab
2. Run: `npx prisma migrate deploy`
3. Or add this to your build command: `npm install && npm run build && npx prisma migrate deploy`

Alternatively, you can add a one-time script in package.json:

```json
"scripts": {
  "migrate": "npx prisma migrate deploy"
}
```

## Step 7: Verify Deployment

1. Check the health endpoint: `https://your-app-name.onrender.com/health`
2. Check Swagger docs: `https://your-app-name.onrender.com/api-docs`
3. Check logs in Render dashboard for any connection errors

## Important Notes

1. **Internal vs External URLs**: Use **Internal Database URL** and **Internal Redis URL** for services within the same Render account. This provides better performance and security.

2. **Service Dependencies**: The application is designed to work gracefully without optional services:
   - If Redis is not available, rate limiting will use in-memory store
   - If Kafka is not available, notification service will be disabled

3. **Auto-Deploy**: Render will automatically deploy when you push to your main branch (if configured).

4. **Environment Variables**: Never commit `.env` files. Use Render's environment variable management.

5. **Database Migrations**: Run migrations after the first deployment or when schema changes.

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Ensure you're using the Internal Database URL (not external)
- Check that your database service is running

### Redis Connection Issues
- Verify `REDIS_URL` is set correctly
- If Redis is optional, the app will continue without it (using in-memory rate limiting)

### Kafka Connection Issues
- Verify `KAFKA_BROKERS` is set correctly
- If Kafka is optional, the app will continue without it (notification service disabled)

### Build Failures
- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility
- Check build logs for specific errors

## Using render.yaml (Alternative)

If you prefer Infrastructure as Code, you can use the `render.yaml` file included in this repository. However, you'll still need to:
1. Create the database and Redis services manually first
2. Update the `sync: false` variables in render.yaml with actual values
3. Deploy using the Render Blueprint

## Support

For issues specific to Render.com, check their [documentation](https://render.com/docs).

