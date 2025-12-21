import { Router } from 'express';
import { requireAuth, requireRole } from '../../../../middleware/auth';
import { CouponsService } from '../../services/coupons.service';

const router = Router();
const couponsService = new CouponsService();

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: Get all coupons
 *     description: Returns list of all active coupons (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupons retrieved successfully
 */
router.get('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const coupons = await couponsService.getAllCoupons(includeInactive);
    res.json({ data: coupons });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/coupons/{code}:
 *   get:
 *     summary: Get coupon by code
 *     description: Returns coupon information by code
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon retrieved successfully
 *       404:
 *         description: Coupon not found
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const coupon = await couponsService.getCouponByCode(code);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/coupons:
 *   post:
 *     summary: Create a coupon (Admin only)
 *     description: Creates a new discount coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, type, value, applicableTo]
 *             properties:
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *               value:
 *                 type: number
 *               minPurchase:
 *                 type: number
 *               maxDiscount:
 *                 type: number
 *               usageLimit:
 *                 type: integer
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               applicableTo:
 *                 type: string
 *                 enum: [ALL, COURSE, BUNDLE, SUBSCRIPTION]
 *               courseId:
 *                 type: string
 *               bundleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Coupon created successfully
 */
router.post('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const coupon = await couponsService.createCoupon(req.body);
    res.status(201).json(coupon);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/coupons/apply:
 *   post:
 *     summary: Apply coupon to purchase
 *     description: Validates and applies a coupon code to a purchase
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, amount, applicableTo]
 *             properties:
 *               code:
 *                 type: string
 *               amount:
 *                 type: number
 *               applicableTo:
 *                 type: string
 *                 enum: [COURSE, BUNDLE, SUBSCRIPTION]
 *               courseId:
 *                 type: string
 *               bundleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coupon applied successfully
 *       400:
 *         description: Invalid coupon or cannot be applied
 */
router.post('/apply', requireAuth, async (req, res) => {
  try {
    const { code, amount, applicableTo, courseId, bundleId } = req.body;
    const userId = (req as any).user.id;

    const result = await couponsService.applyCoupon(
      code,
      userId,
      amount,
      applicableTo,
      courseId,
      bundleId
    );

    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
