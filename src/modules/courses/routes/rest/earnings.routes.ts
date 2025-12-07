import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { prisma } from '../../../../utils/prisma';

const router = Router();

/**
 * @swagger
 * /api/users/{userId}/earnings-report:
 *   get:
 *     summary: Get earnings report for a teacher
 *     tags: [Earnings]
 */
router.get('/users/:userId/earnings-report', requireAuth, requireRole('Teacher'), async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user?.id;

    if (userId !== currentUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get all payments for courses taught by this teacher
    const tutorCourses = await prisma.course.findMany({
      where: { instructorId: userId },
      select: { id: true }
    });
    const courseIds = tutorCourses.map(c => c.id);

    // Current month earnings
    const currentMonthPayments = await prisma.payment.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth }
      }
    });

    // Previous month earnings
    const previousMonthPayments = await prisma.payment.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'COMPLETED',
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
      }
    });

    // Year to date earnings
    const yearToDatePayments = await prisma.payment.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'COMPLETED',
        createdAt: { gte: startOfYear }
      }
    });

    // Lifetime earnings
    const lifetimePayments = await prisma.payment.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'COMPLETED'
      }
    });

    // Calculate totals (assuming 80% teacher share, adjust as needed)
    const tutorShare = 0.8;
    const calculateTotal = (payments: any[]) => 
      payments.reduce((sum, p) => sum + (p.amount * tutorShare), 0);

    const currentMonth = calculateTotal(currentMonthPayments);
    const previousMonth = calculateTotal(previousMonthPayments);
    const yearToDate = calculateTotal(yearToDatePayments);
    const lifetime = calculateTotal(lifetimePayments);

    // Get courses with earnings
    const courses = await prisma.course.findMany({
      where: { instructorId: userId },
      include: {
        payments: {
          where: { status: 'COMPLETED' }
        },
        enrollments: true
      }
    });

    // Monthly trends (last 12 months)
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthPayments = await prisma.payment.findMany({
        where: {
          courseId: { in: courseIds },
          status: 'COMPLETED',
          createdAt: { gte: monthStart, lte: monthEnd }
        }
      });

      monthlyTrends.push({
        month: monthStart.toISOString().substring(0, 7),
        earnings: calculateTotal(monthPayments),
        enrollments: monthPayments.length
      });
    }

    // Get transactions
    const transactions = await prisma.payment.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'COMPLETED'
      },
      include: {
        course: {
          select: { id: true, title: true }
        },
        student: {
          select: { id: true, username: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      success: true,
      data: {
        currentMonth,
        previousMonth,
        yearToDate,
        lifetime,
        tutorShare,
        courses: courses.map(c => ({
          id: c.id,
          title: c.title,
          totalEarnings: calculateTotal(c.payments),
          totalEnrollments: c.enrollments.length
        })),
        transactions: transactions.map(t => ({
          ...t,
          tutorEarnings: t.amount * tutorShare
        })),
        monthlyTrends,
        pendingPayoutRequests: [] // Implement payout requests if needed
      }
    });
  } catch (error) {
    console.error('Error fetching earnings report:', error);
    res.status(500).json({ error: 'Failed to fetch earnings report' });
  }
});

export default router;

