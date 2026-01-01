# Fix Firebase UID Index Issue

## Problem
MongoDB unique indexes don't allow multiple `null` values. Since `firebaseUid` is optional and many existing users have `null` values, creating a unique index fails with:
```
E11000 duplicate key error collection: skillstream.User index: User_firebaseUid_key dup key: { firebaseUid: null }
```

## Solution
Use a **sparse unique index** which only indexes documents where the field exists and is not null. This allows:
- Multiple `null` values (not indexed)
- Unique non-null values (indexed and enforced)

## Steps to Fix

### 1. Update Prisma Schema
The schema has been updated to remove `@unique` from `firebaseUid` since Prisma doesn't support sparse indexes directly.

### 2. Create Sparse Index Manually

**Option A: Using the provided script (Recommended)**
```bash
cd /Users/stephenterera/Documents/skillstream-platform-api
npx ts-node prisma/create-sparse-index.ts
```

**Option B: Using MongoDB Shell (mongosh)**
```bash
mongosh "your-connection-string"

use skillstream

# Drop existing index if it exists
db.User.dropIndex("User_firebaseUid_key")

# Create sparse unique index
db.User.createIndex(
  { firebaseUid: 1 },
  { unique: true, sparse: true, name: "User_firebaseUid_key" }
)
```

**Option C: Using MongoDB Compass**
1. Open MongoDB Compass
2. Connect to your database
3. Navigate to the `User` collection
4. Go to Indexes tab
5. Click "Create Index"
6. Set:
   - Field: `firebaseUid`
   - Type: `1` (Ascending)
   - Options:
     - ✅ Unique
     - ✅ Sparse
   - Name: `User_firebaseUid_key`

### 3. Verify the Index
```bash
# In mongosh
db.User.getIndexes()
```

You should see:
```json
{
  "v": 2,
  "unique": true,
  "key": { "firebaseUid": 1 },
  "name": "User_firebaseUid_key",
  "sparse": true
}
```

### 4. Push Prisma Schema
After creating the sparse index manually, you can push the schema:
```bash
npx prisma db push
```

This should now succeed because the index already exists.

## How Sparse Indexes Work

- **Regular unique index**: All documents are indexed, including those with `null` values. Only one `null` is allowed.
- **Sparse unique index**: Only documents with non-null values are indexed. Multiple `null` values are allowed.

This is perfect for optional fields like `firebaseUid` where:
- Most users don't have a Firebase UID yet (`null`)
- Users who do have a Firebase UID must have unique values

## Verification

After creating the index, test it:

```javascript
// This should work (multiple nulls allowed)
await prisma.user.create({ data: { email: 'user1@test.com', username: 'user1', role: 'STUDENT', firebaseUid: null } });
await prisma.user.create({ data: { email: 'user2@test.com', username: 'user2', role: 'STUDENT', firebaseUid: null } });

// This should work (unique non-null values)
await prisma.user.create({ data: { email: 'user3@test.com', username: 'user3', role: 'STUDENT', firebaseUid: 'firebase-uid-1' } });
await prisma.user.create({ data: { email: 'user4@test.com', username: 'user4', role: 'STUDENT', firebaseUid: 'firebase-uid-2' } });

// This should fail (duplicate non-null value)
await prisma.user.create({ data: { email: 'user5@test.com', username: 'user5', role: 'STUDENT', firebaseUid: 'firebase-uid-1' } });
// Error: Unique constraint violation
```

