export interface CreateRecommendationDto {
  userId: number;
  courseId: number;
  score: number;
  reason: string;
  algorithm: string;
  metadata?: any;
}

export interface RecommendationResponseDto {
  id: number;
  userId: number;
  courseId: number;
  score: number;
  reason: string;
  algorithm: string;
  metadata?: any;
  isViewed: boolean;
  isClicked: boolean;
  createdAt: Date;
  updatedAt: Date;
  course: {
    id: number;
    title: string;
    description?: string;
    price: number;
    instructor: {
      id: number;
      username: string;
    };
  };
}

export interface UserInteractionDto {
  userId: number;
  courseId?: number;
  type: 'view' | 'enroll' | 'complete' | 'rate' | 'search';
  value?: number;
  metadata?: any;
}

export interface RecommendationFiltersDto {
  userId: number;
  limit?: number;
  algorithm?: string;
  minScore?: number;
  excludeViewed?: boolean;
}

export interface RecommendationStatsDto {
  totalRecommendations: number;
  viewedRecommendations: number;
  clickedRecommendations: number;
  averageScore: number;
  topAlgorithm: string;
}
