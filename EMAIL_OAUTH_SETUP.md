# Email & OAuth Setup Guide

This document describes the email system and OAuth authentication implementation for SkillStream.

## Features Implemented

### 1. Email System
- ✅ All emails sent from "The Team <team@skillstream.com>"
- ✅ Welcome emails for new users
- ✅ Promotional emails
- ✅ System notification emails
- ✅ Password reset emails
- ✅ Event reminder emails

### 2. OAuth Authentication
- ✅ Google OAuth login
- ✅ LinkedIn OAuth login
- ✅ Automatic user creation for OAuth users
- ✅ Account linking (OAuth + email/password)

### 3. Admin Messaging System
- ✅ Send system notifications to users
- ✅ Send promotional emails to users
- ✅ Bulk messaging to all users
- ✅ Real-time notifications via Socket.IO

## Environment Variables Required

Add these to your `.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=team@skillstream.com
SMTP_SECURE=false

# OAuth (Optional - for frontend OAuth flow)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Frontend URL (for OAuth callbacks and email links)
FRONTEND_URL=http://localhost:3000
```

## Database Changes

The User model has been updated to support OAuth:
- `password` is now optional (nullable)
- `provider` - OAuth provider: "google", "linkedin", or null
- `providerId` - OAuth provider's user ID
- `providerEmail` - Email from OAuth provider
- `firstName` - User's first name
- `lastName` - User's last name
- `avatar` - Profile picture URL

**Run this to update your database:**
```bash
npx prisma db push
npx prisma generate
```

## API Endpoints

### OAuth Authentication

#### Google OAuth
```
POST /api/auth/oauth/google
Body: { "accessToken": "google-access-token" }
Response: { "token": "jwt-token", "user": {...} }
```

#### LinkedIn OAuth
```
POST /api/auth/oauth/linkedin
Body: { "accessToken": "linkedin-access-token" }
Response: { "token": "jwt-token", "user": {...} }
```

### Admin Messaging (Requires ADMIN role)

#### Send System Notification
```
POST /api/admin/notifications/send
Headers: { "Authorization": "Bearer <admin-token>" }
Body: {
  "userIds": ["user-id-1", "user-id-2"],  // Optional
  "userEmails": ["user@example.com"],      // Optional
  "title": "Notification Title",
  "message": "Notification message",
  "type": "system",                        // Optional
  "sendEmail": true,                       // Optional, default: false
  "link": "https://..."                    // Optional
}
```

#### Send Notification to All Users
```
POST /api/admin/notifications/send-all
Headers: { "Authorization": "Bearer <admin-token>" }
Body: {
  "title": "Notification Title",
  "message": "Notification message",
  "type": "system",
  "sendEmail": true,
  "link": "https://..."
}
```

#### Send Promotional Email
```
POST /api/admin/promotional-email/send
Headers: { "Authorization": "Bearer <admin-token>" }
Body: {
  "userIds": ["user-id-1"],                // Optional
  "userEmails": ["user@example.com"],      // Optional
  "subject": "Special Offer!",
  "content": "<p>Email content HTML</p>",
  "ctaText": "Learn More",                 // Optional
  "ctaLink": "https://..."                 // Optional
}
```

#### Send Promotional Email to All Users
```
POST /api/admin/promotional-email/send-all
Headers: { "Authorization": "Bearer <admin-token>" }
Body: {
  "subject": "Special Offer!",
  "content": "<p>Email content HTML</p>",
  "ctaText": "Learn More",
  "ctaLink": "https://..."
}
```

## Frontend OAuth Integration

### Google OAuth Flow

1. **Get OAuth URL from Google** (frontend handles this)
   ```javascript
   // Frontend code example
   const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
     'client_id=YOUR_GOOGLE_CLIENT_ID&' +
     'redirect_uri=http://localhost:3000/auth/google/callback&' +
     'response_type=code&' +
     'scope=email profile';
   ```

2. **After user authorizes, exchange code for access token** (frontend)
   ```javascript
   const response = await fetch('https://oauth2.googleapis.com/token', {
     method: 'POST',
     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
     body: new URLSearchParams({
       code: authCode,
       client_id: GOOGLE_CLIENT_ID,
       client_secret: GOOGLE_CLIENT_SECRET,
       redirect_uri: 'http://localhost:3000/auth/google/callback',
       grant_type: 'authorization_code'
     })
   });
   const { access_token } = await response.json();
   ```

3. **Send access token to your backend**
   ```javascript
   const result = await fetch('/api/auth/oauth/google', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ accessToken: access_token })
   });
   const { token, user } = await result.json();
   // Save token and redirect to dashboard
   ```

### LinkedIn OAuth Flow

Similar to Google, but use LinkedIn's OAuth endpoints:
- Authorization: `https://www.linkedin.com/oauth/v2/authorization`
- Token: `https://www.linkedin.com/oauth/v2/accessToken`
- Scope: `r_liteprofile r_emailaddress` or `openid profile email`

Then send the access token to `/api/auth/oauth/linkedin`

## Email Templates

All emails are sent with HTML templates including:
- Branded header with SkillStream colors
- Responsive design
- Professional styling
- Clear call-to-action buttons

Email types:
1. **Welcome Email** - Sent automatically when users register
2. **Password Reset** - When user requests password reset
3. **System Notifications** - When admins send notifications
4. **Promotional Emails** - Marketing emails from admins
5. **Event Reminders** - Calendar event reminders

## Real-time Notifications

System notifications are sent via:
1. **Database** - Stored in Notification collection
2. **Socket.IO** - Real-time push to connected clients
3. **Email** - Optional email notification

Users receive notifications in real-time when they're connected via Socket.IO.

## Notes

- OAuth users don't need passwords
- Users can link OAuth accounts to existing email accounts
- Welcome emails are sent automatically for new registrations
- All emails come from "The Team @ SkillStream"
- Admin endpoints require ADMIN role

