# Database Setup Guide

This guide explains how to set up and manage the MongoDB database for SkillStream Platform API.

## MongoDB with Prisma

**Important**: MongoDB does **not** support Prisma migrations. MongoDB is schema-less, so Prisma uses a different approach for schema management.

## Initial Setup

### 1. Set up MongoDB Connection

Add your MongoDB connection string to `.env`:

```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/skillstream
```

### 2. Push Schema to Database

After making changes to `prisma/schema.prisma`, push the schema to your database:

```bash
npx prisma db push
```

This command will:
- Create new collections if they don't exist
- Add new fields to existing documents
- **Note**: It does NOT delete fields or collections (MongoDB is schema-less)

### 3. Generate Prisma Client

After pushing schema changes, regenerate the Prisma Client:

```bash
npx prisma generate
```

Or it will run automatically via the `postinstall` script.

## Schema Changes Workflow

When you modify `prisma/schema.prisma`:

1. **Push schema changes**:
   ```bash
   npx prisma db push
   ```

2. **Generate Prisma Client** (if not automatic):
   ```bash
   npx prisma generate
   ```

3. **Restart your application** to use the new Prisma Client

## Important Notes

### What `prisma db push` Does

- ✅ Creates new collections
- ✅ Adds new fields to existing documents
- ✅ Updates indexes
- ❌ Does NOT delete fields (MongoDB doesn't require this)
- ❌ Does NOT delete collections (you must do this manually if needed)

### What `prisma db push` Does NOT Do

- Does not create migration history (MongoDB doesn't support migrations)
- Does not rollback changes
- Does not validate data (MongoDB is flexible)

### Manual Field Removal

If you remove a field from the schema, existing documents will still have that field. To remove it:

1. Use MongoDB Compass or MongoDB shell
2. Run update queries to remove the field from existing documents
3. Or write a migration script using Prisma Client

Example script to remove a field:

```typescript
// scripts/remove-field.ts
import { prisma } from '../src/utils/prisma';

async function removeField() {
  await prisma.user.updateMany({
    data: {
      oldField: undefined, // This removes the field
    },
  });
}

removeField();
```

## Database Indexes

Indexes are automatically created when you run `prisma db push`. The schema defines indexes using `@@index`:

```prisma
model User {
  // ... fields ...
  
  @@index([email]) // Creates index on email field
  @@index([role, createdAt]) // Creates compound index
}
```

## Viewing Database

### Prisma Studio

View and edit your database using Prisma Studio:

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can:
- Browse all collections
- View and edit documents
- Search and filter data

### MongoDB Compass

Alternatively, use MongoDB Compass (official MongoDB GUI):
1. Download from [mongodb.com/compass](https://www.mongodb.com/products/compass)
2. Connect using your `DATABASE_URL`
3. Browse collections and documents

## Common Commands

```bash
# Push schema changes to database
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio

# Format Prisma schema
npx prisma format

# Validate Prisma schema
npx prisma validate
```

## Troubleshooting

### Error: "The mongodb provider is not supported with this command"

**Solution**: Use `npx prisma db push` instead of `npx prisma migrate dev`

MongoDB doesn't support migrations, so use `db push` to sync your schema.

### Error: "Connection timeout"

**Solution**: 
- Check your `DATABASE_URL` is correct
- Verify network connectivity
- Check MongoDB Atlas IP whitelist (if using Atlas)

### Error: "Authentication failed"

**Solution**:
- Verify username and password in `DATABASE_URL`
- Check MongoDB user permissions
- Ensure user has read/write access to the database

### Schema changes not reflecting

**Solution**:
1. Run `npx prisma db push` to push changes
2. Run `npx prisma generate` to regenerate client
3. Restart your application

## Production Considerations

1. **Backup**: Always backup your database before schema changes
2. **Staging**: Test schema changes in staging first
3. **Indexes**: Monitor index performance in production
4. **Data Migration**: Plan data migrations for breaking changes
5. **Rollback Plan**: Have a plan to rollback if needed

## Schema Version Control

Since MongoDB doesn't use migrations, track schema changes in:

1. **Git**: Commit `prisma/schema.prisma` changes
2. **Documentation**: Document breaking changes in `CHANGELOG.md`
3. **Code Review**: Review schema changes carefully

## Example: Adding a New Field

1. Edit `prisma/schema.prisma`:
   ```prisma
   model User {
     // ... existing fields ...
     newField String?
   }
   ```

2. Push to database:
   ```bash
   npx prisma db push
   ```

3. Generate client:
   ```bash
   npx prisma generate
   ```

4. Use in code:
   ```typescript
   await prisma.user.update({
     where: { id: userId },
     data: { newField: 'value' }
   });
   ```

---

**Last Updated**: Generated during project setup
**Database**: MongoDB
**ORM**: Prisma

