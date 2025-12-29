# Course Import System - How It Works

This document explains how the course import system works and how to integrate with external platforms.

## Overview

The course import system allows admins to import courses from external platforms (Udemy, Coursera, Skillshare, YouTube, etc.) into SkillStream. The system uses an asynchronous job-based approach to handle imports that may take time.

## Architecture

### 1. Import Job Flow

```
Admin Request → Create Job (PENDING) → Process Async → Update Status → Complete
```

1. **Create Job**: Admin creates an import job via API
2. **Queue Processing**: Job is queued for async processing
3. **Fetch Data**: System fetches course data from external platform
4. **Transform Data**: Convert external format to SkillStream format
5. **Create Course**: Create course in SkillStream database
6. **Import Content**: Import modules, lessons, videos, etc.
7. **Update Status**: Mark job as completed/failed

### 2. Job States

- **PENDING**: Job created, waiting to be processed
- **PROCESSING**: Currently being processed
- **COMPLETED**: Successfully imported
- **FAILED**: Import failed (error message stored)
- **CANCELLED**: Manually cancelled by admin

## How External Import Works

### Method 1: Using Platform APIs (Recommended)

For platforms that provide APIs (Udemy, Coursera), you fetch course data directly:

```typescript
// Example: Fetching from Udemy API
const udemyClient = axios.create({
  baseURL: 'https://www.udemy.com/api-2.0',
  auth: {
    username: process.env.UDEMY_CLIENT_ID!,
    password: process.env.UDEMY_CLIENT_SECRET!,
  },
});

// Extract course ID from URL
const courseId = extractUdemyCourseId(sourceUrl); // e.g., "123456"

// Fetch course data
const response = await udemyClient.get(`/courses/${courseId}/`, {
  params: {
    fields: 'title,description,price,image_480x270,instructor,objectives,requirements',
  },
});

const udemyCourse = response.data;
```

### Method 2: Web Scraping (Fallback)

For platforms without APIs, you can scrape public pages:

```typescript
// Example: Scraping YouTube course page
const response = await axios.get(sourceUrl);
const html = response.data;

// Parse HTML to extract course information
const title = extractTitle(html);
const description = extractDescription(html);
// ... etc
```

### Method 3: Manual Data Input (Custom)

Admin provides course data directly:

```json
{
  "platform": "custom",
  "sourceData": {
    "title": "My Course",
    "description": "...",
    "price": 49.99,
    "modules": [...]
  }
}
```

## Platform-Specific Implementation

### Supported Platforms

The system supports importing from:
- **Udemy** - Via Udemy API
- **Coursera** - Via API or web scraping
- **Pluralsight** - Via Pluralsight API
- **YouTube** - Via YouTube Data API
- **Custom** - Manual data input

### Udemy Import

**Requirements:**
- Udemy API credentials (Client ID & Secret)
- Course URL or Course ID

**Process:**
1. Extract course ID from URL: `https://www.udemy.com/course/xyz/` → `xyz`
2. Call Udemy API: `GET /api-2.0/courses/{id}/`
3. Transform Udemy data to SkillStream format
4. Create course and import curriculum

**Example:**
```typescript
async importFromUdemy(importJob, instructorId) {
  // 1. Extract course ID
  const courseId = this.extractUdemyCourseId(importJob.sourceUrl);
  
  // 2. Fetch from Udemy API
  const udemyCourse = await this.fetchUdemyCourse(courseId);
  
  // 3. Transform data
  const courseData = {
    title: udemyCourse.title,
    description: udemyCourse.headline,
    price: udemyCourse.price_detail?.price || 0,
    thumbnailUrl: udemyCourse.image_480x270,
    difficulty: this.mapUdemyLevel(udemyCourse.content_info),
    duration: udemyCourse.content_info?.video_content_length,
    learningObjectives: udemyCourse.objectives,
    requirements: udemyCourse.requirements,
  };
  
  // 4. Create course
  const course = await this.coursesService.createCourse({
    ...courseData,
    instructorId,
    createdBy: importJob.createdBy,
  });
  
  // 5. Import curriculum
  await this.importUdemyCurriculum(course.id, courseId);
  
  return course;
}
```

### YouTube Import

**Requirements:**
- YouTube Data API key
- Video URL or Playlist URL

**Process:**
1. Extract video/playlist ID from URL
2. Call YouTube API: `GET /youtube/v3/videos` or `/playlists`
3. Create course from video(s)
4. Import video metadata

**Example:**
```typescript
async importFromYouTube(importJob, instructorId) {
  const videoId = this.extractYouTubeVideoId(importJob.sourceUrl);
  
  // Fetch video data
  const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      id: videoId,
      part: 'snippet,contentDetails,statistics',
      key: process.env.YOUTUBE_API_KEY,
    },
  });
  
  const video = response.data.items[0];
  
  // Create course
  const course = await this.coursesService.createCourse({
    title: video.snippet.title,
    description: video.snippet.description,
    thumbnailUrl: video.snippet.thumbnails.high.url,
    instructorId,
    createdBy: importJob.createdBy,
  });
  
  // Create lesson with YouTube video
  await this.createYouTubeLesson(course.id, video);
  
  return course;
}
```

### Coursera Import

**Requirements:**
- Coursera API access (if available) or web scraping
- Course URL

**Process:**
1. Extract course slug from URL
2. Fetch course data (API or scrape)
3. Transform and import

### Pluralsight Import

**Requirements:**
- Pluralsight API key
- Course URL or Course ID

**Process:**
1. Extract course ID from URL: `https://www.pluralsight.com/courses/xyz` → `xyz`
2. Call Pluralsight API: `GET /courses/{id}`
3. Transform Pluralsight data to SkillStream format
4. Create course and import modules/clips

**Example:**
```typescript
async importFromPluralsight(importJob, instructorId) {
  // 1. Extract course ID
  const courseId = this.extractPluralsightCourseId(importJob.sourceUrl);
  
  // 2. Fetch from Pluralsight API
  const pluralsightCourse = await this.fetchPluralsightCourseData(courseId);
  
  // 3. Transform data
  const courseData = {
    title: pluralsightCourse.name,
    description: pluralsightCourse.shortDescription,
    thumbnailUrl: pluralsightCourse.imageUrl,
    difficulty: this.mapDifficulty(pluralsightCourse.level),
    duration: this.calculatePluralsightDuration(pluralsightCourse),
    learningObjectives: pluralsightCourse.objectives,
  };
  
  // 4. Create course
  const course = await this.coursesService.createCourse({
    ...courseData,
    instructorId,
    createdBy: importJob.createdBy,
  });
  
  // 5. Import modules and clips
  await this.importPluralsightModules(course.id, pluralsightCourse.modules);
  
  return course;
}
```

## Data Transformation

Each platform has different data structures. You need to map them to SkillStream's format:

```typescript
interface SkillStreamCourse {
  title: string;
  description: string;
  price: number;
  thumbnailUrl?: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  duration?: number; // hours
  language?: string;
  learningObjectives?: string[];
  requirements?: string[];
}

// Example transformation
function transformUdemyToSkillStream(udemyCourse: any): SkillStreamCourse {
  return {
    title: udemyCourse.title,
    description: udemyCourse.headline || udemyCourse.description,
    price: udemyCourse.price_detail?.price || 0,
    thumbnailUrl: udemyCourse.image_480x270,
    difficulty: mapDifficulty(udemyCourse.content_info?.level),
    duration: calculateDuration(udemyCourse.content_info),
    language: udemyCourse.locale?.locale || 'en',
    learningObjectives: udemyCourse.objectives || [],
    requirements: udemyCourse.requirements || [],
  };
}
```

## Importing Course Content

After creating the course, you need to import the curriculum:

### Modules and Lessons

```typescript
async importCurriculum(courseId: string, externalCurriculum: any[]) {
  const learningService = new LearningService();
  
  for (const [index, module] of externalCurriculum.entries()) {
    // Create module
    const courseModule = await learningService.createCourseModule({
      courseId,
      title: module.title,
      description: module.description,
      order: index + 1,
      createdBy: this.adminId,
    });
    
    // Import lessons
    for (const [lessonIndex, lesson] of module.lessons.entries()) {
      await this.importLesson(courseModule.id, lesson, lessonIndex);
    }
  }
}
```

### Videos

```typescript
async importLesson(moduleId: string, lesson: any, order: number) {
  // Create lesson
  const lessonRecord = await prisma.lesson.create({
    data: {
      courseId: module.courseId,
      title: lesson.title,
      content: { description: lesson.description },
      order,
      duration: lesson.duration,
    },
  });
  
  // If video URL provided, create video record
  if (lesson.videoUrl) {
    await prisma.video.create({
      data: {
        courseId: module.courseId,
        streamId: extractVideoId(lesson.videoUrl),
        title: lesson.title,
        playbackUrl: lesson.videoUrl,
        type: 'on-demand',
        uploadedBy: this.adminId,
      },
    });
  }
}
```

## Error Handling

The system handles various error scenarios:

1. **API Errors**: Network failures, rate limits, invalid credentials
2. **Data Validation**: Missing required fields, invalid formats
3. **Platform Changes**: API changes, URL structure changes
4. **Content Issues**: Unsupported video formats, large files

```typescript
try {
  const course = await this.importFromPlatform(importJob);
} catch (error) {
  // Log error
  console.error(`Import failed for job ${importJob.id}:`, error);
  
  // Update job status
  await prisma.courseImport.update({
    where: { id: importJob.id },
    data: {
      status: 'FAILED',
      errorMessage: error.message,
    },
  });
  
  // Optionally: Send notification to admin
}
```

## Rate Limiting & Best Practices

### Rate Limiting

External APIs often have rate limits. Implement throttling:

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  async waitIfNeeded(platform: string, maxRequests: number, windowMs: number) {
    const now = Date.now();
    const requests = this.requests.get(platform) || [];
    
    // Remove old requests outside window
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      const oldestRequest = recentRequests[0];
      const waitTime = windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    recentRequests.push(now);
    this.requests.set(platform, recentRequests);
  }
}
```

### Best Practices

1. **Validate Early**: Check URLs and credentials before processing
2. **Progress Updates**: Update progress frequently for long imports
3. **Idempotency**: Handle duplicate imports gracefully
4. **Caching**: Cache API responses when possible
5. **Retry Logic**: Retry transient failures
6. **Logging**: Log all import activities for debugging

## Environment Variables

Add platform API credentials to `.env`:

```env
# Udemy API
UDEMY_CLIENT_ID=your_client_id
UDEMY_CLIENT_SECRET=your_client_secret

# YouTube API
YOUTUBE_API_KEY=your_api_key

# Coursera (if API available)
COURSERA_API_KEY=your_api_key

# Pluralsight API
PLURALSIGHT_API_KEY=your_api_key
```

### Getting API Keys

1. **Udemy**: Apply for API access at https://www.udemy.com/user/account-api/
2. **YouTube**: Get API key from Google Cloud Console (YouTube Data API v3)
3. **Coursera**: Currently uses web scraping (no public API)
4. **Pluralsight**: Contact Pluralsight for API access or use their internal API

## Testing

### Test with Sample Data

```bash
# Test custom import
curl -X POST http://localhost:3000/api/courses/import \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "custom",
    "sourceData": {
      "title": "Test Course",
      "description": "A test course",
      "price": 29.99,
      "difficulty": "BEGINNER"
    }
  }'
```

### Monitor Import Status

```bash
# Check status
curl http://localhost:3000/api/courses/import/{job_id}/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Future Enhancements

1. **Webhook Support**: Notify when import completes
2. **Batch Imports**: Import multiple courses at once
3. **Scheduled Imports**: Auto-import on schedule
4. **Content Sync**: Keep imported courses in sync with source
5. **Preview Mode**: Preview before importing
6. **Import Templates**: Save import configurations

## Security Considerations

1. **API Keys**: Store securely, never expose in frontend
2. **URL Validation**: Validate source URLs to prevent SSRF
3. **Content Scanning**: Scan imported content for malware
4. **Rate Limiting**: Prevent abuse of import endpoints
5. **Access Control**: Only admins can import courses

