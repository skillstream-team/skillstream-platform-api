// Admin Platform Routes - Comprehensive admin management endpoints
import { Router } from 'express';
import { AdminPlatformService } from '../../services/admin-platform.service';
import { requireAuth } from '../../../../middleware/auth';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';
import multer from 'multer';

const router = Router();
const adminPlatformService = new AdminPlatformService();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to check admin role
const requireAdmin = (req: any, res: any, next: any) => {
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
router.get('/admin/email-templates', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.getAllEmailTemplates();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/admin/email-templates/:id
 * Get single email template
 */
router.get('/admin/email-templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.getEmailTemplate(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/admin/email-templates
 * Create email template
 */
const createEmailTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  variables: z.array(z.string()),
  type: z.string().min(1),
  isActive: z.boolean().optional(),
});

router.post('/admin/email-templates', requireAuth, requireAdmin, validate({ body: createEmailTemplateSchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.createEmailTemplate(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/admin/email-templates/:id
 * Update email template
 */
const updateEmailTemplateSchema = z.object({
  name: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.put('/admin/email-templates/:id', requireAuth, requireAdmin, validate({ body: updateEmailTemplateSchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.updateEmailTemplate(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/admin/email-templates/:id
 * Delete email template
 */
router.delete('/admin/email-templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.deleteEmailTemplate(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/admin/email-templates/:id/test
 * Test email template
 */
const testEmailTemplateSchema = z.object({
  testEmail: z.string().email(),
  variables: z.record(z.string()),
});

router.post('/admin/email-templates/:id/test', requireAuth, requireAdmin, validate({ body: testEmailTemplateSchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.testEmailTemplate(req.params.id, req.body.testEmail, req.body.variables);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ============================================================
// QUIZZES MANAGEMENT
// ============================================================

/**
 * GET /api/admin/quizzes
 * Get all quizzes
 */
router.get('/admin/quizzes', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const search = req.query.search as string | undefined;
    const courseId = req.query.courseId as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await adminPlatformService.getAllQuizzes({ page, limit, search, courseId, status });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/admin/quizzes/:id
 * Get single quiz
 */
router.get('/admin/quizzes/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.getQuiz(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/admin/quizzes/:id
 * Update quiz
 */
const updateQuizSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  settings: z.any().optional(),
});

router.put('/admin/quizzes/:id', requireAuth, requireAdmin, validate({ body: updateQuizSchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.updateQuiz(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/admin/quizzes/:id
 * Delete quiz
 */
router.delete('/admin/quizzes/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.deleteQuiz(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ============================================================
// FORUMS MANAGEMENT
// ============================================================

/**
 * GET /api/admin/forums
 * Get all forum posts
 */
router.get('/admin/forums', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const courseId = req.query.courseId as string | undefined;

    const result = await adminPlatformService.getAllForumPosts({ page, limit, search, status, courseId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/admin/forums/:id
 * Get single forum post
 */
router.get('/admin/forums/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.getForumPost(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/admin/forums/:id
 * Moderate forum post
 */
const moderateForumPostSchema = z.object({
  status: z.enum(['ACTIVE', 'HIDDEN', 'DELETED']).optional(),
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  moderationReason: z.string().optional(),
});

router.put('/admin/forums/:id', requireAuth, requireAdmin, validate({ body: moderateForumPostSchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.moderateForumPost(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/admin/forums/:id
 * Delete forum post
 */
router.delete('/admin/forums/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.deleteForumPost(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ============================================================
// QA MANAGEMENT
// ============================================================

/**
 * GET /api/admin/qa
 * Get all Q&A
 */
router.get('/admin/qa', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const courseId = req.query.courseId as string | undefined;

    const result = await adminPlatformService.getAllQA({ page, limit, search, status, courseId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/admin/qa/:id
 * Get single Q&A
 */
router.get('/admin/qa/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.getQA(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/admin/qa/:id
 * Moderate Q&A
 */
const moderateQASchema = z.object({
  status: z.enum(['ACTIVE', 'HIDDEN', 'DELETED']).optional(),
  moderationReason: z.string().optional(),
});

router.put('/admin/qa/:id', requireAuth, requireAdmin, validate({ body: moderateQASchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.moderateQA(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/admin/qa/:id
 * Delete Q&A
 */
router.delete('/admin/qa/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.deleteQA(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ============================================================
// REFERRALS MANAGEMENT
// ============================================================

/**
 * GET /api/admin/referrals
 * Get referral program settings
 */
router.get('/admin/referrals', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.getReferralSettings();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/admin/referrals
 * Update referral settings
 */
const updateReferralSettingsSchema = z.object({
  isEnabled: z.boolean().optional(),
  referrerReward: z.object({
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.number(),
  }).optional(),
  refereeReward: z.object({
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.number(),
  }).optional(),
  minPayout: z.number().optional(),
  terms: z.string().optional(),
});

router.put('/admin/referrals', requireAuth, requireAdmin, validate({ body: updateReferralSettingsSchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.updateReferralSettings(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/admin/referrals/stats
 * Get referral statistics
 */
router.get('/admin/referrals/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await adminPlatformService.getReferralStats({ startDate, endDate });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================================
// BUNDLES MANAGEMENT
// ============================================================

/**
 * GET /api/admin/bundles
 * Get all bundles
 */
router.get('/admin/bundles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const search = req.query.search as string | undefined;

    const result = await adminPlatformService.getAllBundles({ page, limit, search });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/admin/bundles/:id
 * Get single bundle
 */
router.get('/admin/bundles/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.getBundle(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/admin/bundles
 * Create bundle
 */
const createBundleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  courseIds: z.array(z.string()).min(1),
  price: z.number(),
  discount: z.number().optional(),
  isActive: z.boolean().optional(),
});

router.post('/admin/bundles', requireAuth, requireAdmin, validate({ body: createBundleSchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.createBundle(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/admin/bundles/:id
 * Update bundle
 */
const updateBundleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  courseIds: z.array(z.string()).optional(),
  price: z.number().optional(),
  discount: z.number().optional(),
  isActive: z.boolean().optional(),
});

router.put('/admin/bundles/:id', requireAuth, requireAdmin, validate({ body: updateBundleSchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.updateBundle(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/admin/bundles/:id
 * Delete bundle
 */
router.delete('/admin/bundles/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.deleteBundle(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ============================================================
// CERTIFICATE TEMPLATES MANAGEMENT
// ============================================================

/**
 * GET /api/admin/certificate-templates
 * Get all certificate templates
 */
router.get('/admin/certificate-templates', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.getAllCertificateTemplates();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/admin/certificate-templates/:id
 * Get single certificate template
 */
router.get('/admin/certificate-templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.getCertificateTemplate(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/admin/certificate-templates
 * Create certificate template
 */
const createCertificateTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  template: z.string().min(1),
  variables: z.array(z.string()),
});

router.post('/admin/certificate-templates', requireAuth, requireAdmin, validate({ body: createCertificateTemplateSchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.createCertificateTemplate(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/admin/certificate-templates/:id
 * Update certificate template
 */
const updateCertificateTemplateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  template: z.string().optional(),
  variables: z.array(z.string()).optional(),
});

router.put('/admin/certificate-templates/:id', requireAuth, requireAdmin, validate({ body: updateCertificateTemplateSchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.updateCertificateTemplate(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/admin/certificate-templates/:id
 * Delete certificate template
 */
router.delete('/admin/certificate-templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.deleteCertificateTemplate(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ============================================================
// WHITEBOARDS MANAGEMENT
// ============================================================

/**
 * GET /api/admin/whiteboards
 * Get all whiteboards
 */
router.get('/admin/whiteboards', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const search = req.query.search as string | undefined;

    const result = await adminPlatformService.getAllWhiteboards({ page, limit, search });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/admin/whiteboards/:id
 * Delete whiteboard
 */
router.delete('/admin/whiteboards/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.deleteWhiteboard(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ============================================================
// BANNERS MANAGEMENT
// ============================================================

/**
 * GET /api/admin/banners
 * Get all banners
 */
router.get('/admin/banners', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.getAllBanners();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/admin/banners/:id
 * Get single banner
 */
router.get('/admin/banners/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.getBanner(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/admin/banners
 * Create banner
 */
const createBannerSchema = z.object({
  title: z.string().min(1),
  image: z.string().url().optional(),
  link: z.string().url().optional(),
  position: z.enum(['TOP', 'SIDEBAR', 'BOTTOM']),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  targetAudience: z.enum(['ALL', 'STUDENTS', 'TEACHERS']).optional(),
});

router.post('/admin/banners', requireAuth, requireAdmin, validate({ body: createBannerSchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.createBanner(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/admin/banners/:id
 * Update banner
 */
const updateBannerSchema = z.object({
  title: z.string().optional(),
  link: z.string().url().optional(),
  position: z.enum(['TOP', 'SIDEBAR', 'BOTTOM']).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  targetAudience: z.enum(['ALL', 'STUDENTS', 'TEACHERS']).optional(),
});

router.put('/admin/banners/:id', requireAuth, requireAdmin, validate({ body: updateBannerSchema }), async (req, res) => {
  try {
    const result = await adminPlatformService.updateBanner(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/admin/banners/:id
 * Delete banner
 */
router.delete('/admin/banners/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminPlatformService.deleteBanner(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;

