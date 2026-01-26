import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { prisma } from '../../../../utils/prisma';
import { logger } from '../../../../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: Get announcements (global or filtered)
 *     tags: [Announcements]
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [global, course, user]
 *         description: Scope of announcements
 *       - in: query
 *         name: collectionId
 *         schema:
 *           type: string
 *         description: Collection ID for collection-scoped announcements
 *     responses:
 *       200:
 *         description: Announcements retrieved successfully
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { scope = 'global', collectionId } = req.query;
    const userId = (req as any).user?.id;

    const where: any = {
      isActive: true,
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      ]
    };

    if (scope === 'global') {
      where.scope = 'global';
    } else if (scope === 'course' && collectionId) {
      where.scope = 'course';
      where.collectionId = collectionId;
    } else if (scope === 'user' && userId) {
      const collectionIds = await getUserCollectionIds(userId);
      where.AND.push({
        OR: [
          { scope: 'global' },
          { scope: 'user', targetUserId: userId },
          { scope: 'course', collectionId: { in: collectionIds } }
        ]
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
      where,
        skip,
        take: limit,
      include: {
        creator: {
          select: { id: true, username: true, email: true }
        },
        collection: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
      }),
      prisma.announcement.count({ where }),
    ]);

    res.json({
      success: true,
      data: announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    logger.error('Error fetching announcements', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

/**
 * @swagger
 * /api/users/{userId}/announcements:
 *   get:
 *     summary: Get announcements relevant to a user
 *     tags: [Announcements]
 */
router.get('/users/:userId/announcements', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's enrolled collection IDs
    const collectionIds = await getUserCollectionIds(userId);

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const where = {
        isActive: true,
        AND: [
          {
            OR: [
              { scope: 'global' },
              { scope: 'user', targetUserId: userId },
              { scope: 'course', collectionId: { in: collectionIds } }
            ]
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        ]
    };

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
      include: {
        creator: {
          select: { id: true, username: true, email: true }
        },
        collection: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
      }),
      prisma.announcement.count({ where }),
    ]);

    res.json({
      success: true,
      data: announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    logger.error('Error fetching user announcements', error);
    res.status(500).json({ error: 'Failed to fetch user announcements' });
  }
});

/**
 * @swagger
 * /api/collections/{collectionId}/announcements:
 *   get:
 *     summary: Get announcements for a specific collection
 *     tags: [Announcements]
 */
router.get('/collections/:collectionId/announcements', requireAuth, async (req, res) => {
  try {
    const { collectionId } = req.params;

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const where = {
        collectionId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
    };

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
      include: {
        creator: {
          select: { id: true, username: true, email: true }
        },
        collection: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
      }),
      prisma.announcement.count({ where }),
    ]);

    res.json({
      success: true,
      data: announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    logger.error('Error fetching collection announcements', error);
    res.status(500).json({ error: 'Failed to fetch collection announcements' });
  }
});

async function getUserCollectionIds(userId: string): Promise<string[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: userId },
    select: { collectionId: true }
  });
  return enrollments.map(e => e.collectionId);
}

export default router;

