"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonetizationService = void 0;
const prisma_1 = require("../../../utils/prisma");
class MonetizationService {
    /**
     * Get content access requirements
     */
    async getAccessRequirements(contentId, contentType) {
        if (contentType === 'COLLECTION') {
            const collection = await prisma_1.prisma.collection.findUnique({
                where: { id: contentId },
                select: {
                    monetizationType: true,
                    price: true,
                },
            });
            if (!collection) {
                throw new Error('Collection not found');
            }
            return {
                type: collection.monetizationType,
                price: collection.monetizationType === 'PREMIUM' ? collection.price : undefined,
            };
        }
        else {
            const lesson = await prisma_1.prisma.lesson.findUnique({
                where: { id: contentId },
                select: {
                    monetizationType: true,
                    price: true,
                },
            });
            if (!lesson) {
                throw new Error('Lesson not found');
            }
            return {
                type: lesson.monetizationType,
                price: lesson.monetizationType === 'PREMIUM' ? lesson.price : undefined,
            };
        }
    }
    /**
     * Check if student can access content
     */
    async canAccess(studentId, contentId, contentType) {
        // Get access requirements
        const requirements = await this.getAccessRequirements(contentId, contentType);
        // FREE content is always accessible
        if (requirements.type === 'FREE') {
            return true;
        }
        // SUBSCRIPTION content - check subscription access
        if (requirements.type === 'SUBSCRIPTION') {
            const { SubscriptionAccessService } = await Promise.resolve().then(() => __importStar(require('../../subscriptions/services/subscription-access.service')));
            const accessService = new SubscriptionAccessService();
            return accessService.hasAccess(studentId, contentId, contentType);
        }
        // PREMIUM content - check enrollment or payment
        if (requirements.type === 'PREMIUM') {
            if (contentType === 'COLLECTION') {
                const enrollment = await prisma_1.prisma.enrollment.findUnique({
                    where: {
                        collectionId_studentId: {
                            collectionId: contentId,
                            studentId,
                        },
                    },
                });
                return !!enrollment;
            }
            else {
                // For standalone lessons, check if there's a payment
                const payment = await prisma_1.prisma.payment.findFirst({
                    where: {
                        studentId,
                        lessonId: contentId,
                        status: 'COMPLETED',
                    },
                });
                return !!payment;
            }
        }
        return false;
    }
}
exports.MonetizationService = MonetizationService;
