export interface CreateMaterialDto {
  courseId: number;
  type: 'pdf' | 'image' | 'document' | 'zip' | 'other';
  filename: string;
  size: number;
  mimeType: string;
  uploadedBy: number;
  file: Buffer;
}

export interface MaterialResponseDto {
  id: number;
  courseId: number;
  type: string;
  key: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedBy: number;
  uploader: {
    id: number;
    username: string;
    email: string;
  };
  meta?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVideoDto {
  courseId: number;
  title: string;
  description?: string;
  type: 'on-demand' | 'live';
  duration?: number;
  uploadedBy: number;
  scheduledAt?: Date;
}

export interface VideoResponseDto {
  id: number;
  courseId: number;
  streamId: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  size?: number;
  uploadedBy: number;
  uploader: {
    id: number;
    username: string;
    email: string;
  };
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLiveStreamDto {
  courseId: number;
  title: string;
  description?: string;
  createdBy: number;
  scheduledAt?: Date;
}

export interface LiveStreamResponseDto {
  id: number;
  courseId: number;
  streamId: string;
  title: string;
  description?: string;
  status: string;
  playbackUrl?: string;
  rtmpUrl?: string;
  streamKey?: string;
  isActive: boolean;
  startedAt?: Date;
  endedAt?: Date;
  createdBy: number;
  creator: {
    id: number;
    username: string;
    email: string;
  };
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StreamQuestionDto {
  id: number;
  streamId: string;
  studentId: number;
  student: {
    id: number;
    username: string;
    email: string;
  };
  question: string;
  timestamp: number;
  isAnswered: boolean;
  answeredBy?: number;
  answer?: string;
  answeredAt?: Date;
  createdAt: Date;
}

export interface CreateStreamQuestionDto {
  streamId: string;
  studentId: number;
  question: string;
  timestamp: number;
}

export interface StreamPollDto {
  id: number;
  streamId: string;
  instructorId: number;
  instructor: {
    id: number;
    username: string;
    email: string;
  };
  question: string;
  options: string[];
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  responses: PollResponseDto[];
}

export interface CreateStreamPollDto {
  streamId: string;
  instructorId: number;
  question: string;
  options: string[];
  expiresAt?: Date;
}

export interface PollResponseDto {
  id: number;
  pollId: number;
  studentId: number;
  student: {
    id: number;
    username: string;
    email: string;
  };
  option: string;
  createdAt: Date;
}

export interface CreatePollResponseDto {
  pollId: number;
  studentId: number;
  option: string;
}

export interface UploadFileResponseDto {
  key: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

export interface VideoUploadUrlDto {
  videoId: string;
  uploadUrl: string;
  expiresAt: Date;
}
