"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseImportService = void 0;
const prisma_1 = require("../../../utils/prisma");
const service_1 = require("./service");
const axios_1 = __importDefault(require("axios"));
const learning_service_1 = require("./learning.service");
class CourseImportService {
    constructor() {
        this.processingJobs = new Map();
        this.coursesService = new service_1.CoursesService();
        this.learningService = new learning_service_1.LearningService();
        this.httpClient = axios_1.default.create({
            timeout: 30000, // 30 second timeout
        });
    }
    /**
     * Create a new import job
     */
    async createImportJob(userId, data) {
        // Validate platform
        const supportedPlatforms = ['udemy', 'coursera', 'pluralsight', 'youtube', 'custom'];
        if (!supportedPlatforms.includes(data.platform.toLowerCase())) {
            throw new Error(`Unsupported platform: ${data.platform}. Supported platforms: ${supportedPlatforms.join(', ')}`);
        }
        // Create import job
        const importJob = await prisma_1.prisma.courseImport.create({
            data: {
                createdBy: userId,
                platform: data.platform.toLowerCase(),
                sourceUrl: data.sourceUrl,
                sourceData: data.sourceData || {},
                status: 'PENDING',
                progress: 0,
                metadata: {
                    instructorId: data.instructorId,
                },
            },
        });
        // Start processing asynchronously
        this.processImportJob(importJob.id).catch((error) => {
            console.error(`Error processing import job ${importJob.id}:`, error);
        });
        return this.mapToStatus(importJob);
    }
    /**
     * Process an import job
     */
    async processImportJob(importId) {
        // Check if already processing
        if (this.processingJobs.has(importId)) {
            return;
        }
        const processingPromise = (async () => {
            try {
                // Update status to PROCESSING
                await prisma_1.prisma.courseImport.update({
                    where: { id: importId },
                    data: {
                        status: 'PROCESSING',
                        startedAt: new Date(),
                        progress: 10,
                    },
                });
                // Get import job
                const importJob = await prisma_1.prisma.courseImport.findUnique({
                    where: { id: importId },
                    include: { creator: true },
                });
                if (!importJob) {
                    throw new Error('Import job not found');
                }
                // Check if cancelled
                if (importJob.status === 'CANCELLED') {
                    return;
                }
                // Process based on platform
                const course = await this.processPlatformImport(importJob);
                // Update progress
                await prisma_1.prisma.courseImport.update({
                    where: { id: importId },
                    data: {
                        progress: 90,
                    },
                });
                // Link course to import
                await prisma_1.prisma.courseImport.update({
                    where: { id: importId },
                    data: {
                        status: 'COMPLETED',
                        importedCourseId: course.id,
                        progress: 100,
                        completedAt: new Date(),
                    },
                });
            }
            catch (error) {
                console.error(`Error processing import job ${importId}:`, error);
                await prisma_1.prisma.courseImport.update({
                    where: { id: importId },
                    data: {
                        status: 'FAILED',
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        progress: 0,
                    },
                });
            }
            finally {
                this.processingJobs.delete(importId);
            }
        })();
        this.processingJobs.set(importId, processingPromise);
        await processingPromise;
    }
    /**
     * Process import based on platform
     */
    async processPlatformImport(importJob) {
        const platform = importJob.platform.toLowerCase();
        const instructorId = importJob.metadata?.instructorId || importJob.createdBy;
        switch (platform) {
            case 'udemy':
                return this.importFromUdemy(importJob, instructorId);
            case 'coursera':
                return this.importFromCoursera(importJob, instructorId);
            case 'pluralsight':
                return this.importFromPluralsight(importJob, instructorId);
            case 'youtube':
                return this.importFromYouTube(importJob, instructorId);
            case 'custom':
                return this.importFromCustom(importJob, instructorId);
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
    /**
     * Import from Udemy
     *
     * How it works:
     * 1. If sourceUrl provided: Extract course ID and fetch from Udemy API
     * 2. If sourceData provided: Use provided data directly
     * 3. Transform Udemy format to SkillStream format
     * 4. Create course and import curriculum
     */
    async importFromUdemy(importJob, instructorId) {
        await this.updateProgress(importJob.id, 10);
        let courseData = importJob.sourceData || {};
        // If sourceUrl provided, fetch from Udemy API
        if (importJob.sourceUrl && !importJob.sourceData) {
            try {
                const udemyCourseId = this.extractUdemyCourseId(importJob.sourceUrl);
                if (udemyCourseId) {
                    await this.updateProgress(importJob.id, 20);
                    courseData = await this.fetchUdemyCourseData(udemyCourseId);
                }
            }
            catch (error) {
                console.error('Error fetching from Udemy API:', error);
                throw new Error(`Failed to fetch course from Udemy: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        await this.updateProgress(importJob.id, 30);
        // Transform and create course
        const course = await this.coursesService.createCourse({
            title: courseData.title || 'Imported Course from Udemy',
            description: courseData.description || courseData.headline || '',
            price: courseData.price || courseData.price_detail?.price || 0,
            order: 0,
            createdBy: importJob.createdBy,
            instructorId: instructorId,
            thumbnailUrl: courseData.thumbnailUrl || courseData.image_480x270,
            categoryId: courseData.categoryId,
            difficulty: this.mapDifficulty(courseData.difficulty || courseData.content_info?.level),
            duration: courseData.duration || this.calculateDuration(courseData.content_info),
            language: courseData.language || courseData.locale?.locale || 'en',
            learningObjectives: courseData.learningObjectives || courseData.objectives || [],
            requirements: courseData.requirements || [],
        });
        await this.updateProgress(importJob.id, 50);
        // Import curriculum (modules/lessons) if provided
        if (courseData.modules && Array.isArray(courseData.modules)) {
            await this.importCurriculum(course.id, courseData.modules, importJob.id, importJob.createdBy);
        }
        else if (courseData.curriculum && Array.isArray(courseData.curriculum)) {
            await this.importCurriculum(course.id, courseData.curriculum, importJob.id, importJob.createdBy);
        }
        await this.updateProgress(importJob.id, 90);
        return course;
    }
    /**
     * Fetch course data from Udemy API
     */
    async fetchUdemyCourseData(courseId) {
        const clientId = process.env.UDEMY_CLIENT_ID;
        const clientSecret = process.env.UDEMY_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error('Udemy API credentials not configured. Set UDEMY_CLIENT_ID and UDEMY_CLIENT_SECRET in environment variables.');
        }
        try {
            const response = await this.httpClient.get(`https://www.udemy.com/api-2.0/courses/${courseId}/`, {
                auth: {
                    username: clientId,
                    password: clientSecret,
                },
                params: {
                    fields: [
                        'title',
                        'headline',
                        'description',
                        'price',
                        'image_480x270',
                        'instructor',
                        'objectives',
                        'requirements',
                        'content_info',
                        'locale',
                        'curriculum',
                    ].join(','),
                },
            });
            return response.data;
        }
        catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Course not found on Udemy');
            }
            if (error.response?.status === 401) {
                throw new Error('Invalid Udemy API credentials');
            }
            throw error;
        }
    }
    /**
     * Extract Udemy course ID from URL
     * Examples:
     * - https://www.udemy.com/course/xyz/ → xyz
     * - https://www.udemy.com/course/xyz/?couponCode=ABC → xyz
     */
    extractUdemyCourseId(url) {
        const match = url.match(/udemy\.com\/course\/([^\/\?]+)/);
        return match ? match[1] : null;
    }
    /**
     * Import from Coursera
     *
     * How it works:
     * 1. Extract course slug from URL
     * 2. Fetch course data from Coursera API or scrape public page
     * 3. Transform and create course
     */
    async importFromCoursera(importJob, instructorId) {
        await this.updateProgress(importJob.id, 10);
        let courseData = importJob.sourceData || {};
        // If sourceUrl provided, fetch from Coursera
        if (importJob.sourceUrl && !importJob.sourceData) {
            try {
                const courseSlug = this.extractCourseraCourseSlug(importJob.sourceUrl);
                if (courseSlug) {
                    await this.updateProgress(importJob.id, 20);
                    courseData = await this.fetchCourseraCourseData(courseSlug);
                }
            }
            catch (error) {
                console.error('Error fetching from Coursera:', error);
                throw new Error(`Failed to fetch course from Coursera: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        await this.updateProgress(importJob.id, 30);
        const course = await this.coursesService.createCourse({
            title: courseData.title || courseData.name || 'Imported Course from Coursera',
            description: courseData.description || courseData.shortDescription || '',
            price: courseData.price || 0,
            order: 0,
            createdBy: importJob.createdBy,
            instructorId: instructorId,
            thumbnailUrl: courseData.thumbnailUrl || courseData.photoUrl,
            categoryId: courseData.categoryId,
            difficulty: this.mapDifficulty(courseData.difficulty || courseData.difficultyLevel),
            duration: courseData.duration || courseData.estimatedClassWorkload,
            language: courseData.language || courseData.primaryLanguage || 'en',
            learningObjectives: courseData.learningObjectives || courseData.learningOutcomes || [],
            requirements: courseData.requirements || courseData.prerequisites || [],
        });
        await this.updateProgress(importJob.id, 50);
        // Import curriculum if provided
        if (courseData.modules && Array.isArray(courseData.modules)) {
            await this.importCurriculum(course.id, courseData.modules, importJob.id, importJob.createdBy);
        }
        else if (courseData.courseModules && Array.isArray(courseData.courseModules)) {
            await this.importCurriculum(course.id, courseData.courseModules, importJob.id, importJob.createdBy);
        }
        await this.updateProgress(importJob.id, 90);
        return course;
    }
    /**
     * Fetch course data from Coursera
     * Note: Coursera doesn't have a public API, so this uses web scraping or their internal API
     */
    async fetchCourseraCourseData(courseSlug) {
        // Option 1: Use Coursera's internal API (if available)
        // Option 2: Scrape public course page
        // Option 3: Use provided API key if available
        const apiKey = process.env.COURSERA_API_KEY;
        if (apiKey) {
            try {
                // If Coursera provides an API endpoint
                const response = await this.httpClient.get(`https://api.coursera.org/api/courses.v1/${courseSlug}`, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                    },
                });
                return response.data;
            }
            catch (error) {
                if (error.response?.status !== 404) {
                    throw error;
                }
            }
        }
        // Fallback: Scrape public course page
        try {
            const response = await this.httpClient.get(`https://www.coursera.org/learn/${courseSlug}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SkillStream/1.0)',
                },
            });
            // Parse HTML to extract course data
            // This is a simplified example - you'd need proper HTML parsing
            const html = response.data;
            return this.parseCourseraPage(html);
        }
        catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Course not found on Coursera');
            }
            throw new Error(`Failed to fetch Coursera course: ${error.message}`);
        }
    }
    /**
     * Parse Coursera course page HTML
     * Note: This is a simplified example. In production, use a proper HTML parser like cheerio
     */
    parseCourseraPage(html) {
        // Extract course data from HTML
        // This would use a library like cheerio or jsdom in production
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? titleMatch[1].replace(' | Coursera', '').trim() : 'Coursera Course';
        // Extract more data from structured data (JSON-LD)
        const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
        if (jsonLdMatch) {
            try {
                const structuredData = JSON.parse(jsonLdMatch[1]);
                return {
                    title: structuredData.name || title,
                    description: structuredData.description,
                    thumbnailUrl: structuredData.image,
                };
            }
            catch (e) {
                // Fallback if JSON parsing fails
            }
        }
        return {
            title,
            description: '',
        };
    }
    /**
     * Extract Coursera course slug from URL
     * Examples:
     * - https://www.coursera.org/learn/machine-learning → machine-learning
     * - https://www.coursera.org/course/machine-learning → machine-learning
     */
    extractCourseraCourseSlug(url) {
        const match = url.match(/coursera\.org\/(?:learn|course)\/([^\/\?]+)/);
        return match ? match[1] : null;
    }
    /**
     * Import from Pluralsight
     *
     * How it works:
     * 1. Extract course ID or slug from URL
     * 2. Fetch course data from Pluralsight API
     * 3. Transform and create course with modules/clips
     */
    async importFromPluralsight(importJob, instructorId) {
        await this.updateProgress(importJob.id, 10);
        let courseData = importJob.sourceData || {};
        // If sourceUrl provided, fetch from Pluralsight API
        if (importJob.sourceUrl && !importJob.sourceData) {
            try {
                const courseId = this.extractPluralsightCourseId(importJob.sourceUrl);
                if (courseId) {
                    await this.updateProgress(importJob.id, 20);
                    courseData = await this.fetchPluralsightCourseData(courseId);
                }
            }
            catch (error) {
                console.error('Error fetching from Pluralsight:', error);
                throw new Error(`Failed to fetch course from Pluralsight: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        await this.updateProgress(importJob.id, 30);
        const course = await this.coursesService.createCourse({
            title: courseData.title || courseData.name || 'Imported Course from Pluralsight',
            description: courseData.description || courseData.shortDescription || '',
            price: courseData.price || 0,
            order: 0,
            createdBy: importJob.createdBy,
            instructorId: instructorId,
            thumbnailUrl: courseData.thumbnailUrl || courseData.imageUrl,
            categoryId: courseData.categoryId,
            difficulty: this.mapDifficulty(courseData.difficulty || courseData.level),
            duration: courseData.duration || this.calculatePluralsightDuration(courseData),
            language: courseData.language || 'en',
            learningObjectives: courseData.learningObjectives || courseData.objectives || [],
            requirements: courseData.requirements || courseData.prerequisites || [],
        });
        await this.updateProgress(importJob.id, 50);
        // Import modules/clips if provided
        if (courseData.modules && Array.isArray(courseData.modules)) {
            await this.importPluralsightModules(course.id, courseData.modules, importJob.id, importJob.createdBy);
        }
        else if (courseData.courseModules && Array.isArray(courseData.courseModules)) {
            await this.importPluralsightModules(course.id, courseData.courseModules, importJob.id, importJob.createdBy);
        }
        await this.updateProgress(importJob.id, 90);
        return course;
    }
    /**
     * Fetch course data from Pluralsight API
     */
    async fetchPluralsightCourseData(courseId) {
        const apiKey = process.env.PLURALSIGHT_API_KEY;
        if (!apiKey) {
            throw new Error('Pluralsight API key not configured. Set PLURALSIGHT_API_KEY in environment variables.');
        }
        try {
            const response = await this.httpClient.get(`https://app.pluralsight.com/learner/content/courses/${courseId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json',
                },
            });
            return response.data;
        }
        catch (error) {
            // Try alternative endpoint
            try {
                const response = await this.httpClient.get(`https://api.pluralsight.com/v2/courses/${courseId}`, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                    },
                });
                return response.data;
            }
            catch (retryError) {
                if (retryError.response?.status === 404) {
                    throw new Error('Course not found on Pluralsight');
                }
                if (retryError.response?.status === 401) {
                    throw new Error('Invalid Pluralsight API key');
                }
                throw new Error(`Failed to fetch from Pluralsight: ${retryError.message}`);
            }
        }
    }
    /**
     * Extract Pluralsight course ID from URL
     * Examples:
     * - https://www.pluralsight.com/courses/xyz → xyz
     * - https://app.pluralsight.com/library/courses/xyz → xyz
     */
    extractPluralsightCourseId(url) {
        const patterns = [
            /pluralsight\.com\/(?:library\/)?courses\/([^\/\?]+)/,
            /app\.pluralsight\.com\/learner\/content\/courses\/([^\/\?]+)/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
    /**
     * Calculate course duration from Pluralsight data
     */
    calculatePluralsightDuration(courseData) {
        if (courseData.duration) {
            return courseData.duration;
        }
        if (courseData.totalDuration) {
            // Convert seconds to hours
            return Math.ceil(courseData.totalDuration / 3600);
        }
        if (courseData.modules && Array.isArray(courseData.modules)) {
            // Sum up module durations
            const totalSeconds = courseData.modules.reduce((sum, module) => {
                return sum + (module.duration || module.totalDuration || 0);
            }, 0);
            return Math.ceil(totalSeconds / 3600);
        }
        return undefined;
    }
    /**
     * Import Pluralsight modules and clips
     */
    async importPluralsightModules(courseId, modules, importJobId, createdBy) {
        for (const [moduleIndex, module] of modules.entries()) {
            const progress = 50 + (moduleIndex / modules.length) * 30;
            await this.updateProgress(importJobId, progress);
            // Create module
            const courseModule = await this.learningService.createCourseModule({
                courseId,
                title: module.title || module.name || `Module ${moduleIndex + 1}`,
                description: module.description,
                order: moduleIndex + 1,
                createdBy,
            });
            // Import clips (lessons) if provided
            if (module.clips && Array.isArray(module.clips)) {
                for (const [clipIndex, clip] of module.clips.entries()) {
                    await prisma_1.prisma.lesson.create({
                        data: {
                            courseId,
                            title: clip.title || clip.name || `Lesson ${clipIndex + 1}`,
                            content: {
                                type: 'video',
                                videoId: clip.id,
                                platform: 'pluralsight',
                                url: clip.url,
                            },
                            order: clipIndex + 1,
                            duration: clip.duration || Math.ceil((clip.lengthInSeconds || 0) / 60),
                        },
                    });
                }
            }
        }
    }
    /**
     * Import from YouTube
     *
     * How it works:
     * 1. Extract video ID or playlist ID from URL
     * 2. Fetch video/playlist metadata from YouTube Data API
     * 3. Create course with video as lesson
     */
    async importFromYouTube(importJob, instructorId) {
        await this.updateProgress(importJob.id, 10);
        let courseData = importJob.sourceData || {};
        // Extract video ID from URL if provided
        if (importJob.sourceUrl) {
            const videoId = this.extractYouTubeVideoId(importJob.sourceUrl);
            if (videoId) {
                await this.updateProgress(importJob.id, 20);
                try {
                    const videoData = await this.fetchYouTubeVideoData(videoId);
                    courseData = {
                        ...courseData,
                        title: courseData.title || videoData.title,
                        description: courseData.description || videoData.description,
                        thumbnailUrl: courseData.thumbnailUrl || videoData.thumbnailUrl,
                        duration: courseData.duration || this.parseYouTubeDuration(videoData.duration),
                    };
                }
                catch (error) {
                    console.error('Error fetching YouTube video:', error);
                    // Continue with provided data if API fails
                }
            }
        }
        await this.updateProgress(importJob.id, 40);
        const course = await this.coursesService.createCourse({
            title: courseData.title || 'Imported Course from YouTube',
            description: courseData.description || '',
            price: courseData.price || 0,
            order: 0,
            createdBy: importJob.createdBy,
            instructorId: instructorId,
            thumbnailUrl: courseData.thumbnailUrl,
            categoryId: courseData.categoryId,
            difficulty: courseData.difficulty,
            duration: courseData.duration,
            language: courseData.language || 'en',
            learningObjectives: courseData.learningObjectives,
            requirements: courseData.requirements,
        });
        await this.updateProgress(importJob.id, 60);
        // Create lesson with YouTube video if URL provided
        if (importJob.sourceUrl) {
            const videoId = this.extractYouTubeVideoId(importJob.sourceUrl);
            if (videoId) {
                await this.createYouTubeLesson(course.id, videoId);
            }
        }
        await this.updateProgress(importJob.id, 90);
        return course;
    }
    /**
     * Fetch video data from YouTube Data API
     */
    async fetchYouTubeVideoData(videoId) {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            throw new Error('YouTube API key not configured. Set YOUTUBE_API_KEY in environment variables.');
        }
        try {
            const response = await this.httpClient.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    id: videoId,
                    part: 'snippet,contentDetails,statistics',
                    key: apiKey,
                },
            });
            if (!response.data.items || response.data.items.length === 0) {
                throw new Error('Video not found on YouTube');
            }
            const video = response.data.items[0];
            return {
                title: video.snippet.title,
                description: video.snippet.description,
                thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
                duration: video.contentDetails.duration,
                channelTitle: video.snippet.channelTitle,
            };
        }
        catch (error) {
            if (error.response?.status === 403) {
                throw new Error('YouTube API quota exceeded or invalid API key');
            }
            throw error;
        }
    }
    /**
     * Parse YouTube duration (ISO 8601 format) to seconds
     * Example: "PT1H2M10S" → 3730 seconds
     */
    parseYouTubeDuration(duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match)
            return 0;
        const hours = parseInt(match[1] || '0', 10);
        const minutes = parseInt(match[2] || '0', 10);
        const seconds = parseInt(match[3] || '0', 10);
        return hours * 3600 + minutes * 60 + seconds;
    }
    /**
     * Create a lesson with YouTube video
     */
    async createYouTubeLesson(courseId, videoId) {
        // Create lesson
        await prisma_1.prisma.lesson.create({
            data: {
                courseId,
                title: 'Video Lesson',
                content: {
                    type: 'video',
                    videoId: videoId,
                    platform: 'youtube',
                },
                order: 1,
            },
        });
    }
    /**
     * Import from custom source
     */
    async importFromCustom(importJob, instructorId) {
        await this.updateProgress(importJob.id, 20);
        const courseData = importJob.sourceData || {};
        if (!courseData.title) {
            throw new Error('Course title is required for custom imports');
        }
        const course = await this.coursesService.createCourse({
            title: courseData.title,
            description: courseData.description || '',
            price: courseData.price || 0,
            order: 0,
            createdBy: importJob.createdBy,
            instructorId: instructorId,
            thumbnailUrl: courseData.thumbnailUrl,
            categoryId: courseData.categoryId,
            difficulty: courseData.difficulty,
            duration: courseData.duration,
            language: courseData.language || 'en',
            learningObjectives: courseData.learningObjectives,
            requirements: courseData.requirements,
        });
        await this.updateProgress(importJob.id, 80);
        return course;
    }
    /**
     * Extract YouTube video ID from URL
     * Supports various YouTube URL formats
     */
    extractYouTubeVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
            /youtube\.com\/v\/([^&\n?#]+)/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
    /**
     * Map external difficulty level to SkillStream format
     */
    mapDifficulty(level) {
        if (!level)
            return undefined;
        const levelLower = level.toLowerCase();
        if (levelLower.includes('beginner') || levelLower === 'all') {
            return 'BEGINNER';
        }
        if (levelLower.includes('intermediate') || levelLower.includes('medium')) {
            return 'INTERMEDIATE';
        }
        if (levelLower.includes('advanced')) {
            return 'ADVANCED';
        }
        if (levelLower.includes('expert')) {
            return 'EXPERT';
        }
        return undefined;
    }
    /**
     * Calculate course duration from content info
     */
    calculateDuration(contentInfo) {
        if (!contentInfo)
            return undefined;
        // If duration in seconds provided
        if (contentInfo.video_content_length) {
            return Math.ceil(contentInfo.video_content_length / 3600); // Convert to hours
        }
        // If duration in hours provided
        if (contentInfo.duration) {
            return contentInfo.duration;
        }
        return undefined;
    }
    /**
     * Import curriculum (modules and lessons)
     */
    async importCurriculum(courseId, curriculum, importJobId, createdBy) {
        for (const [moduleIndex, module] of curriculum.entries()) {
            // Update progress
            const progress = 50 + (moduleIndex / curriculum.length) * 30;
            await this.updateProgress(importJobId, progress);
            // Create module
            const courseModule = await this.learningService.createCourseModule({
                courseId,
                title: module.title || `Module ${moduleIndex + 1}`,
                description: module.description,
                order: moduleIndex + 1,
                createdBy,
            });
            // Import lessons if provided
            if (module.lessons && Array.isArray(module.lessons)) {
                for (const [lessonIndex, lesson] of module.lessons.entries()) {
                    await prisma_1.prisma.lesson.create({
                        data: {
                            courseId,
                            title: lesson.title || `Lesson ${lessonIndex + 1}`,
                            content: lesson.content || { description: lesson.description },
                            order: lessonIndex + 1,
                            duration: lesson.duration,
                        },
                    });
                }
            }
        }
    }
    /**
     * Update import job progress
     */
    async updateProgress(importId, progress) {
        await prisma_1.prisma.courseImport.update({
            where: { id: importId },
            data: { progress: Math.min(100, Math.max(0, progress)) },
        });
    }
    /**
     * Get import job status
     */
    async getImportStatus(importId, userId) {
        const importJob = await prisma_1.prisma.courseImport.findFirst({
            where: {
                id: importId,
                createdBy: userId,
            },
        });
        if (!importJob) {
            throw new Error('Import job not found');
        }
        return this.mapToStatus(importJob);
    }
    /**
     * List import jobs
     */
    async listImports(userId, options) {
        const page = options?.page || 1;
        const limit = Math.min(options?.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = { createdBy: userId };
        if (options?.status) {
            where.status = options.status.toUpperCase();
        }
        if (options?.platform) {
            where.platform = options.platform.toLowerCase();
        }
        const [imports, total] = await Promise.all([
            prisma_1.prisma.courseImport.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.courseImport.count({ where }),
        ]);
        return {
            data: imports.map(this.mapToStatus),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Cancel an import job
     */
    async cancelImport(importId, userId) {
        const importJob = await prisma_1.prisma.courseImport.findFirst({
            where: {
                id: importId,
                createdBy: userId,
            },
        });
        if (!importJob) {
            throw new Error('Import job not found');
        }
        if (importJob.status === 'COMPLETED') {
            throw new Error('Cannot cancel a completed import job');
        }
        if (importJob.status === 'CANCELLED') {
            return this.mapToStatus(importJob);
        }
        // Update status to cancelled
        const updated = await prisma_1.prisma.courseImport.update({
            where: { id: importId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
            },
        });
        return this.mapToStatus(updated);
    }
    /**
     * Map Prisma model to status DTO
     */
    mapToStatus(importJob) {
        return {
            id: importJob.id,
            platform: importJob.platform,
            status: importJob.status,
            progress: importJob.progress,
            importedCourseId: importJob.importedCourseId || undefined,
            errorMessage: importJob.errorMessage || undefined,
            metadata: importJob.metadata || undefined,
            startedAt: importJob.startedAt || undefined,
            completedAt: importJob.completedAt || undefined,
            cancelledAt: importJob.cancelledAt || undefined,
            createdAt: importJob.createdAt,
            updatedAt: importJob.updatedAt,
        };
    }
}
exports.CourseImportService = CourseImportService;
