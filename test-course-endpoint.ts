/**
 * Test script to verify course creation endpoint
 * Tests the actual HTTP endpoint to ensure it accepts requests without order and createdBy
 * 
 * Usage:
 *  1. Set AUTH_TOKEN environment variable with a valid teacher JWT token
 *  2. Set API_URL environment variable (defaults to http://localhost:3000)
 *  3. Run: npx ts-node test-course-endpoint.ts
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('❌ Error: AUTH_TOKEN environment variable is required');
  console.log('\nTo get a token:');
  console.log('  1. Login as a teacher user through the frontend');
  console.log('  2. Copy the JWT token from the browser\'s localStorage or network request');
  console.log('  3. Set it as: export AUTH_TOKEN="your-token-here"');
  process.exit(1);
}

async function testCourseCreation() {
  console.log(`Testing course creation endpoint: ${API_URL}/api/courses\n`);

  // Test payload without order and createdBy (matching frontend request)
  const testPayload = {
    title: 'Test Course - Validation Fix',
    description: 'This is a test course to verify the validation fix',
    price: 0,
    instructorId: 'test-instructor-id', // This will be overridden by the backend with the authenticated user's ID
    difficulty: 'BEGINNER',
    duration: 10,
    language: 'en',
    categoryId: undefined,
    thumbnailUrl: undefined,
    learningObjectives: undefined,
    requirements: undefined,
  };

  console.log('Request payload (without order and createdBy):');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\n');

  try {
    const response = await axios.post(
      `${API_URL}/api/courses`,
      testPayload,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ SUCCESS: Course created successfully!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Verify that order and createdBy were auto-populated
    if (response.data.order !== undefined && response.data.order !== null) {
      console.log(`\n✅ Verified: order was auto-generated: ${response.data.order}`);
    } else {
      console.log('\n⚠️  Warning: order was not auto-generated');
    }
    
    if (response.data.createdBy) {
      console.log(`✅ Verified: createdBy was auto-set: ${response.data.createdBy}`);
    } else {
      console.log('⚠️  Warning: createdBy was not auto-set');
    }

  } catch (error: any) {
    if (error.response) {
      console.log('❌ FAIL: Request failed');
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.details) {
        console.log('\nValidation errors:');
        error.response.data.details.forEach((detail: any) => {
          console.log(`  - ${detail.path}: ${detail.message}`);
        });
      }
    } else if (error.request) {
      console.log('❌ FAIL: No response received');
      console.log('Error:', error.message);
      console.log('\nMake sure the backend server is running at:', API_URL);
    } else {
      console.log('❌ FAIL: Error setting up request');
      console.log('Error:', error.message);
    }
    process.exit(1);
  }
}

testCourseCreation();

