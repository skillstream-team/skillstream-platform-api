# Missing Features & Improvements Needed

This document lists features that are missing or need improvement in the backend.

## 🔴 Critical Missing Features

### 1. Scheduled Tasks / Background Jobs System
**Status**: ⚠️ **MISSING - Critical**

**Issue**: There's no system to run scheduled tasks automatically.

**What's Needed**:
- Cron job system or task scheduler
- Background job queue (e.g., Bull, Agenda, or node-cron)
- Worker processes for long-running tasks

**Tasks That Need Scheduling**:
1. **Subscription Expiration Check** - `checkExpiredSubscriptions()` exists but isn't called automatically
2. **Teacher Earnings Calculation** - Should run monthly to calculate earnings
3. **Event Reminders** - `EventReminder` model exists but reminders aren't sent automatically
4. **Webhook Retries** - `WebhookDelivery` has retry logic but no automatic retry system
5. **Course Import Processing** - Currently uses in-memory promises, should use a queue
6. **Email Queue** - Batch email sending for broadcasts
7. **Cache Invalidation** - Periodic cache cleanup
8. **Database Cleanup** - Remove old logs, expired sessions, etc.

**Recommended Solution**:
```typescript
// Use node-cron for simple tasks
import cron from 'node-cron';

// Or use Bull/BullMQ for complex job queues
import Queue from 'bull';
```

### 2. Subscription Expiration Automation
**Status**: ⚠️ **PARTIALLY IMPLEMENTED**

**Current State**: 
- `checkExpiredSubscriptions()` method exists in `SubscriptionService`
- Not called automatically
- No notification to users before expiration

**What's Needed**:
- Scheduled job to check expired subscriptions daily
- Email notifications 7 days, 3 days, and 1 day before expiration
- Automatic status update when expired
- Grace period handling

### 3. Teacher Earnings Calculation Automation
**Status**: ⚠️ **PARTIALLY IMPLEMENTED**

**Current State**:
- `TeacherEarningsService` exists with calculation methods
- No automatic monthly calculation
- Manual trigger only

**What's Needed**:
- Scheduled monthly calculation (1st of each month)
- Automatic transition from PENDING → AVAILABLE
- Email notification to teachers when earnings are available

### 4. Event Reminder System
**Status**: ⚠️ **MODEL EXISTS, NO AUTOMATION**

**Current State**:
- `EventReminder` model exists with `reminderAt` and `isSent` fields
- Reminders are created but never sent
- No scheduler to check and send reminders

**What's Needed**:
- Scheduled job to check pending reminders every minute
- Send email/push notifications at `reminderAt` time
- Update `isSent` flag after sending

### 5. Webhook Retry System
**Status**: ⚠️ **MODEL EXISTS, NO AUTOMATION**

**Current State**:
- `WebhookDelivery` model has retry fields (`nextRetry`, `attempts`)
- No automatic retry mechanism
- Failed webhooks stay failed

**What's Needed**:
- Scheduled job to retry failed webhooks
- Exponential backoff for retries
- Max retry limit (e.g., 5 attempts)
- Dead letter queue for permanently failed webhooks

## ⚠️ Important Missing Features

### 6. Course Import Job Queue
**Status**: ⚠️ **USES IN-MEMORY PROMISES**

**Current State**:
- Uses `Map<string, Promise<void>>` for job tracking
- Jobs lost on server restart
- No persistence

**What's Needed**:
- Proper job queue (Bull/BullMQ)
- Job persistence in Redis/database
- Job retry on failure
- Job priority system

### 7. Email Queue System
**Status**: ⚠️ **DIRECT SENDING, NO QUEUE**

**Current State**:
- Emails sent directly (synchronous)
- Broadcast emails sent one-by-one
- No rate limiting for email providers

**What's Needed**:
- Email queue for batch sending
- Rate limiting (e.g., 100 emails/minute)
- Retry on failure
- Email templates management

### 8. Advanced Search
**Status**: ⚠️ **BASIC SEARCH ONLY**

**Current State**:
- Basic text search in courses (title/description)
- Message search exists
- No full-text search index

**What's Needed**:
- Full-text search (MongoDB Atlas Search or Elasticsearch)
- Search across multiple fields
- Search ranking/relevance
- Autocomplete/suggestions
- Search analytics

### 9. API Rate Limiting Enhancement
**Status**: ✅ **BASIC RATE LIMITING EXISTS**

**Current State**:
- Basic rate limiting per IP
- Role-based limits not implemented
- No per-user rate limiting

**What's Needed**:
- Different limits for different user roles
- Per-user rate limiting (not just IP)
- Rate limit headers in responses
- Rate limit analytics

### 10. Caching Strategy
**Status**: ⚠️ **BASIC CACHING EXISTS**

**Current State**:
- Redis caching for some endpoints
- Cache invalidation on updates
- No cache warming
- No cache analytics

**What's Needed**:
- Cache warming for popular data
- Cache hit/miss analytics
- TTL optimization
- Cache versioning

### 11. Monitoring & Observability
**Status**: ⚠️ **BASIC LOGGING ONLY**

**Current State**:
- Console logging
- Sentry for error tracking
- No metrics collection
- No performance monitoring

**What's Needed**:
- Application metrics (Prometheus)
- Performance monitoring (APM)
- Request tracing
- Database query monitoring
- Uptime monitoring

### 12. Backup & Recovery
**Status**: ❌ **NOT IMPLEMENTED**

**What's Needed**:
- Automated database backups
- Backup retention policy
- Point-in-time recovery
- Backup verification
- Disaster recovery plan

### 13. API Versioning
**Status**: ❌ **NOT IMPLEMENTED**

**Current State**:
- All endpoints at `/api/*`
- No versioning strategy

**What's Needed**:
- API versioning (`/api/v1/*`, `/api/v2/*`)
- Version deprecation strategy
- Migration guide for version changes

### 14. Request/Response Logging
**Status**: ⚠️ **BASIC LOGGING**

**Current State**:
- Request logger middleware exists
- No structured logging
- No log aggregation

**What's Needed**:
- Structured logging (JSON format)
- Log levels (debug, info, warn, error)
- Log aggregation (ELK, Loki, etc.)
- Log retention policy

### 15. Health Check Enhancements
**Status**: ✅ **BASIC HEALTH CHECK EXISTS**

**Current State**:
- `/health` endpoint exists
- Checks database, Redis, Kafka
- No detailed service health

**What's Needed**:
- Individual service health checks
- Health check for external APIs
- Readiness vs liveness probes
- Health check metrics

## 📝 Nice-to-Have Improvements

### 16. GraphQL Subscriptions
**Status**: ❌ **NOT IMPLEMENTED**

**Current State**:
- GraphQL queries and mutations exist
- No subscriptions for real-time updates

**What's Needed**:
- GraphQL subscriptions for real-time data
- WebSocket support for GraphQL
- Subscription filtering

### 17. API Documentation Enhancements
**Status**: ✅ **SWAGGER EXISTS**

**Current State**:
- Swagger/OpenAPI documentation
- Some endpoints may be missing

**What's Needed**:
- Complete endpoint coverage
- Request/response examples
- Error response documentation
- Authentication examples

### 18. Data Validation Enhancement
**Status**: ✅ **ZOD VALIDATION EXISTS**

**Current State**:
- Zod schemas for validation
- Basic validation middleware

**What's Needed**:
- Custom validation rules
- Sanitization (XSS prevention)
- File upload validation (size, type)
- Rate limit validation

### 19. Multi-tenancy Support
**Status**: ❌ **NOT IMPLEMENTED**

**What's Needed** (if required):
- Organization/tenant isolation
- Tenant-specific configurations
- Cross-tenant data isolation

### 20. Internationalization (i18n)
**Status**: ❌ **NOT IMPLEMENTED**

**What's Needed** (if required):
- Multi-language support
- Locale-based content
- Timezone handling
- Currency formatting

## 🔧 Implementation Priority

### High Priority (Before Production)
1. ✅ Scheduled Tasks System
2. ✅ Subscription Expiration Automation
3. ✅ Event Reminder System
4. ✅ Webhook Retry System
5. ✅ Course Import Job Queue

### Medium Priority (Important for Scale)
6. Email Queue System
7. Advanced Search
8. Monitoring & Observability
9. Backup & Recovery
10. API Rate Limiting Enhancement

### Low Priority (Nice to Have)
11. API Versioning
12. GraphQL Subscriptions
13. Caching Strategy Enhancement
14. Multi-tenancy (if needed)
15. Internationalization (if needed)

## 📋 Quick Wins

These can be implemented quickly:

1. **Add node-cron for scheduled tasks** (1-2 hours)
2. **Set up subscription expiration check** (1 hour)
3. **Implement event reminder sender** (2-3 hours)
4. **Add webhook retry job** (2-3 hours)
5. **Enhance health check endpoint** (1 hour)

## 🚀 Recommended Tech Stack Additions

- **Job Queue**: Bull/BullMQ (Redis-based)
- **Scheduler**: node-cron (simple) or node-schedule
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston or Pino (structured logging)
- **Search**: MongoDB Atlas Search or Elasticsearch
- **Backup**: MongoDB Atlas automated backups or custom script

---

**Last Updated**: Generated during project review
**Status**: Ready for implementation

