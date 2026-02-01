"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalsService = void 0;
const prisma_1 = require("../../../utils/prisma");
class GoalsService {
    async getGoals(userId) {
        return prisma_1.prisma.studyGoal.findMany({
            where: { userId },
            orderBy: [{ completed: 'asc' }, { endDate: 'asc' }],
        });
    }
    async getGoal(id, userId) {
        return prisma_1.prisma.studyGoal.findFirst({
            where: { id, userId },
        });
    }
    async createGoal(userId, data) {
        return prisma_1.prisma.studyGoal.create({
            data: {
                userId,
                title: data.title,
                type: data.type,
                target: data.target,
                period: data.period,
                endDate: data.endDate,
                categoryId: data.categoryId,
            },
        });
    }
    async updateGoal(id, userId, data) {
        await prisma_1.prisma.studyGoal.findFirstOrThrow({ where: { id, userId } });
        return prisma_1.prisma.studyGoal.update({
            where: { id },
            data: {
                ...(data.title != null && { title: data.title }),
                ...(data.type != null && { type: data.type }),
                ...(data.target != null && { target: data.target }),
                ...(data.current != null && { current: data.current }),
                ...(data.period != null && { period: data.period }),
                ...(data.endDate != null && { endDate: data.endDate }),
                ...(data.completed != null && { completed: data.completed }),
                ...(data.categoryId != null && { categoryId: data.categoryId }),
            },
        });
    }
    async deleteGoal(id, userId) {
        await prisma_1.prisma.studyGoal.findFirstOrThrow({ where: { id, userId } });
        return prisma_1.prisma.studyGoal.delete({ where: { id } });
    }
    /** Used by recommendation service and comms: get active (incomplete) goals for a user */
    async getActiveGoalsForUser(userId) {
        return prisma_1.prisma.studyGoal.findMany({
            where: { userId, completed: false, endDate: { gte: new Date() } },
            orderBy: { endDate: 'asc' },
        });
    }
    /** Update current progress for a goal (e.g. after enrollment or progress sync) */
    async updateGoalProgress(userId, type, delta) {
        const goals = await prisma_1.prisma.studyGoal.findMany({
            where: { userId, type, completed: false },
        });
        for (const goal of goals) {
            const newCurrent = Math.min(goal.current + delta, goal.target);
            const completed = newCurrent >= goal.target;
            await prisma_1.prisma.studyGoal.update({
                where: { id: goal.id },
                data: { current: newCurrent, completed },
            });
        }
    }
}
exports.GoalsService = GoalsService;
