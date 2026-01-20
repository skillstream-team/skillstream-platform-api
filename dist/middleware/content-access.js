"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireContentAccess = requireContentAccess;
const monetization_service_1 = require("../modules/courses/services/monetization.service");
/**
 * Middleware to check if user has access to content
 * Use this on routes that serve content (videos, lessons, etc.)
 */
async function requireContentAccess(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const { collectionId, lessonId } = req.params;
        const monetizationService = new monetization_service_1.MonetizationService();
        if (collectionId) {
            const canAccess = await monetizationService.canAccess(userId, collectionId, 'COLLECTION');
            if (!canAccess) {
                const requirements = await monetizationService.getAccessRequirements(collectionId, 'COLLECTION');
                return res.status(403).json({
                    error: 'Access denied',
                    requirements,
                    message: requirements.type === 'SUBSCRIPTION'
                        ? 'Active subscription required'
                        : requirements.type === 'PREMIUM'
                            ? 'Purchase required'
                            : 'Access denied',
                });
            }
        }
        if (lessonId) {
            const canAccess = await monetizationService.canAccess(userId, lessonId, 'LESSON');
            if (!canAccess) {
                const requirements = await monetizationService.getAccessRequirements(lessonId, 'LESSON');
                return res.status(403).json({
                    error: 'Access denied',
                    requirements,
                    message: requirements.type === 'SUBSCRIPTION'
                        ? 'Active subscription required'
                        : requirements.type === 'PREMIUM'
                            ? 'Purchase required'
                            : 'Access denied',
                });
            }
        }
        next();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}
