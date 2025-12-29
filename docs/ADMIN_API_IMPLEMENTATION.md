# Admin API Implementation Summary

This document summarizes all the admin API endpoints that have been implemented.

## ✅ Implemented Endpoints

### 1. Payout Management

#### GET `/api/admin/payouts`
- **Description**: Get all payout requests with filtering and pagination
- **Query Params**: `page`, `limit`, `status`, `teacherId`
- **Response**: `{ success: true, payouts: Payout[], pagination: Pagination }`
- **Authentication**: Admin only

#### POST `/api/admin/payouts/:payoutId/approve`
- **Description**: Approve a payout request
- **Body**: `{ transactionId?: string }`
- **Response**: Updated payout object
- **Authentication**: Admin only

#### POST `/api/admin/payouts/:payoutId/reject`
- **Description**: Reject a payout request
- **Body**: `{ reason?: string }`
- **Response**: Updated payout object
- **Authentication**: Admin only

### 2. Bulk Operations

#### POST `/api/admin/users/bulk`
- **Description**: Bulk update users
- **Body**: `{ userIds: string[], role?: string, isActive?: boolean, isVerified?: boolean }`
- **Response**: `{ success: true, data: { updated: number, failed: number, errors: string[] } }`
- **Authentication**: Admin only

#### POST `/api/admin/courses/bulk`
- **Description**: Bulk update courses (approve/reject/publish)
- **Body**: `{ courseIds: string[], status: 'APPROVED' | 'REJECTED' | 'PENDING', rejectionReason?: string }`
- **Response**: `{ success: true, data: { updated: number, failed: number, errors: string[] } }`
- **Authentication**: Admin only

### 3. Broadcast/Notification Management

#### POST `/api/admin/broadcasts`
- **Description**: Send broadcast notification to users
- **Body**: 
  ```json
  {
    "title": "string",
    "message": "string",
    "targetAudience": "all" | "students" | "teachers" | "admins",
    "userIds": ["string"],
    "sendEmail": boolean,
    "sendPush": boolean
  }
  ```
- **Response**: `{ success: true, sentTo: number, broadcast: Broadcast }`
- **Authentication**: Admin only

#### GET `/api/admin/broadcasts`
- **Description**: Get broadcast history
- **Query Params**: `page`, `limit`, `startDate`, `endDate`
- **Response**: `{ success: true, broadcasts: Broadcast[], pagination: Pagination }`
- **Authentication**: Admin only

### 4. Activity Logs & Audit Trail

#### GET `/api/admin/logs`
- **Description**: Get activity logs with filtering
- **Query Params**: `page`, `limit`, `userId`, `action`, `startDate`, `endDate`
- **Response**: 
  ```json
  {
    "success": true,
    "logs": [
      {
        "id": "string",
        "userId": "string",
        "user": { "id": "string", "username": "string", "email": "string" },
        "action": "string",
        "entityType": "string",
        "entityId": "string",
        "details": {},
        "ipAddress": "string",
        "userAgent": "string",
        "createdAt": "datetime"
      }
    ],
    "pagination": {}
  }
  ```
- **Authentication**: Admin only

### 5. User Import/Export

#### POST `/api/admin/users/import`
- **Description**: Import users from CSV file
- **Content-Type**: `multipart/form-data`
- **Body**: `file: File` (CSV file)
- **CSV Format**: 
  ```csv
  email,username,password,role,firstName,lastName
  user@example.com,johndoe,password123,STUDENT,John,Doe
  ```
- **Response**: `{ success: true, data: { imported: number, failed: number, errors: string[] } }`
- **Authentication**: Admin only

#### GET `/api/admin/users/export`
- **Description**: Export users to CSV
- **Query Params**: `role`, `isActive`
- **Response**: CSV file (Content-Type: `text/csv`)
- **Authentication**: Admin only

### 6. Certificate Templates Management

#### GET `/api/admin/certificate-templates`
- **Description**: Get all certificate templates
- **Response**: `{ success: true, data: { templates: CertificateTemplate[] } }`
- **Authentication**: Admin only

#### POST `/api/admin/certificate-templates`
- **Description**: Create certificate template
- **Body**: 
  ```json
  {
    "name": "string",
    "design": {},
    "fields": ["string"],
    "isDefault": boolean
  }
  ```
- **Response**: CertificateTemplate object
- **Authentication**: Admin only

#### PUT `/api/admin/certificate-templates/:id`
- **Description**: Update certificate template
- **Body**: Same as POST (all fields optional)
- **Response**: Updated CertificateTemplate
- **Authentication**: Admin only

#### DELETE `/api/admin/certificate-templates/:id`
- **Description**: Delete certificate template
- **Response**: `{ success: true }`
- **Authentication**: Admin only
- **Note**: Cannot delete default template

### 7. Banner/Promotional Content Management

#### GET `/api/admin/banners`
- **Description**: Get all banners/promotions
- **Query Params**: `isActive`, `page`, `limit`
- **Response**: `{ success: true, banners: Banner[], pagination: Pagination }`
- **Authentication**: Admin only

#### POST `/api/admin/banners`
- **Description**: Create banner/promotion
- **Body**: 
  ```json
  {
    "title": "string",
    "description": "string",
    "imageUrl": "string",
    "linkUrl": "string",
    "startDate": "datetime",
    "endDate": "datetime",
    "isActive": boolean,
    "position": "string",
    "priority": number,
    "targetAudience": "string"
  }
  ```
- **Response**: Banner object
- **Authentication**: Admin only

#### PUT `/api/admin/banners/:id`
- **Description**: Update banner
- **Body**: Same as POST (all fields optional)
- **Response**: Updated Banner
- **Authentication**: Admin only

#### DELETE `/api/admin/banners/:id`
- **Description**: Delete banner
- **Response**: `{ success: true }`
- **Authentication**: Admin only

## Database Models Added

### CertificateTemplate
```prisma
model CertificateTemplate {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  name      String
  design    Json
  fields    String[]
  isDefault Boolean  @default(false)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Banner
```prisma
model Banner {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  title         String
  description   String?
  imageUrl      String?
  linkUrl       String?
  position      String   @default("top")
  startDate     DateTime?
  endDate       DateTime?
  isActive      Boolean  @default(true)
  priority      Int      @default(0)
  targetAudience String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Broadcast
```prisma
model Broadcast {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  createdBy     String   @db.ObjectId
  creator       User     @relation(fields: [createdBy], references: [id])
  title         String
  message       String
  targetAudience String  @default("all")
  userIds       String[]
  sentTo         Int      @default(0)
  sendEmail     Boolean  @default(false)
  sendPush      Boolean  @default(false)
  metadata      Json?
  createdAt     DateTime @default(now())
}
```

## Enhanced Models

### ActivityLog
- Added optional `userId` (for admin/system actions)
- Added `ipAddress` and `userAgent` in metadata

## Dependencies Added

- `csv-parse` - For parsing CSV files
- `csv-stringify` - For generating CSV files
- `multer` - For handling file uploads
- `@types/csv-parse`, `@types/csv-stringify`, `@types/multer` - TypeScript types

## Features

### Activity Logging
All admin actions are automatically logged with:
- User ID (admin who performed action)
- Action type
- Entity and entity ID
- IP address
- User agent
- Timestamp

### Error Handling
- Comprehensive error messages
- Detailed validation
- Transaction support for critical operations
- Graceful failure handling

### Security
- All endpoints require admin authentication
- Role-based access control
- Input validation
- SQL injection protection (via Prisma)

## Usage Examples

### Approve Payout
```bash
POST /api/admin/payouts/{payoutId}/approve
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "transactionId": "txn_123456"
}
```

### Send Broadcast
```bash
POST /api/admin/broadcasts
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "System Maintenance",
  "message": "We'll be performing maintenance tonight",
  "targetAudience": "all",
  "sendPush": true
}
```

### Import Users
```bash
POST /api/admin/users/import
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data

file: users.csv
```

### Export Users
```bash
GET /api/admin/users/export?role=STUDENT
Authorization: Bearer {admin_token}
```

## Notes

1. **Payout Status Flow**: PENDING → PROCESSING → COMPLETED/FAILED
2. **Bulk Operations**: Processed sequentially with error tracking
3. **CSV Import**: Validates required fields and checks for duplicates
4. **Broadcasts**: Supports both push notifications and email
5. **Activity Logs**: Automatically captures IP and user agent for audit trail
6. **Certificate Templates**: Only one template can be default at a time
7. **Banners**: Sorted by priority (higher priority shows first)

## Testing

All endpoints can be tested via:
- Swagger UI: `/api-docs`
- Postman/Insomnia
- cURL commands

Make sure to:
1. Login as admin to get JWT token
2. Include token in Authorization header: `Bearer {token}`
3. Check response status codes and error messages

