"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareStreamService = void 0;
const axios_1 = __importDefault(require("axios"));
class CloudflareStreamService {
    constructor() {
        this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        this.apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
        this.apiClient = axios_1.default.create({
            baseURL: `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`,
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json',
            },
        });
    }
    // Create a new video upload
    async createVideo(data) {
        try {
            const response = await this.apiClient.post('/direct_upload', {
                maxDurationSeconds: data.duration || 3600,
                expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
                metadata: {
                    courseId: data.courseId,
                    title: data.title,
                    description: data.description,
                    type: data.type,
                },
            });
            return {
                id: response.data.result.uid,
                title: data.title,
                description: data.description,
                type: data.type,
                status: 'pending',
                streamId: response.data.result.uid,
                playbackUrl: response.data.result.playback?.hls,
                createdAt: new Date(),
                courseId: data.courseId,
                scheduledAt: data.scheduledAt,
            };
        }
        catch (error) {
            throw new Error(`Failed to create video: ${error}`);
        }
    }
    // Get video details
    async getVideo(videoId) {
        try {
            const response = await this.apiClient.get(`/${videoId}`);
            const video = response.data.result;
            return {
                id: video.uid,
                title: video.meta?.title || 'Untitled',
                description: video.meta?.description,
                type: video.meta?.type || 'on-demand',
                status: this.mapStreamStatus(video.status),
                streamId: video.uid,
                playbackUrl: video.playback?.hls,
                thumbnailUrl: video.thumbnail,
                duration: video.duration,
                createdAt: new Date(video.created),
                courseId: video.meta?.courseId,
                scheduledAt: video.meta?.scheduledAt ? new Date(video.meta.scheduledAt) : undefined,
            };
        }
        catch (error) {
            throw new Error(`Failed to get video: ${error}`);
        }
    }
    // Delete video
    async deleteVideo(videoId) {
        try {
            await this.apiClient.delete(`/${videoId}`);
        }
        catch (error) {
            throw new Error(`Failed to delete video: ${error}`);
        }
    }
    // Create live stream
    async createLiveStream(data) {
        try {
            const response = await this.apiClient.post('/live_inputs', {
                meta: {
                    courseId: data.courseId,
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
                courseId: data.courseId,
                scheduledAt: data.scheduledAt,
            };
        }
        catch (error) {
            throw new Error(`Failed to create live stream: ${error}`);
        }
    }
    // Get live stream status
    async getLiveStreamStatus(streamId) {
        try {
            const response = await this.apiClient.get(`/live_inputs/${streamId}`);
            return this.mapStreamStatus(response.data.result.status);
        }
        catch (error) {
            throw new Error(`Failed to get live stream status: ${error}`);
        }
    }
    // End live stream
    async endLiveStream(streamId) {
        try {
            await this.apiClient.delete(`/live_inputs/${streamId}`);
        }
        catch (error) {
            throw new Error(`Failed to end live stream: ${error}`);
        }
    }
    // Get video analytics
    async getVideoAnalytics(videoId) {
        try {
            const response = await this.apiClient.get(`/${videoId}/analytics`);
            return response.data.result;
        }
        catch (error) {
            throw new Error(`Failed to get video analytics: ${error}`);
        }
    }
    // Generate signed URL for video upload
    async getUploadUrl(videoId) {
        try {
            const response = await this.apiClient.post(`/${videoId}/direct_upload`);
            return response.data.result.uploadURL;
        }
        catch (error) {
            throw new Error(`Failed to get upload URL: ${error}`);
        }
    }
    mapStreamStatus(status) {
        const statusMap = {
            'pending': 'pending',
            'ready': 'ready',
            'live': 'live',
            'ended': 'ended',
            'failed': 'failed',
        };
        return statusMap[status] || 'pending';
    }
}
exports.CloudflareStreamService = CloudflareStreamService;
