/**
 * Test script to login and create a course
 * Tests the full flow: login -> get token -> create course
 */

import axios from 'axios';

const API_URL = 'https://skillstream-platform-api.onrender.com';
const EMAIL = 'thetea@skillstream.world';
const PASSWORD = 'Th3$$team2025!';

async function testLoginAndCreateCourse() {
  console.log('='.repeat(60));
  console.log('Testing Login and Course Creation');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`Email: ${EMAIL}`);
  console.log('');

  // Step 1: Login
  console.log('Step 1: Logging in...');
  try {
    const loginResponse = await axios.post(
      `${API_URL}/api/users/auth/login`,
      {
        email: EMAIL,
        password: PASSWORD,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Login successful!');
    console.log('User:', loginResponse.data.user);
    console.log('Role:', loginResponse.data.user.role);
    
    if (loginResponse.data.user.role !== 'TEACHER') {
      console.log('⚠️  Warning: User is not a TEACHER. Course creation may fail.');
    }

    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id;
    console.log('');

    // Step 2: Create Course (without order and createdBy)
    console.log('Step 2: Creating course (without order and createdBy)...');
    
    const coursePayload = {
      title: 'Test Course - Validation Fix Verification',
      description: 'This course was created to verify that the validation fix works correctly. It should be created without requiring order and createdBy fields.',
      price: 0,
      instructorId: userId,
      difficulty: 'BEGINNER',
      duration: 10,
      language: 'en',
      // Intentionally NOT including order and createdBy
    };

    console.log('Course payload:');
    console.log(JSON.stringify(coursePayload, null, 2));
    console.log('');

    try {
      const courseResponse = await axios.post(
        `${API_URL}/api/courses`,
        coursePayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Course created successfully!');
      console.log('HTTP Status:', courseResponse.status);
      console.log('');
      console.log('Course Details:');
      console.log(JSON.stringify(courseResponse.data, null, 2));
      console.log('');

      // Verify auto-populated fields
      console.log('Verification:');
      if (courseResponse.data.order !== undefined && courseResponse.data.order !== null) {
        console.log(`✅ order was auto-generated: ${courseResponse.data.order}`);
      } else {
        console.log('❌ order was NOT auto-generated');
      }

      if (courseResponse.data.createdBy) {
        console.log(`✅ createdBy was auto-set: ${courseResponse.data.createdBy}`);
        if (courseResponse.data.createdBy === userId) {
          console.log('   ✓ createdBy matches authenticated user ID');
        } else {
          console.log('   ⚠️  createdBy does not match authenticated user ID');
        }
      } else {
        console.log('❌ createdBy was NOT auto-set');
      }

      console.log('');
      console.log('='.repeat(60));
      console.log('✅ ALL TESTS PASSED!');
      console.log('='.repeat(60));
      console.log(`Course ID: ${courseResponse.data.id}`);
      console.log(`Course Title: ${courseResponse.data.title}`);

    } catch (courseError: any) {
      console.log('❌ Course creation failed!');
      
      if (courseError.response) {
        console.log('HTTP Status:', courseError.response.status);
        console.log('Response:', JSON.stringify(courseError.response.data, null, 2));
        
        if (courseError.response.data.details) {
          console.log('');
          console.log('Validation errors:');
          courseError.response.data.details.forEach((detail: any) => {
            console.log(`  - ${detail.path}: ${detail.message}`);
          });
          
          // Check if order or createdBy errors are present
          const hasOrderError = courseError.response.data.details.some(
            (d: any) => d.path === 'order'
          );
          const hasCreatedByError = courseError.response.data.details.some(
            (d: any) => d.path === 'createdBy'
          );
          
          if (hasOrderError || hasCreatedByError) {
            console.log('');
            console.log('❌ VALIDATION FIX FAILED:');
            if (hasOrderError) console.log('   - order field is still required');
            if (hasCreatedByError) console.log('   - createdBy field is still required');
            console.log('');
            console.log('The fix may not have been deployed yet, or there may be an issue.');
          }
        }
      } else if (courseError.request) {
        console.log('No response received from server');
        console.log('Error:', courseError.message);
      } else {
        console.log('Error setting up request:', courseError.message);
      }
      
      process.exit(1);
    }

  } catch (loginError: any) {
    console.log('❌ Login failed!');
    
    if (loginError.response) {
      console.log('HTTP Status:', loginError.response.status);
      console.log('Response:', JSON.stringify(loginError.response.data, null, 2));
    } else if (loginError.request) {
      console.log('No response received from server');
      console.log('Error:', loginError.message);
    } else {
      console.log('Error setting up request:', loginError.message);
    }
    
    console.log('');
    console.log('Possible reasons:');
    console.log('  1. Invalid credentials');
    console.log('  2. Account does not exist');
    console.log('  3. Account is locked or disabled');
    console.log('  4. Network/server error');
    
    process.exit(1);
  }
}

testLoginAndCreateCourse();

