import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { ReferralService } from '../../services/referral.service';

const router = Router();
const referralService = new ReferralService();

/**
 * @swagger
 * /api/referrals/code:
 *   get:
 *     summary: Get user's referral code
 *     description: Returns the referral code for the authenticated user
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral code retrieved successfully
 */
router.get('/code', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const code = await referralService.generateReferralCode(userId);
    res.json({ code });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/referrals/apply:
 *   post:
 *     summary: Apply referral code
 *     description: Applies a referral code when a new user signs up
 *     tags: [Referrals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, userId]
 *             properties:
 *               code:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Referral code applied successfully
 *       400:
 *         description: Invalid referral code
 */
router.post('/apply', async (req, res) => {
  try {
    const { code, userId } = req.body;
    const referral = await referralService.applyReferralCode(code, userId);
    res.json(referral);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/referrals/stats:
 *   get:
 *     summary: Get referral statistics
 *     description: Returns referral statistics for the authenticated user
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const stats = await referralService.getReferralStats(userId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
