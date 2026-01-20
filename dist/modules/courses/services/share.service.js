"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShareService = void 0;
const prisma_1 = require("../../../utils/prisma");
class ShareService {
    /**
     * Track course share
     */
    async shareCourse(data) {
        await prisma_1.prisma.collectionShare.create({
            data: {
                collectionId: data.courseId,
                userId: data.userId,
                platform: data.platform.toLowerCase(),
            },
        });
    }
    /**
     * Get share statistics for a course
     */
    async getCourseShareStats(courseId) {
        const shares = await prisma_1.prisma.collectionShare.findMany({
            where: { collectionId: courseId },
            select: {
                platform: true,
            },
        });
        const byPlatform = {};
        for (const share of shares) {
            byPlatform[share.platform] = (byPlatform[share.platform] || 0) + 1;
        }
        return {
            totalShares: shares.length,
            byPlatform,
        };
    }
    /**
     * Get shareable link for course
     */
    getShareableLink(courseId, platform) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const courseUrl = `${baseUrl}/courses/${courseId}`;
        const platforms = {
            facebook: (url, title) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            twitter: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
            linkedin: (url, title) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            whatsapp: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
        };
        return platforms[platform.toLowerCase()]?.(courseUrl, 'Check out this course!') || courseUrl;
    }
}
exports.ShareService = ShareService;
