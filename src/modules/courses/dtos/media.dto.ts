export interface CreateMaterialDto {
  collectionId: string;
  type: 'pdf' | 'image' | 'document' | 'zip' | 'other';
  filename: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  file: Buffer;
}

export interface MaterialResponseDto {
  id: string;
  collectionId: string;
  type: string;
  key: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedBy: string;
  uploader: {
    id: string;
    username: string;
    email: string;
  };
  meta?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVideoDto {
  collectionId: string;
  title: string;
  description?: string;
  type: 'on-demand' | 'live';
  duration?: number;
  uploadedBy: string;
  scheduledAt?: Date;
}

export interface VideoResponseDto {
  id: string;
  collectionId: string;
  streamId: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  size?: number;
  uploadedBy: string;
  uploader: {
    id: string;
    username: string;
    email: string;
  };
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLiveStreamDto {
  collectionId: string;
  title: string;
  description?: string;
  createdBy: string;
  scheduledAt?: Date;
}

export interface LiveStreamResponseDto {
  id: string;
  collectionId: string;
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
  createdBy: string;
  creator: {
    id: string;
    username: string;
    email: string;
  };
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StreamQuestionDto {
  id: string;
  streamId: string;
  studentId: string;
  student: {
    id: string;
    username: string;
    email: string;
  };
  question: string;
  timestamp: number;
  isAnswered: boolean;
  answeredBy?: string | null;
  answer?: string;
  answeredAt?: Date;
  createdAt: Date;
}

export interface CreateStreamQuestionDto {
  streamId: string;
  studentId: string;
  question: string;
  timestamp: number;
}

export interface StreamPollDto {
  id: string;
  streamId: string;
  instructorId: string;
  instructor: {
    id: string;
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
  instructorId: string;
  question: string;
  options: string[];
  expiresAt?: Date;
}

export interface PollResponseDto {
  id: string;
  pollId: string;
  studentId: string;
  student: {
    id: string;
    username: string;
    email: string;
  };
  option: string;
  createdAt: Date;
}

export interface CreatePollResponseDto {
  pollId: string;
  studentId: string;
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
