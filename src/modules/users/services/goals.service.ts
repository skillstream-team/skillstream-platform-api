import { prisma } from '../../../utils/prisma';

export interface CreateStudyGoalInput {
  title: string;
  type: 'hours' | 'programs' | 'modules';
  target: number;
  period: 'daily' | 'weekly' | 'monthly';
  endDate: Date;
  categoryId?: string;
}

export interface UpdateStudyGoalInput {
  title?: string;
  type?: 'hours' | 'programs' | 'modules';
  target?: number;
  current?: number;
  period?: 'daily' | 'weekly' | 'monthly';
  endDate?: Date;
  completed?: boolean;
  categoryId?: string;
}

export class GoalsService {
  async getGoals(userId: string) {
    return prisma.studyGoal.findMany({
      where: { userId },
      orderBy: [{ completed: 'asc' }, { endDate: 'asc' }],
    });
  }

  async getGoal(id: string, userId: string) {
    return prisma.studyGoal.findFirst({
      where: { id, userId },
    });
  }

  async createGoal(userId: string, data: CreateStudyGoalInput) {
    return prisma.studyGoal.create({
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

  async updateGoal(id: string, userId: string, data: UpdateStudyGoalInput) {
    await prisma.studyGoal.findFirstOrThrow({ where: { id, userId } });
    return prisma.studyGoal.update({
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

  async deleteGoal(id: string, userId: string) {
    await prisma.studyGoal.findFirstOrThrow({ where: { id, userId } });
    return prisma.studyGoal.delete({ where: { id } });
  }

  /** Used by recommendation service and comms: get active (incomplete) goals for a user */
  async getActiveGoalsForUser(userId: string) {
    return prisma.studyGoal.findMany({
      where: { userId, completed: false, endDate: { gte: new Date() } },
      orderBy: { endDate: 'asc' },
    });
  }

  /** Update current progress for a goal (e.g. after enrollment or progress sync) */
  async updateGoalProgress(userId: string, type: 'hours' | 'programs' | 'modules', delta: number) {
    const goals = await prisma.studyGoal.findMany({
      where: { userId, type, completed: false },
    });
    for (const goal of goals) {
      const newCurrent = Math.min(goal.current + delta, goal.target);
      const completed = newCurrent >= goal.target;
      await prisma.studyGoal.update({
        where: { id: goal.id },
        data: { current: newCurrent, completed },
      });
    }
  }
}
