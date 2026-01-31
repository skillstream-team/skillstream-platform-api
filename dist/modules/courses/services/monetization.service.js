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
        // Support both new and old content types for backward compatibility
        if (contentType === 'PROGRAM') {
            const program = await prisma_1.prisma.program.findUnique({
                where: { id: contentId },
                select: {
                    monetizationType: true,
                    price: true,
                },
            });
            if (!program) {
                throw new Error('Program not found');
            }
            return {
                type: program.monetizationType,
                price: program.monetizationType === 'PREMIUM' ? program.price : undefined,
            };
        }
        else if (contentType === 'MODULE') {
            const module = await prisma_1.prisma.module.findUnique({
                where: { id: contentId },
                select: {
                    monetizationType: true,
                    price: true,
                },
            });
            if (!module) {
                throw new Error('Module not found');
            }
            return {
                type: module.monetizationType,
                price: module.monetizationType === 'PREMIUM' ? module.price : undefined,
            };
        }
        throw new Error('Invalid content type');
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
            if (contentType === 'PROGRAM') {
                const enrollment = await prisma_1.prisma.enrollment.findUnique({
                    where: {
                        programId_studentId: {
                            programId: contentId,
                            studentId,
                        },
                    },
                });
                return !!enrollment;
            }
            else if (contentType === 'MODULE') {
                // For standalone modules, check if there's a payment
                const payment = await prisma_1.prisma.payment.findFirst({
                    where: {
                        studentId,
                        moduleId: contentId,
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
