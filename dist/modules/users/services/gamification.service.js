"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
// XP points for different activities
const XP_VALUES = {
    course_completed: 100,
    quiz_passed: 50,
    assignment_completed: 75,
    daily_login: 10,
    streak_bonus: 5, // Per day in streak
    review_posted: 25,
    forum_post: 15,
    forum_reply: 10,
    helpful_review: 5,
};
// XP required per level (exponential)
function getXPForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}
class GamificationService {
    /**
     * Award points to a user
     */
    async awardPoints(data) {
        // Get or create user points
        let userPoints = await prisma_1.prisma.userPoints.findUnique({
            where: { userId: data.userId },
        });
        if (!userPoints) {
            userPoints = await prisma_1.prisma.userPoints.create({
                data: {
                    userId: data.userId,
                    totalPoints: 0,
                    currentLevel: 1,
                    currentXP: 0,
                    xpToNextLevel: getXPForLevel(2),
                },
            });
        }
        // Update points
        const newTotalPoints = userPoints.totalPoints + data.points;
        const newXP = userPoints.currentXP + data.xp;
        // Check for level up
        let newLevel = userPoints.currentLevel;
        let remainingXP = newXP;
        let xpToNextLevel = userPoints.xpToNextLevel;
        while (remainingXP >= xpToNextLevel) {
            remainingXP -= xpToNextLevel;
            newLevel++;
            xpToNextLevel = getXPForLevel(newLevel + 1);
            // Record level achievement
            await prisma_1.prisma.userLevel.create({
                data: {
                    userId: data.userId,
                    level: newLevel,
                    xpEarned: newXP,
                },
            });
        }
        // Update user points
        const updated = await prisma_1.prisma.userPoints.update({
            where: { userId: data.userId },
            data: {
                totalPoints: newTotalPoints,
                currentLevel: newLevel,
                currentXP: remainingXP,
                xpToNextLevel,
            },
        });
        // Check for badge achievements
        await this.checkBadgeAchievements(data.userId, data.reason, data.metadata);
        // Update leaderboards
        await this.updateLeaderboards(data.userId, newTotalPoints, newLevel);
        await (0, cache_1.deleteCache)(`user:${data.userId}`);
        return this.getUserGamification(data.userId);
    }
    /**
     * Record daily login and update streak
     */
    async recordLogin(userId) {
        let streak = await prisma_1.prisma.loginStreak.findUnique({
            where: { userId },
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!streak) {
            streak = await prisma_1.prisma.loginStreak.create({
                data: {
                    userId,
                    currentStreak: 1,
                    longestStreak: 1,
                    lastLoginDate: today,
                },
            });
            // Award points for login
            await this.awardPoints({
                userId,
                points: XP_VALUES.daily_login,
                xp: XP_VALUES.daily_login,
                reason: 'daily_login',
            });
            return { streak: 1, points: XP_VALUES.daily_login };
        }
        const lastLogin = streak.lastLoginDate
            ? new Date(streak.lastLoginDate)
            : null;
        lastLogin?.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        let newStreak = streak.currentStreak;
        let points = XP_VALUES.daily_login;
        if (!lastLogin || lastLogin.getTime() === today.getTime()) {
            // Already logged in today
            return { streak: streak.currentStreak, points: 0 };
        }
        else if (lastLogin && lastLogin.getTime() === yesterday.getTime()) {
            // Consecutive day
            newStreak = streak.currentStreak + 1;
            points += newStreak * XP_VALUES.streak_bonus;
        }
        else {
            // Streak broken, reset
            newStreak = 1;
        }
        const longestStreak = Math.max(newStreak, streak.longestStreak);
        await prisma_1.prisma.loginStreak.update({
            where: { userId },
            data: {
                currentStreak: newStreak,
                longestStreak,
                lastLoginDate: today,
            },
        });
        // Award points
        await this.awardPoints({
            userId,
            points,
            xp: points,
            reason: 'daily_login',
            metadata: { streak: newStreak },
        });
        return { streak: newStreak, points };
    }
    /**
     * Get user gamification data
     */
    async getUserGamification(userId) {
        const [userPoints, streak, badges] = await Promise.all([
            prisma_1.prisma.userPoints.findUnique({
                where: { userId },
            }),
            prisma_1.prisma.loginStreak.findUnique({
                where: { userId },
            }),
            prisma_1.prisma.earnedBadge.findMany({
                where: { userId },
                include: {
                    badge: true,
                },
                orderBy: { earnedAt: 'desc' },
            }),
        ]);
        if (!userPoints) {
            // Create default
            const newPoints = await prisma_1.prisma.userPoints.create({
                data: {
                    userId,
                    totalPoints: 0,
                    currentLevel: 1,
                    currentXP: 0,
                    xpToNextLevel: getXPForLevel(2),
                },
            });
            return {
                totalPoints: 0,
                currentLevel: 1,
                currentXP: 0,
                xpToNextLevel: getXPForLevel(2),
                loginStreak: 0,
                longestStreak: 0,
                badges: [],
            };
        }
        return {
            totalPoints: userPoints.totalPoints,
            currentLevel: userPoints.currentLevel,
            currentXP: userPoints.currentXP,
            xpToNextLevel: userPoints.xpToNextLevel,
            loginStreak: streak?.currentStreak || 0,
            longestStreak: streak?.longestStreak || 0,
            badges: badges.map((eb) => ({
                id: eb.badge.id,
                name: eb.badge.name,
                description: eb.badge.description,
                icon: eb.badge.icon || undefined,
                category: eb.badge.category,
                rarity: eb.badge.rarity,
                earnedAt: eb.earnedAt,
            })),
        };
    }
    /**
     * Get leaderboard
     */
    async getLeaderboard(period = 'all_time', courseId, limit = 100) {
        const now = new Date();
        let periodStart;
        let periodEnd = null;
        switch (period) {
            case 'daily':
                periodStart = new Date(now);
                periodStart.setHours(0, 0, 0, 0);
                periodEnd = new Date(periodStart);
                periodEnd.setDate(periodEnd.getDate() + 1);
                break;
            case 'weekly':
                periodStart = new Date(now);
                periodStart.setDate(periodStart.getDate() - periodStart.getDay());
                periodStart.setHours(0, 0, 0, 0);
                periodEnd = new Date(periodStart);
                periodEnd.setDate(periodEnd.getDate() + 7);
                break;
            case 'monthly':
                periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                break;
            default:
                periodStart = new Date(0);
                periodEnd = null;
        }
        const where = {
            period,
            periodStart: period === 'all_time' ? undefined : { gte: periodStart },
        };
        if (periodEnd) {
            where.periodEnd = { lte: periodEnd };
        }
        if (courseId) {
            where.courseId = courseId;
        }
        const entries = await prisma_1.prisma.leaderboardEntry.findMany({
            where,
            take: limit,
            orderBy: [
                { points: 'desc' },
                { rank: 'asc' },
            ],
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        return entries.map((e) => ({
            userId: e.userId,
            user: e.user,
            points: e.points,
            rank: e.rank,
            level: 1, // Would need to join with UserPoints
        }));
    }
    /**
     * Check and award badges
     */
    async checkBadgeAchievements(userId, reason, metadata) {
        const userPoints = await prisma_1.prisma.userPoints.findUnique({
            where: { userId },
        });
        if (!userPoints)
            return;
        // Get all badges
        const badges = await prisma_1.prisma.badge.findMany();
        for (const badge of badges) {
            // Check if already earned
            const earned = await prisma_1.prisma.earnedBadge.findFirst({
                where: {
                    userId,
                    badgeId: badge.id,
                },
            });
            if (earned)
                continue;
            // Check criteria (simplified - would need more complex logic)
            let shouldAward = false;
            if (badge.criteria) {
                const criteria = badge.criteria;
                switch (badge.name.toLowerCase()) {
                    case 'first course':
                        if (reason === 'course_completed')
                            shouldAward = true;
                        break;
                    case 'quiz master':
                        if (reason === 'quiz_passed' && (metadata?.quizCount || 0) >= 10)
                            shouldAward = true;
                        break;
                    case 'social butterfly':
                        if (reason === 'forum_post' ||
                            reason === 'forum_reply' ||
                            reason === 'review_posted')
                            shouldAward = true;
                        break;
                    case 'dedicated learner':
                        if (userPoints.currentLevel >= 10)
                            shouldAward = true;
                        break;
                    // Add more badge logic
                }
            }
            if (shouldAward) {
                await prisma_1.prisma.earnedBadge.create({
                    data: {
                        userId,
                        badgeId: badge.id,
                    },
                });
                // Award badge points
                await this.awardPoints({
                    userId,
                    points: badge.points,
                    xp: badge.points,
                    reason: 'badge_earned',
                    metadata: { badgeId: badge.id },
                });
            }
        }
    }
    /**
     * Update leaderboards
     */
    async updateLeaderboards(userId, points, level) {
        const periods = [
            'daily',
            'weekly',
            'monthly',
            'all_time',
        ];
        const now = new Date();
        for (const period of periods) {
            let periodStart;
            let periodEnd = null;
            switch (period) {
                case 'daily':
                    periodStart = new Date(now);
                    periodStart.setHours(0, 0, 0, 0);
                    periodEnd = new Date(periodStart);
                    periodEnd.setDate(periodEnd.getDate() + 1);
                    break;
                case 'weekly':
                    periodStart = new Date(now);
                    periodStart.setDate(periodStart.getDate() - periodStart.getDay());
                    periodStart.setHours(0, 0, 0, 0);
                    periodEnd = new Date(periodStart);
                    periodEnd.setDate(periodEnd.getDate() + 7);
                    break;
                case 'monthly':
                    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    break;
                default:
                    periodStart = new Date(0);
                    periodEnd = null;
            }
            // Get or create entry
            const existing = await prisma_1.prisma.leaderboardEntry.findFirst({
                where: {
                    userId,
                    period,
                    periodStart,
                },
            });
            if (existing) {
                await prisma_1.prisma.leaderboardEntry.update({
                    where: { id: existing.id },
                    data: {
                        points,
                        periodEnd,
                    },
                });
            }
            else {
                await prisma_1.prisma.leaderboardEntry.create({
                    data: {
                        userId,
                        period,
                        points,
                        rank: 0, // Will be recalculated
                        periodStart,
                        periodEnd,
                    },
                });
            }
        }
        // Recalculate ranks for all periods
        await this.recalculateLeaderboardRanks();
    }
    /**
     * Recalculate leaderboard ranks
     */
    async recalculateLeaderboardRanks() {
        const periods = [
            'daily',
            'weekly',
            'monthly',
            'all_time',
        ];
        for (const period of periods) {
            const entries = await prisma_1.prisma.leaderboardEntry.findMany({
                where: { period },
                orderBy: { points: 'desc' },
            });
            for (let i = 0; i < entries.length; i++) {
                await prisma_1.prisma.leaderboardEntry.update({
                    where: { id: entries[i].id },
                    data: { rank: i + 1 },
                });
            }
        }
    }
}
exports.GamificationService = GamificationService;
