import { CloudflareR2Service } from './cloudflare-r2.service';
import { CloudflareStreamService } from './cloudflare-stream.service';
import {
    CreateMaterialDto,
    MaterialResponseDto,
    CreateVideoDto,
    VideoResponseDto,
    CreateLiveStreamDto,
    LiveStreamResponseDto,
    CreateStreamQuestionDto,
    StreamQuestionDto,
    CreateStreamPollDto,
    StreamPollDto,
    CreatePollResponseDto,
    PollResponseDto,
    UploadFileResponseDto,
    VideoUploadUrlDto,
} from '../dtos/media.dto';
import { prisma } from '../../../utils/prisma';
const r2Service = new CloudflareR2Service();
const streamService = new CloudflareStreamService();

export class MediaService {
    /**
     * @swagger
     * /media/materials:
     *   post:
     *     summary: Upload a course material (PDF, image, etc.)
     *     tags: [Materials]
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             $ref: '#/components/schemas/CreateMaterialDto'
     *     responses:
     *       201:
     *         description: Material uploaded successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/MaterialResponseDto'
     */
    async uploadMaterial(data: CreateMaterialDto): Promise<MaterialResponseDto> {
        const uploadResult = await r2Service.uploadFile({
            file: data.file,
            filename: data.filename,
            contentType: data.mimeType,
            courseId: data.courseId,
            type: data.type,
        });

        const material = await prisma.material.create({
            data: {
                courseId: data.courseId,
                type: data.type,
                key: uploadResult.key,
                filename: data.filename,
                size: data.size,
                mimeType: data.mimeType,
                url: uploadResult.url,
                uploadedBy: data.uploadedBy,
            },
            include: {
                uploader: { select: { id: true, username: true, email: true } },
            },
        });

        return material as MaterialResponseDto;
    }

    /**
     * @swagger
     * /media/materials/{courseId}:
     *   get:
     *     summary: Get all materials for a specific course
     *     tags: [Materials]
     */
    async getMaterialsByCourse(courseId: string): Promise<MaterialResponseDto[]> {
        const materials = await prisma.material.findMany({
            where: { courseId },
            include: { uploader: { select: { id: true, username: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });

        return materials as MaterialResponseDto[];
    }

    /**
     * @swagger
     * /media/materials/{materialId}:
     *   delete:
     *     summary: Delete a material
     *     tags: [Materials]
     */
    async deleteMaterial(materialId: string): Promise<void> {
        const material = await prisma.material.findUnique({ where: { id: materialId } });
        if (!material) throw new Error('Material not found');
        await r2Service.deleteFile(material.key);
        await prisma.material.delete({ where: { id: materialId } });
    }

    /**
     * @swagger
     * /media/materials/{materialId}/signed-url:
     *   get:
     *     summary: Get signed download URL for a material
     *     tags: [Materials]
     */
    async getSignedUrl(materialId: string, expiresIn = 3600): Promise<string> {
        const material = await prisma.material.findUnique({ where: { id: materialId } });
        if (!material) throw new Error('Material not found');
        return await r2Service.getSignedUrl(material.key, expiresIn);
    }

    /**
     * @swagger
     * /media/videos:
     *   post:
     *     summary: Create a video entry and Cloudflare Stream record
     *     tags: [Videos]
     */
    async createVideo(data: CreateVideoDto): Promise<VideoResponseDto> {
        const streamVideo = await streamService.createVideo(data);
        const video = await prisma.video.create({
            data: {
                ...data,
                streamId: streamVideo.streamId!,
                status: streamVideo.status,
                playbackUrl: streamVideo.playbackUrl,
                thumbnailUrl: streamVideo.thumbnailUrl,
                duration: streamVideo.duration,
            },
            include: { uploader: { select: { id: true, username: true, email: true } } },
        });

        return video as VideoResponseDto;
    }

    /**
     * @swagger
     * /media/videos/course/{courseId}:
     *   get:
     *     summary: Get all videos by course
     *     tags: [Videos]
     */
    async getVideosByCourse(courseId: string): Promise<VideoResponseDto[]> {
        const videos = await prisma.video.findMany({
            where: { courseId },
            include: { uploader: { select: { id: true, username: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });

        return videos as VideoResponseDto[];
    }

    /**
     * @swagger
     * /media/videos/{videoId}:
     *   get:
     *     summary: Get details of a single video
     *     tags: [Videos]
     */
    async getVideo(videoId: string): Promise<VideoResponseDto | null> {
        const video = await prisma.video.findUnique({
            where: { id: videoId },
            include: { uploader: { select: { id: true, username: true, email: true } } },
        });

        return video as VideoResponseDto | null;
    }

    /**
     * @swagger
     * /media/videos/{videoId}/status:
     *   patch:
     *     summary: Refresh video status from Cloudflare Stream
     *     tags: [Videos]
     */
    async updateVideoStatus(videoId: string): Promise<VideoResponseDto> {
        const video = await prisma.video.findUnique({ where: { id: videoId } });
        if (!video) throw new Error('Video not found');

        const streamVideo = await streamService.getVideo(video.streamId);
        const updatedVideo = await prisma.video.update({
            where: { id: videoId },
            data: {
                status: streamVideo.status,
                playbackUrl: streamVideo.playbackUrl,
                thumbnailUrl: streamVideo.thumbnailUrl,
                duration: streamVideo.duration,
            },
            include: { uploader: { select: { id: true, username: true, email: true } } },
        });

        return updatedVideo as VideoResponseDto;
    }

    /**
     * @swagger
     * /media/videos/{videoId}:
     *   delete:
     *     summary: Delete a video from Cloudflare Stream and database
     *     tags: [Videos]
     */
    async deleteVideo(videoId: string): Promise<void> {
        const video = await prisma.video.findUnique({ where: { id: videoId } });
        if (!video) throw new Error('Video not found');

        await streamService.deleteVideo(video.streamId);
        await prisma.video.delete({ where: { id: videoId } });
    }

    /**
     * @swagger
     * /media/videos/{videoId}/upload-url:
     *   get:
     *     summary: Get Cloudflare Stream upload URL for a video
     *     tags: [Videos]
     */
    async getVideoUploadUrl(videoId: string): Promise<VideoUploadUrlDto> {
        const video = await prisma.video.findUnique({ where: { id: videoId } });
        if (!video) throw new Error('Video not found');

        const uploadUrl = await streamService.getUploadUrl(video.streamId);
        return { videoId: video.streamId, uploadUrl, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
    }

    /**
     * @swagger
     * /media/live-streams:
     *   post:
     *     summary: Create a new live stream
     *     tags: [Live Streams]
     */
    async createLiveStream(data: CreateLiveStreamDto): Promise<LiveStreamResponseDto> {
        const streamData = await streamService.createLiveStream({
            streamId: `stream_${Date.now()}`,
            ...data,
            isActive: false,
        });

        const liveStream = await prisma.liveStream.create({
            data: {
                ...data,
                streamId: streamData.streamId!,
                status: streamData.status,
                playbackUrl: streamData.playbackUrl,
            },
            include: { creator: { select: { id: true, username: true, email: true } } },
        });

        return liveStream as LiveStreamResponseDto;
    }

    /**
     * @swagger
     * /media/live-streams/course/{courseId}:
     *   get:
     *     summary: Get all live streams for a course
     *     tags: [Live Streams]
     */
    async getLiveStreamsByCourse(courseId: string): Promise<LiveStreamResponseDto[]> {
        const liveStreams = await prisma.liveStream.findMany({
            where: { courseId },
            include: { creator: { select: { id: true, username: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });

        return liveStreams as LiveStreamResponseDto[];
    }

    /**
     * @swagger
     * /media/live-streams/{streamId}/start:
     *   patch:
     *     summary: Start a live stream
     *     tags: [Live Streams]
     */
    async startLiveStream(streamId: string): Promise<LiveStreamResponseDto> {
        const liveStream = await prisma.liveStream.findUnique({ where: { streamId } });
        if (!liveStream) throw new Error('Live stream not found');

        const updatedStream = await prisma.liveStream.update({
            where: { streamId },
            data: { status: 'live', isActive: true, startedAt: new Date() },
            include: { creator: { select: { id: true, username: true, email: true } } },
        });

        return updatedStream as LiveStreamResponseDto;
    }

    /**
     * @swagger
     * /media/live-streams/{streamId}/end:
     *   patch:
     *     summary: End a live stream
     *     tags: [Live Streams]
     */
    async endLiveStream(streamId: string): Promise<LiveStreamResponseDto> {
        const liveStream = await prisma.liveStream.findUnique({ where: { streamId } });
        if (!liveStream) throw new Error('Live stream not found');

        await streamService.endLiveStream(streamId);
        const updatedStream = await prisma.liveStream.update({
            where: { streamId },
            data: { status: 'ended', isActive: false, endedAt: new Date() },
            include: { creator: { select: { id: true, username: true, email: true } } },
        });

        return updatedStream as LiveStreamResponseDto;
    }

    /**
     * @swagger
     * /media/live-streams/questions:
     *   post:
     *     summary: Ask a question during a live stream
     *     tags: [Live Streams]
     */
    async askQuestion(data: CreateStreamQuestionDto): Promise<StreamQuestionDto> {
        const question = await prisma.streamQuestion.create({
            data,
            include: { student: { select: { id: true, username: true, email: true } } },
        });

        return question as StreamQuestionDto;
    }

    /**
     * @swagger
     * /media/live-streams/{streamId}/questions:
     *   get:
     *     summary: Get all questions for a live stream
     *     tags: [Live Streams]
     */
    async getStreamQuestions(streamId: string): Promise<StreamQuestionDto[]> {
        const questions = await prisma.streamQuestion.findMany({
            where: { streamId },
            include: { student: { select: { id: true, username: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });

        return questions as StreamQuestionDto[];
    }

    /**
     * @swagger
     * /media/live-streams/questions/{questionId}/answer:
     *   post:
     *     summary: Answer a question during a live stream
     *     tags: [Live Streams]
     */
    async answerQuestion(questionId: string, answeredBy: string, answer: string): Promise<StreamQuestionDto> {
        const question = await prisma.streamQuestion.update({
            where: { id: questionId },
            data: {
                isAnswered: true,
                answeredBy,
                answer,
                answeredAt: new Date(),
            },
            include: { student: { select: { id: true, username: true, email: true } } },
        });

        return question as StreamQuestionDto;
    }

    /**
     * @swagger
     * /media/live-streams/{streamId}/polls:
     *   get:
     *     summary: Get all polls for a live stream
     *     tags: [Live Streams]
     */
    async getStreamPolls(streamId: string): Promise<StreamPollDto[]> {
        const polls = await prisma.streamPoll.findMany({
            where: { streamId },
            include: {
                instructor: { select: { id: true, username: true, email: true } },
                responses: {
                    include: { student: { select: { id: true, username: true, email: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return polls as StreamPollDto[];
    }

    /**
     * @swagger
     * /media/live-streams/{streamId}/polls:
     *   post:
     *     summary: Create a poll for a live stream
     *     tags: [Live Streams]
     */
    async createPoll(data: CreateStreamPollDto): Promise<StreamPollDto> {
        const poll = await prisma.streamPoll.create({
            data: {
                streamId: data.streamId,
                instructorId: data.instructorId,
                question: data.question,
                options: data.options,
                expiresAt: data.expiresAt,
                isActive: true,
            },
            include: {
                instructor: { select: { id: true, username: true, email: true } },
                responses: {
                    include: { student: { select: { id: true, username: true, email: true } } },
                },
            },
        });

        return poll as StreamPollDto;
    }

    /**
     * @swagger
     * /media/live-streams/polls/{pollId}/respond:
     *   post:
     *     summary: Respond to a poll
     *     tags: [Live Streams]
     */
    async respondToPoll(data: CreatePollResponseDto): Promise<PollResponseDto> {
        const response = await prisma.pollResponse.create({
            data: {
                pollId: data.pollId,
                studentId: data.studentId,
                option: data.option,
            },
            include: { student: { select: { id: true, username: true, email: true } } },
        });

        return response as PollResponseDto;
    }

    /**
     * @swagger
     * /media/live-streams/polls/{pollId}/end:
     *   patch:
     *     summary: End a poll
     *     tags: [Live Streams]
     */
    async endPoll(pollId: string): Promise<StreamPollDto> {
        const poll = await prisma.streamPoll.update({
            where: { id: pollId },
            data: { isActive: false },
            include: {
                instructor: { select: { id: true, username: true, email: true } },
                responses: {
                    include: { student: { select: { id: true, username: true, email: true } } },
                },
            },
        });

        return poll as StreamPollDto;
    }
}