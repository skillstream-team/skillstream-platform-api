/**
 * Test script to verify course creation validation
 * Tests that order and createdBy are optional in the validation schema
 */

import { createCourseSchema } from './src/utils/validation-schemas';

// Test case 1: Request without order and createdBy (should pass)
console.log('Test 1: Request without order and createdBy');
try {
  const testPayload1 = {
    title: 'Test Course',
    description: 'Test description',
    price: 0,
    instructorId: 'test-instructor-id',
    difficulty: 'BEGINNER' as const,
    duration: 10,
    language: 'en',
  };
  
  const result1 = createCourseSchema.parse(testPayload1);
  console.log('✅ PASS: Validation accepts request without order and createdBy');
  console.log('   Parsed result:', result1);
} catch (error: any) {
  console.log('❌ FAIL: Validation rejected request without order and createdBy');
  console.log('   Error:', error.errors || error.message);
}

// Test case 2: Request with null order and createdBy (should pass)
console.log('\nTest 2: Request with null order and createdBy');
try {
  const testPayload2 = {
    title: 'Test Course 2',
    description: 'Test description',
    price: 0,
    order: null,
    createdBy: null,
    instructorId: 'test-instructor-id',
    difficulty: 'BEGINNER' as const,
    duration: 10,
    language: 'en',
  };
  
  const result2 = createCourseSchema.parse(testPayload2);
  console.log('✅ PASS: Validation accepts request with null order and createdBy');
  console.log('   Parsed result:', result2);
} catch (error: any) {
  console.log('❌ FAIL: Validation rejected request with null order and createdBy');
  console.log('   Error:', error.errors || error.message);
}

// Test case 3: Request with undefined order and createdBy (should pass)
console.log('\nTest 3: Request with undefined order and createdBy');
try {
  const testPayload3 = {
    title: 'Test Course 3',
    description: 'Test description',
    price: 0,
    order: undefined,
    createdBy: undefined,
    instructorId: 'test-instructor-id',
    difficulty: 'BEGINNER' as const,
    duration: 10,
    language: 'en',
  };
  
  const result3 = createCourseSchema.parse(testPayload3);
  console.log('✅ PASS: Validation accepts request with undefined order and createdBy');
  console.log('   Parsed result:', result3);
} catch (error: any) {
  console.log('❌ FAIL: Validation rejected request with undefined order and createdBy');
  console.log('   Error:', error.errors || error.message);
}

// Test case 4: Request with valid order and createdBy (should pass)
console.log('\nTest 4: Request with valid order and createdBy');
try {
  const testPayload4 = {
    title: 'Test Course 4',
    description: 'Test description',
    price: 0,
    order: 1,
    createdBy: 'test-user-id',
    instructorId: 'test-instructor-id',
    difficulty: 'BEGINNER' as const,
    duration: 10,
    language: 'en',
  };
  
  const result4 = createCourseSchema.parse(testPayload4);
  console.log('✅ PASS: Validation accepts request with valid order and createdBy');
  console.log('   Parsed result:', result4);
} catch (error: any) {
  console.log('❌ FAIL: Validation rejected request with valid order and createdBy');
  console.log('   Error:', error.errors || error.message);
}

// Test case 5: Request missing required fields (should fail)
console.log('\nTest 5: Request missing required fields (title, price, instructorId)');
try {
  const testPayload5 = {
    description: 'Test description',
  };
  
  const result5 = createCourseSchema.parse(testPayload5);
  console.log('❌ FAIL: Validation should reject request missing required fields');
  console.log('   Parsed result:', result5);
} catch (error: any) {
  console.log('✅ PASS: Validation correctly rejects request missing required fields');
  if (error.errors) {
    console.log('   Errors:', error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`));
  }
}

console.log('\n✅ All validation tests completed!');

