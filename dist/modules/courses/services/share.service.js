"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShareService = void 0;
const prisma_1 = require("../../../utils/prisma");
class ShareService {
    /**
     * Track program share
     */
    async shareProgram(data) {
        await prisma_1.prisma.programShare.create({
            data: {
                programId: data.programId,
                userId: data.userId,
                platform: data.platform.toLowerCase(),
            },
        });
    }
    /**
     * Get share statistics for a program
     */
    async getProgramShareStats(programId) {
        const shares = await prisma_1.prisma.programShare.findMany({
            where: { programId },
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
     * Get shareable link for program
     */
    getShareableLink(programId, platform) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const programUrl = `${baseUrl}/programs/${programId}`;
        const platforms = {
            facebook: (url, title) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            twitter: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
            linkedin: (url, title) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            whatsapp: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
        };
        return platforms[platform.toLowerCase()]?.(programUrl, 'Check out this program!') || programUrl;
    }
}
exports.ShareService = ShareService;
