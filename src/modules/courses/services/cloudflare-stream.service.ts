import axios, { AxiosInstance } from 'axios';

export interface CreateVideoDto {
  collectionId: string;
  title: string;
  description?: string;
  type: 'on-demand' | 'live';
  scheduledAt?: Date;
  duration?: number;
}

export interface VideoResponseDto {
  id: string;
  title: string;
  description?: string;
  type: 'on-demand' | 'live';
  status: 'pending' | 'ready' | 'live' | 'ended' | 'failed';
  streamId?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  scheduledAt?: Date;
  createdAt: Date;
  courseId: string;
}

export interface LiveStreamDto {
  streamId: string;
  collectionId: string;
  title: string;
  description?: string;
  scheduledAt?: Date;
  isActive: boolean;
}

export interface StreamQuestionDto {
  id: string;
  streamId: string;
  studentId: string;
  question: string;
  timestamp: number;
  isAnswered: boolean;
  answeredBy?: string;
  answer?: string;
  createdAt: Date;
}

export interface StreamPollDto {
  id: string;
  streamId: string;
  instructorId: string;
  question: string;
  options: string[];
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export class CloudflareStreamService {
  private apiClient: AxiosInstance;
  private accountId: string;
  private apiToken: string;

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN!;
    
    this.apiClient = axios.create({
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Create a new video upload (same valid body as createDirectUpload)
  async createVideo(data: CreateVideoDto): Promise<VideoResponseDto> {
    try {
      const body: Record<string, unknown> = {
        maxDurationSeconds: data.duration ?? 3600,
        expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      if (data.title) body.meta = { name: data.title };
      const response = await this.apiClient.post('/direct_upload', body);

      return {
        id: response.data.result.uid,
        title: data.title,
        description: data.description,
        type: data.type,
        status: 'pending',
        streamId: response.data.result.uid,
        playbackUrl: response.data.result.playback?.hls,
        createdAt: new Date(),
        courseId: data.collectionId,
        scheduledAt: data.scheduledAt,
      };
    } catch (error) {
      throw new Error(`Failed to create video: ${error}`);
    }
  }

  /** Create a direct upload and return streamId + uploadURL for client upload (e.g. lesson videos). */
  async createDirectUpload(data: CreateVideoDto): Promise<{ streamId: string; uploadURL: string }> {
    try {
      // Cloudflare docs: POST body only { "maxDurationSeconds": 3600 }. Optional: expiry (ISO), meta.name.
      // Send minimal body to avoid 400; ensure integer for maxDurationSeconds.
      const maxDurationSeconds = typeof data.duration === 'number' ? Math.round(data.duration) : 3600;
      const body: Record<string, unknown> = {
        maxDurationSeconds: Math.min(Math.max(maxDurationSeconds, 1), 21600), // 1s–6h typical range
      };
      const response = await this.apiClient.post<{ result: { uid: string; uploadURL: string } }>('/direct_upload', body);
      const result = response.data.result;
      if (!result?.uid || !result?.uploadURL) {
        throw new Error('Stream did not return upload URL');
      }
      return { streamId: result.uid, uploadURL: result.uploadURL };
    } catch (error: any) {
      const data = error?.response?.data;
      const errors = Array.isArray(data?.errors) ? data.errors : [];
      const messages = Array.isArray(data?.messages) ? data.messages : [];
      const firstError = errors[0];
      const msg =
        (firstError && (firstError.message || firstError.code))
        || (messages[0] && (typeof messages[0] === 'object' ? (messages[0] as { message?: string }).message : messages[0]))
        || data?.error
        || error?.message
        || String(error);
      const detail = firstError ? ` (code: ${firstError.code || 'unknown'})` : '';
      throw new Error(`Stream direct upload failed: ${msg}${detail}`);
    }
  }

  // Get video details
  async getVideo(videoId: string): Promise<VideoResponseDto> {
    try {
      const response = await this.apiClient.get(`/${videoId}`);
      const video = response.data.result;

      const rawDuration = video.duration;
      const duration =
        rawDuration != null && !Number.isNaN(Number(rawDuration))
          ? Math.round(Number(rawDuration))
          : undefined;

      return {
        id: video.uid,
        title: video.meta?.title || 'Untitled',
        description: video.meta?.description,
        type: video.meta?.type || 'on-demand',
        status: this.mapStreamStatus(video.status),
        streamId: video.uid,
        playbackUrl: video.playback?.hls,
        thumbnailUrl: video.thumbnail,
        duration: duration !== undefined && duration > 0 ? duration : undefined,
        createdAt: new Date(video.created),
        courseId: video.meta?.collectionId,
        scheduledAt: video.meta?.scheduledAt ? new Date(video.meta.scheduledAt) : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get video: ${error}`);
    }
  }

  // Delete video
  async deleteVideo(videoId: string): Promise<void> {
    try {
      await this.apiClient.delete(`/${videoId}`);
    } catch (error) {
      throw new Error(`Failed to delete video: ${error}`);
    }
  }

  // Create live stream
  async createLiveStream(data: LiveStreamDto): Promise<VideoResponseDto> {
    try {
      const response = await this.apiClient.post('/live_inputs', {
        meta: {
          collectionId: data.collectionId,
          title: data.title,
          description: data.description,
          type: 'live',
        },
        recording: {
          mode: 'automatic',
        },
        rtmps: {
          url: `rtmps://live.cloudflare.com/live/${data.streamId}`,
        },
      });

      return {
        id: response.data.result.uid,
        title: data.title,
        description: data.description,
        type: 'live',
        status: 'ready',
        streamId: response.data.result.uid,
        playbackUrl: response.data.result.playback?.hls,
        createdAt: new Date(),
        courseId: data.collectionId,
        scheduledAt: data.scheduledAt,
      };
    } catch (error) {
      throw new Error(`Failed to create live stream: ${error}`);
    }
  }

  // Get live stream status
  async getLiveStreamStatus(streamId: string): Promise<string> {
    try {
      const response = await this.apiClient.get(`/live_inputs/${streamId}`);
      return this.mapStreamStatus(response.data.result.status);
    } catch (error) {
      throw new Error(`Failed to get live stream status: ${error}`);
    }
  }

  // End live stream
  async endLiveStream(streamId: string): Promise<void> {
    try {
      await this.apiClient.delete(`/live_inputs/${streamId}`);
    } catch (error) {
      throw new Error(`Failed to end live stream: ${error}`);
    }
  }

  // Get video analytics
  async getVideoAnalytics(videoId: string): Promise<any> {
    try {
      const response = await this.apiClient.get(`/${videoId}/analytics`);
      return response.data.result;
    } catch (error) {
      throw new Error(`Failed to get video analytics: ${error}`);
    }
  }

  // Generate signed URL for video upload
  async getUploadUrl(videoId: string): Promise<string> {
    try {
      const response = await this.apiClient.post(`/${videoId}/direct_upload`);
      return response.data.result.uploadURL;
    } catch (error) {
      throw new Error(`Failed to get upload URL: ${error}`);
    }
  }

  private mapStreamStatus(status: string): 'pending' | 'ready' | 'live' | 'ended' | 'failed' {
    const statusMap: Record<string, 'pending' | 'ready' | 'live' | 'ended' | 'failed'> = {
      'pending': 'pending',
      'ready': 'ready',
      'live': 'live',
      'ended': 'ended',
      'failed': 'failed',
    };
    return statusMap[status] || 'pending';
  }
}
