import { prisma } from '../../../utils/prisma';

export interface JoinWaitlistDto {
  courseId?: string;
  eventId?: string;
  userId: string;
}

export interface WaitlistEntryDto {
  id: string;
  courseId?: string;
  eventId?: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  position: number;
  notifiedAt?: Date;
  enrolledAt?: Date;
  createdAt: Date;
}

export class WaitlistService {
  /**
   * Join waitlist for a course or event
   */
  async joinWaitlist(data: JoinWaitlistDto): Promise<WaitlistEntryDto> {
    if (!data.courseId && !data.eventId) {
      throw new Error('Either courseId or eventId must be provided');
    }

    // Check if already on waitlist
    const existing = await prisma.waitlistEntry.findFirst({
      where: {
        ...(data.courseId ? { programId: data.courseId } : { eventId: data.eventId }),
        userId: data.userId,
      },
    });

    if (existing) {
      throw new Error('Already on waitlist');
    }

    // Get current position
    const count = await prisma.waitlistEntry.count({
      where: data.courseId ? { programId: data.courseId } : { eventId: data.eventId },
    });

    const entry = await prisma.waitlistEntry.create({
      data: {
        programId: data.courseId,
        eventId: data.eventId,
        userId: data.userId,
        position: count + 1,
      },
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

    return this.mapToDto(entry);
  }

  /**
   * Get waitlist for a course or event
   */
  async getWaitlist(
    courseId?: string,
    eventId?: string
  ): Promise<WaitlistEntryDto[]> {
    if (!courseId && !eventId) {
      throw new Error('Either courseId or eventId must be provided');
    }

    const entries = await prisma.waitlistEntry.findMany({
      where: courseId ? { programId: courseId } : { eventId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    return entries.map(this.mapToDto);
  }

  /**
   * Remove from waitlist
   */
  async leaveWaitlist(
    courseId: string | null,
    eventId: string | null,
    userId: string
  ): Promise<void> {
    const where: any = { userId };
    if (courseId) where.programId = courseId;
    if (eventId) where.eventId = eventId;

    await prisma.waitlistEntry.deleteMany({ where });

    // Recalculate positions
    await this.recalculatePositions(courseId, eventId);
  }

  /**
   * Process waitlist when space becomes available
   */
  async processWaitlist(
    courseId?: string,
    eventId?: string,
    availableSpots: number = 1
  ): Promise<WaitlistEntryDto[]> {
    const waitlist = await this.getWaitlist(courseId, eventId);
    const toNotify = waitlist.slice(0, availableSpots);

    for (const entry of toNotify) {
      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: {
          notifiedAt: new Date(),
        },
      });
    }

    return toNotify;
  }

  /**
   * Recalculate waitlist positions
   */
  private async recalculatePositions(
    courseId?: string | null,
    eventId?: string | null
  ): Promise<void> {
    const where: any = {};
    if (courseId) where.programId = courseId;
    if (eventId) where.eventId = eventId;

    const entries = await prisma.waitlistEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    for (let i = 0; i < entries.length; i++) {
      await prisma.waitlistEntry.update({
        where: { id: entries[i].id },
        data: { position: i + 1 },
      });
    }
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToDto(entry: any): WaitlistEntryDto {
    return {
      id: entry.id,
      courseId: entry.programId || undefined,
      eventId: entry.eventId || undefined,
      userId: entry.userId,
      user: entry.user,
      position: entry.position,
      notifiedAt: entry.notifiedAt || undefined,
      enrolledAt: entry.enrolledAt || undefined,
      createdAt: entry.createdAt,
    };
  }
}
