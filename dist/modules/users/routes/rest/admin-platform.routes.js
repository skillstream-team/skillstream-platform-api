"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Admin Platform Routes - Comprehensive admin management endpoints
const express_1 = require("express");
const admin_platform_service_1 = require("../../services/admin-platform.service");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const adminPlatformService = new admin_platform_service_1.AdminPlatformService();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    next();
};
// ============================================================
// EMAIL TEMPLATES MANAGEMENT
// ============================================================
/**
 * GET /api/admin/email-templates
 * Get all email templates
 */
router.get('/admin/email-templates', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.getAllEmailTemplates();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/admin/email-templates/:id
 * Get single email template
 */
router.get('/admin/email-templates/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.getEmailTemplate(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
/**
 * POST /api/admin/email-templates
 * Create email template
 */
const createEmailTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    subject: zod_1.z.string().min(1),
    body: zod_1.z.string().min(1),
    variables: zod_1.z.array(zod_1.z.string()),
    type: zod_1.z.string().min(1),
    isActive: zod_1.z.boolean().optional(),
});
router.post('/admin/email-templates', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: createEmailTemplateSchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.createEmailTemplate(req.body);
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * PUT /api/admin/email-templates/:id
 * Update email template
 */
const updateEmailTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    subject: zod_1.z.string().optional(),
    body: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
});
router.put('/admin/email-templates/:id', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: updateEmailTemplateSchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.updateEmailTemplate(req.params.id, req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * DELETE /api/admin/email-templates/:id
 * Delete email template
 */
router.delete('/admin/email-templates/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.deleteEmailTemplate(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/admin/email-templates/:id/test
 * Test email template
 */
const testEmailTemplateSchema = zod_1.z.object({
    testEmail: zod_1.z.string().email(),
    variables: zod_1.z.record(zod_1.z.string()),
});
router.post('/admin/email-templates/:id/test', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: testEmailTemplateSchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.testEmailTemplate(req.params.id, req.body.testEmail, req.body.variables);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// ============================================================
// QUIZZES MANAGEMENT
// ============================================================
/**
 * GET /api/admin/quizzes
 * Get all quizzes
 */
router.get('/admin/quizzes', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const search = req.query.search;
        const courseId = req.query.courseId;
        const status = req.query.status;
        const result = await adminPlatformService.getAllQuizzes({ page, limit, search, courseId, status });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/admin/quizzes/:id
 * Get single quiz
 */
router.get('/admin/quizzes/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.getQuiz(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
/**
 * PUT /api/admin/quizzes/:id
 * Update quiz
 */
const updateQuizSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
    settings: zod_1.z.any().optional(),
});
router.put('/admin/quizzes/:id', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: updateQuizSchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.updateQuiz(req.params.id, req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * DELETE /api/admin/quizzes/:id
 * Delete quiz
 */
router.delete('/admin/quizzes/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.deleteQuiz(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// ============================================================
// FORUMS MANAGEMENT
// ============================================================
/**
 * GET /api/admin/forums
 * Get all forum posts
 */
router.get('/admin/forums', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const search = req.query.search;
        const status = req.query.status;
        const courseId = req.query.courseId;
        const result = await adminPlatformService.getAllForumPosts({ page, limit, search, status, courseId });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/admin/forums/:id
 * Get single forum post
 */
router.get('/admin/forums/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.getForumPost(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
/**
 * PUT /api/admin/forums/:id
 * Moderate forum post
 */
const moderateForumPostSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'HIDDEN', 'DELETED']).optional(),
    isPinned: zod_1.z.boolean().optional(),
    isLocked: zod_1.z.boolean().optional(),
    moderationReason: zod_1.z.string().optional(),
});
router.put('/admin/forums/:id', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: moderateForumPostSchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.moderateForumPost(req.params.id, req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * DELETE /api/admin/forums/:id
 * Delete forum post
 */
router.delete('/admin/forums/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.deleteForumPost(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// ============================================================
// QA MANAGEMENT
// ============================================================
/**
 * GET /api/admin/qa
 * Get all Q&A
 */
router.get('/admin/qa', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const search = req.query.search;
        const status = req.query.status;
        const courseId = req.query.courseId;
        const result = await adminPlatformService.getAllQA({ page, limit, search, status, courseId });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/admin/qa/:id
 * Get single Q&A
 */
router.get('/admin/qa/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.getQA(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
/**
 * PUT /api/admin/qa/:id
 * Moderate Q&A
 */
const moderateQASchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'HIDDEN', 'DELETED']).optional(),
    moderationReason: zod_1.z.string().optional(),
});
router.put('/admin/qa/:id', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: moderateQASchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.moderateQA(req.params.id, req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * DELETE /api/admin/qa/:id
 * Delete Q&A
 */
router.delete('/admin/qa/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.deleteQA(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// ============================================================
// REFERRALS MANAGEMENT
// ============================================================
/**
 * GET /api/admin/referrals
 * Get referral program settings
 */
router.get('/admin/referrals', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.getReferralSettings();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * PUT /api/admin/referrals
 * Update referral settings
 */
const updateReferralSettingsSchema = zod_1.z.object({
    isEnabled: zod_1.z.boolean().optional(),
    referrerReward: zod_1.z.object({
        type: zod_1.z.enum(['PERCENTAGE', 'FIXED']),
        value: zod_1.z.number(),
    }).optional(),
    refereeReward: zod_1.z.object({
        type: zod_1.z.enum(['PERCENTAGE', 'FIXED']),
        value: zod_1.z.number(),
    }).optional(),
    minPayout: zod_1.z.number().optional(),
    terms: zod_1.z.string().optional(),
});
router.put('/admin/referrals', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: updateReferralSettingsSchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.updateReferralSettings(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * GET /api/admin/referrals/stats
 * Get referral statistics
 */
router.get('/admin/referrals/stats', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const result = await adminPlatformService.getReferralStats({ startDate, endDate });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ============================================================
// BUNDLES MANAGEMENT
// ============================================================
/**
 * GET /api/admin/bundles
 * Get all bundles
 */
router.get('/admin/bundles', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const search = req.query.search;
        const result = await adminPlatformService.getAllBundles({ page, limit, search });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/admin/bundles/:id
 * Get single bundle
 */
router.get('/admin/bundles/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.getBundle(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
/**
 * POST /api/admin/bundles
 * Create bundle
 */
const createBundleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    courseIds: zod_1.z.array(zod_1.z.string()).min(1),
    price: zod_1.z.number(),
    discount: zod_1.z.number().optional(),
    isActive: zod_1.z.boolean().optional(),
});
router.post('/admin/bundles', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: createBundleSchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.createBundle(req.body);
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * PUT /api/admin/bundles/:id
 * Update bundle
 */
const updateBundleSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    courseIds: zod_1.z.array(zod_1.z.string()).optional(),
    price: zod_1.z.number().optional(),
    discount: zod_1.z.number().optional(),
    isActive: zod_1.z.boolean().optional(),
});
router.put('/admin/bundles/:id', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: updateBundleSchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.updateBundle(req.params.id, req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * DELETE /api/admin/bundles/:id
 * Delete bundle
 */
router.delete('/admin/bundles/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.deleteBundle(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// ============================================================
// CERTIFICATE TEMPLATES MANAGEMENT
// ============================================================
/**
 * GET /api/admin/certificate-templates
 * Get all certificate templates
 */
router.get('/admin/certificate-templates', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.getAllCertificateTemplates();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/admin/certificate-templates/:id
 * Get single certificate template
 */
router.get('/admin/certificate-templates/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.getCertificateTemplate(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
/**
 * POST /api/admin/certificate-templates
 * Create certificate template
 */
const createCertificateTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    template: zod_1.z.string().min(1),
    variables: zod_1.z.array(zod_1.z.string()),
});
router.post('/admin/certificate-templates', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: createCertificateTemplateSchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.createCertificateTemplate(req.body);
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * PUT /api/admin/certificate-templates/:id
 * Update certificate template
 */
const updateCertificateTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    template: zod_1.z.string().optional(),
    variables: zod_1.z.array(zod_1.z.string()).optional(),
});
router.put('/admin/certificate-templates/:id', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: updateCertificateTemplateSchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.updateCertificateTemplate(req.params.id, req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * DELETE /api/admin/certificate-templates/:id
 * Delete certificate template
 */
router.delete('/admin/certificate-templates/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.deleteCertificateTemplate(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// ============================================================
// WHITEBOARDS MANAGEMENT
// ============================================================
/**
 * GET /api/admin/whiteboards
 * Get all whiteboards
 */
router.get('/admin/whiteboards', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const search = req.query.search;
        const result = await adminPlatformService.getAllWhiteboards({ page, limit, search });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * DELETE /api/admin/whiteboards/:id
 * Delete whiteboard
 */
router.delete('/admin/whiteboards/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.deleteWhiteboard(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// ============================================================
// BANNERS MANAGEMENT
// ============================================================
/**
 * GET /api/admin/banners
 * Get all banners
 */
router.get('/admin/banners', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.getAllBanners();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/admin/banners/:id
 * Get single banner
 */
router.get('/admin/banners/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.getBanner(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
/**
 * POST /api/admin/banners
 * Create banner
 */
const createBannerSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    image: zod_1.z.string().url().optional(),
    link: zod_1.z.string().url().optional(),
    position: zod_1.z.enum(['TOP', 'SIDEBAR', 'BOTTOM']),
    isActive: zod_1.z.boolean().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    targetAudience: zod_1.z.enum(['ALL', 'STUDENTS', 'TEACHERS']).optional(),
});
router.post('/admin/banners', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: createBannerSchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.createBanner(req.body);
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * PUT /api/admin/banners/:id
 * Update banner
 */
const updateBannerSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    link: zod_1.z.string().url().optional(),
    position: zod_1.z.enum(['TOP', 'SIDEBAR', 'BOTTOM']).optional(),
    isActive: zod_1.z.boolean().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    targetAudience: zod_1.z.enum(['ALL', 'STUDENTS', 'TEACHERS']).optional(),
});
router.put('/admin/banners/:id', auth_1.requireAuth, requireAdmin, (0, validation_1.validate)({ body: updateBannerSchema }), async (req, res) => {
    try {
        const result = await adminPlatformService.updateBanner(req.params.id, req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * DELETE /api/admin/banners/:id
 * Delete banner
 */
router.delete('/admin/banners/:id', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await adminPlatformService.deleteBanner(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;
