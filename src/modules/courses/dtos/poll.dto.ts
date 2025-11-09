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
  courseId: number;
  moduleId?: number;
  liveStreamId: number;
  options: string[];
}

export interface RespondToPollDto {
  pollId: number;
  selectedOption: string;
}

export interface PollResponseDto {
  id: number;
  title: string;
  description?: string;
  courseId?: number;
  moduleId?: number;
  liveSessionId?: number;
  options: string[];
  responses: PollResponseDetailDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PollResponseDetailDto {
  userId: number;
  selectedOption: string;
  respondedAt: Date;
}

