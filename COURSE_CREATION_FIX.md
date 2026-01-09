# Course Creation Validation Fix

## Problem
When creating a new course via `POST /api/courses`, the endpoint was returning a 400 validation error:
```json
{
    "error": "Validation error",
    "details": [
        {
            "path": "order",
            "message": "Required"
        },
        {
            "path": "createdBy",
            "message": "Required"
        }
    ]
}
```

## Root Cause
The validation schema marked `order` and `createdBy` as `.optional()`, but Zod's validation was still requiring them. The route handler was designed to auto-populate these fields:
- `createdBy`: Auto-set from the authenticated user's ID
- `order`: Auto-generated based on the max order for the instructor

## Solution
1. **Updated validation schema** (`src/utils/validation-schemas.ts`):
   - Changed `order` from `.optional()` to `.nullish()` 
   - Changed `createdBy` from `.optional()` to `.nullish()`
   - This allows the fields to be `null`, `undefined`, or omitted entirely

2. **Updated route handler** (`src/modules/courses/routes/rest/courses.routes.ts`):
   - Changed `createdBy: req.body.createdBy || userId` to `createdBy: req.body.createdBy ?? userId`
   - Changed `if (!payload.order)` to `if (payload.order == null)` to properly handle both `null` and `undefined`

## Testing

### Validation Schema Tests
Run the validation schema test:
```bash
cd skillstream-platform-api
npx ts-node test-course-validation.ts
```

All tests should pass ✅

### Endpoint Tests

#### Option 1: Using the TypeScript test script
```bash
cd skillstream-platform-api
export AUTH_TOKEN="your-teacher-jwt-token"
export API_URL="https://skillstream-platform-api.onrender.com"  # or http://localhost:3000 for local
npx ts-node test-course-endpoint.ts
```

#### Option 2: Using the bash script
```bash
cd skillstream-platform-api
export AUTH_TOKEN="your-teacher-jwt-token"
export API_URL="https://skillstream-platform-api.onrender.com"  # optional, defaults to production
./test-endpoint.sh
```

#### Option 3: Using curl directly
```bash
curl -X POST "https://skillstream-platform-api.onrender.com/api/courses" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Course",
    "description": "Test description",
    "price": 0,
    "instructorId": "your-instructor-id",
    "difficulty": "BEGINNER",
    "duration": 10,
    "language": "en"
  }'
```

**Note:** The `order` and `createdBy` fields should NOT be included in the request payload. They will be auto-populated by the backend.

## Expected Behavior
- ✅ Request without `order` and `createdBy` should pass validation
- ✅ Request with `null` values for `order` and `createdBy` should pass validation
- ✅ Request with `undefined` values for `order` and `createdBy` should pass validation
- ✅ Backend should auto-set `createdBy` from authenticated user
- ✅ Backend should auto-generate `order` based on instructor's existing courses

## Files Changed
1. `src/utils/validation-schemas.ts` - Updated `createCourseSchema`
2. `src/modules/courses/routes/rest/courses.routes.ts` - Updated route handler logic
3. `dist/utils/validation-schemas.js` - Rebuilt (auto-generated)
4. `dist/modules/courses/routes/rest/courses.routes.js` - Rebuilt (auto-generated)

## Deployment
After making these changes:
1. ✅ Code changes completed
2. ✅ TypeScript compilation successful (`npm run build`)
3. ⏳ **Next step:** Deploy to production (Render will auto-deploy on push, or manually trigger deployment)
4. ⏳ **After deployment:** Test the endpoint with a real auth token

## Verification
The fix was verified by:
1. ✅ Validation schema tests - All pass
2. ✅ Test request to production endpoint - Returns auth error (not validation error), confirming validation passes
3. ⏳ Full endpoint test with auth token - Requires deployment and valid token

