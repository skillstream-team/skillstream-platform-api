// Script to create a sparse unique index on firebaseUid
// This allows multiple null values while ensuring uniqueness for non-null values
// Run with: npx ts-node prisma/create-sparse-index.ts
// Or: node -r ts-node/register prisma/create-sparse-index.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSparseIndex() {
  try {
    console.log('Creating sparse unique index on firebaseUid...');

    // Drop existing index if it exists (using raw MongoDB command)
    try {
      await prisma.$runCommandRaw({
        dropIndexes: 'User',
        index: 'User_firebaseUid_key',
      });
      console.log('✅ Dropped existing firebaseUid index');
    } catch (error: any) {
      if (error.codeName === 'IndexNotFound' || error.message?.includes('index not found')) {
        console.log('ℹ️  No existing index to drop');
      } else {
        console.warn('Warning when dropping index:', error.message);
      }
    }

    // Create sparse unique index
    // Sparse indexes only index documents where the field exists and is not null
    await prisma.$runCommandRaw({
      createIndexes: 'User',
      indexes: [
        {
          key: { firebaseUid: 1 },
          unique: true,
          sparse: true,
          name: 'User_firebaseUid_key',
        },
      ],
    });

    console.log('✅ Successfully created sparse unique index on firebaseUid');
    console.log('   - Multiple null values are allowed');
    console.log('   - Non-null values must be unique');
  } catch (error: any) {
    console.error('❌ Error creating index:', error.message || error);
    if (error.codeName) {
      console.error('   Code:', error.codeName);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSparseIndex();

