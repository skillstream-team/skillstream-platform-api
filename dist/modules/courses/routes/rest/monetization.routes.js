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
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const monetization_service_1 = require("../../services/monetization.service");
const router = (0, express_1.Router)();
const monetizationService = new monetization_service_1.MonetizationService();
/**
 * @swagger
 * /api/collections/:id/monetization:
 *   get:
 *     summary: Get collection monetization requirements
 */
router.get('/collections/:id/monetization', auth_1.requireAuth, async (req, res) => {
    try {
        const requirements = await monetizationService.getAccessRequirements(req.params.id, 'COLLECTION');
        res.json(requirements);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/lessons/:id/monetization:
 *   get:
 *     summary: Get lesson monetization requirements
 */
router.get('/lessons/:id/monetization', auth_1.requireAuth, async (req, res) => {
    try {
        const requirements = await monetizationService.getAccessRequirements(req.params.id, 'LESSON');
        res.json(requirements);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/collections/:id/monetization:
 *   put:
 *     summary: Update collection monetization type (teacher/admin)
 */
router.put('/collections/:id/monetization', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const { monetizationType, subscriptionTier } = req.body;
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../../../utils/prisma')));
        if (!['FREE', 'SUBSCRIPTION', 'PREMIUM'].includes(monetizationType)) {
            return res.status(400).json({ error: 'Invalid monetization type' });
        }
        const collection = await prisma.collection.update({
            where: { id: req.params.id },
            data: {
                monetizationType,
                subscriptionTier: subscriptionTier || null,
            },
        });
        res.json(collection);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/lessons/:id/monetization:
 *   put:
 *     summary: Update lesson monetization type (teacher/admin)
 */
router.put('/lessons/:id/monetization', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const { monetizationType } = req.body;
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../../../utils/prisma')));
        if (!['FREE', 'SUBSCRIPTION', 'PREMIUM'].includes(monetizationType)) {
            return res.status(400).json({ error: 'Invalid monetization type' });
        }
        const lesson = await prisma.lesson.update({
            where: { id: req.params.id },
            data: { monetizationType },
        });
        res.json(lesson);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/content/:type/:id/access:
 *   get:
 *     summary: Check if current user can access content
 */
router.get('/content/:type/:id/access', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { type, id } = req.params;
        if (!['COLLECTION', 'LESSON'].includes(type)) {
            return res.status(400).json({ error: 'Invalid content type' });
        }
        const canAccess = await monetizationService.canAccess(userId, id, type);
        res.json({ canAccess });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
