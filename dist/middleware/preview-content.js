"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowPreviewContent = allowPreviewContent;
exports.getPreviewContent = getPreviewContent;
const prisma_1 = require("../utils/prisma");
const subscription_service_1 = require("../modules/subscriptions/services/subscription.service");
const subscriptionService = new subscription_service_1.SubscriptionService();
/**
 * Middleware to allow access to preview content without subscription
 * Checks if the content (lesson/video) is marked as preview
 * If it's preview, allows access. If not, requires subscription.
 */
async function allowPreviewContent(req, res, next) {
    try {
        const user = req.user;
        // If no user, only allow preview content
        if (!user) {
            // Check if this is a preview lesson/video
            const isPreview = await checkIfPreviewContent(req);
            if (!isPreview) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            return next();
        }
        // Teachers and Admins have full access
        if (user.role === 'TEACHER' || user.role === 'ADMIN') {
            return next();
        }
        // Check if user has subscription
        const hasSubscription = await subscriptionService.hasActiveSubscription(user.id);
        if (hasSubscription) {
            return next();
        }
        // If no subscription, only allow preview content
        const isPreview = await checkIfPreviewContent(req);
        if (!isPreview) {
            return res.status(403).json({
                error: 'Active subscription required. This content is not available as a preview.',
            });
        }
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Helper function to check if the requested content is preview
 */
async function checkIfPreviewContent(req) {
    const { lessonId, videoId } = req.params;
    if (lessonId) {
        const lesson = await prisma_1.prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { isPreview: true },
        });
        return lesson?.isPreview || false;
    }
    if (videoId) {
        const video = await prisma_1.prisma.video.findUnique({
            where: { id: videoId },
            select: { isPreview: true },
        });
        return video?.isPreview || false;
    }
    // If no lessonId or videoId, assume it's not preview
    return false;
}
/**
 * Middleware to get preview content for a course (public access)
 * Returns only preview lessons and videos
 */
async function getPreviewContent(req, res, next) {
    try {
        const { courseId } = req.params;
        const [previewLessons, previewVideos] = await Promise.all([
            prisma_1.prisma.lesson.findMany({
                where: {
                    courseId,
                    isPreview: true,
                },
                select: {
                    id: true,
                    title: true,
                    order: true,
                    duration: true,
                    createdAt: true,
                },
                orderBy: { order: 'asc' },
            }),
            prisma_1.prisma.video.findMany({
                where: {
                    courseId,
                    isPreview: true,
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    thumbnailUrl: true,
                    duration: true,
                    playbackUrl: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'asc' },
            }),
        ]);
        req.previewContent = {
            lessons: previewLessons,
            videos: previewVideos,
        };
        next();
    }
    catch (error) {
        next(error);
    }
}
