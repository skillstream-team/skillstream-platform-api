export interface CreateRecommendationDto {
  userId: string;
  courseId: string;
  score: number;
  reason: string;
  algorithm: string;
  metadata?: any;
}

export interface RecommendationResponseDto {
  id: string;
  userId: string;
  courseId: string;
  score: number;
  reason: string;
  algorithm: string;
  metadata?: any;
  isViewed: boolean;
  isClicked: boolean;
  createdAt: Date;
  updatedAt: Date;
  course: {
    id: string;
    title: string;
    description?: string;
    price: number;
    instructor: {
      id: string;
      username: string;
    };
  };
}

export interface UserInteractionDto {
  userId: string;
  courseId?: string;
  type: 'view' | 'enroll' | 'complete' | 'rate' | 'search';
  value?: number;
  metadata?: any;
}

export interface RecommendationFiltersDto {
  userId: string;
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
