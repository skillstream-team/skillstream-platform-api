/**
 * Poll DTOs
 * Handles survey and feedback mechanisms
 */

/**
 * Poll Module DTOs
 * Handles survey and feedback mechanisms
 */


import { Prisma } from '@prisma/client';

export interface CreatePollDto {
  title: string;
  description?: string;
  courseId: string;
  moduleId?: string;
  liveStreamId: string;
  options: string[];
}

export interface RespondToPollDto {
  pollId: string;
  selectedOption: string;
}

export interface PollResponseDto {
  id: string;
  title: string;
  description?: string;
  courseId?: string;
  moduleId?: string;
  liveSessionId?: string;
  options: string[];
  responses: PollResponseDetailDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PollResponseDetailDto {
  userId: string;
  selectedOption: string;
  respondedAt: Date;
}

