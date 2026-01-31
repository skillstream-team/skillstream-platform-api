"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const cloudflare_r2_service_1 = require("./cloudflare-r2.service");
const cloudflare_stream_service_1 = require("./cloudflare-stream.service");
const prisma_1 = require("../../../utils/prisma");
const r2Service = new cloudflare_r2_service_1.CloudflareR2Service();
const streamService = new cloudflare_stream_service_1.CloudflareStreamService();
class MediaService {
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
    async uploadMaterial(data) {
        const uploadResult = await r2Service.uploadFile({
            file: data.file,
            filename: data.filename,
            contentType: data.mimeType,
            programId: data.collectionId || data.programId,
            type: data.type,
        });
        const material = await prisma_1.prisma.material.create({
            data: {
                programId: data.collectionId || data.programId,
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
        const materialWithRelations = material;
        return {
            ...materialWithRelations,
            collectionId: materialWithRelations.programId,
        };
    }
    /**
     * @swagger
     * /media/materials/{courseId}:
     *   get:
     *     summary: Get all materials for a specific course
     *     tags: [Materials]
     */
    async getMaterialsByCourse(collectionId) {
        const materials = await prisma_1.prisma.material.findMany({
            where: { programId: collectionId },
            include: { uploader: { select: { id: true, username: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return materials.map((m) => ({
            ...m,
            collectionId: m.programId,
        }));
    }
    /**
     * @swagger
     * /media/materials/{materialId}:
     *   delete:
     *     summary: Delete a material
     *     tags: [Materials]
     */
    async deleteMaterial(materialId) {
        const material = await prisma_1.prisma.material.findUnique({ where: { id: materialId } });
        if (!material)
            throw new Error('Material not found');
        await r2Service.deleteFile(material.key);
        await prisma_1.prisma.material.delete({ where: { id: materialId } });
    }
    /**
     * @swagger
     * /media/materials/{materialId}/signed-url:
     *   get:
     *     summary: Get signed download URL for a material
     *     tags: [Materials]
     */
    async getSignedUrl(materialId, expiresIn = 3600) {
        const material = await prisma_1.prisma.material.findUnique({ where: { id: materialId } });
        if (!material)
            throw new Error('Material not found');
        return await r2Service.getSignedUrl(material.key, expiresIn);
    }
    /**
     * @swagger
     * /media/videos:
     *   post:
     *     summary: Create a video entry and Cloudflare Stream record
     *     tags: [Videos]
     */
    async createVideo(data) {
        const streamVideo = await streamService.createVideo(data);
        const video = await prisma_1.prisma.video.create({
            data: {
                programId: data.collectionId,
                title: data.title,
                description: data.description,
                type: data.type,
                duration: data.duration,
                uploadedBy: data.uploadedBy,
                scheduledAt: data.scheduledAt,
                streamId: streamVideo.streamId,
                status: streamVideo.status,
                playbackUrl: streamVideo.playbackUrl,
                thumbnailUrl: streamVideo.thumbnailUrl,
            },
            include: { uploader: { select: { id: true, username: true, email: true } } },
        });
        const videoWithRelations = video;
        return {
            ...videoWithRelations,
            collectionId: videoWithRelations.programId,
        };
    }
    /**
     * @swagger
     * /media/videos/course/{courseId}:
     *   get:
     *     summary: Get all videos by course
     *     tags: [Videos]
     */
    async getVideosByCourse(collectionId) {
        const videos = await prisma_1.prisma.video.findMany({
            where: { programId: collectionId },
            include: { uploader: { select: { id: true, username: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return videos.map((v) => ({
            ...v,
            collectionId: v.programId,
        }));
    }
    /**
     * @swagger
     * /media/videos/{videoId}:
     *   get:
     *     summary: Get details of a single video
     *     tags: [Videos]
     */
    async getVideo(videoId) {
        const video = await prisma_1.prisma.video.findUnique({
            where: { id: videoId },
            include: { uploader: { select: { id: true, username: true, email: true } } },
        });
        return video;
    }
    /**
     * @swagger
     * /media/videos/{videoId}/status:
     *   patch:
     *     summary: Refresh video status from Cloudflare Stream
     *     tags: [Videos]
     */
    async updateVideoStatus(videoId) {
        const video = await prisma_1.prisma.video.findUnique({ where: { id: videoId } });
        if (!video)
            throw new Error('Video not found');
        const streamVideo = await streamService.getVideo(video.streamId);
        const updatedVideo = await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: {
                status: streamVideo.status,
                playbackUrl: streamVideo.playbackUrl,
                thumbnailUrl: streamVideo.thumbnailUrl,
                duration: streamVideo.duration,
            },
            include: { uploader: { select: { id: true, username: true, email: true } } },
        });
        const videoWithRelations = updatedVideo;
        return {
            ...videoWithRelations,
            collectionId: videoWithRelations.programId,
        };
    }
    /**
     * @swagger
     * /media/videos/{videoId}:
     *   delete:
     *     summary: Delete a video from Cloudflare Stream and database
     *     tags: [Videos]
     */
    async deleteVideo(videoId) {
        const video = await prisma_1.prisma.video.findUnique({ where: { id: videoId } });
        if (!video)
            throw new Error('Video not found');
        await streamService.deleteVideo(video.streamId);
        await prisma_1.prisma.video.delete({ where: { id: videoId } });
    }
    /**
     * @swagger
     * /media/videos/{videoId}/upload-url:
     *   get:
     *     summary: Get Cloudflare Stream upload URL for a video
     *     tags: [Videos]
     */
    async getVideoUploadUrl(videoId) {
        const video = await prisma_1.prisma.video.findUnique({ where: { id: videoId } });
        if (!video)
            throw new Error('Video not found');
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
    async createLiveStream(data) {
        const streamData = await streamService.createLiveStream({
            streamId: `stream_${Date.now()}`,
            ...data,
            isActive: false,
        });
        const liveStream = await prisma_1.prisma.liveStream.create({
            data: {
                programId: data.collectionId,
                title: data.title,
                description: data.description,
                createdBy: data.createdBy,
                scheduledAt: data.scheduledAt,
                streamId: streamData.streamId,
                status: streamData.status,
                playbackUrl: streamData.playbackUrl,
            },
            include: { creator: { select: { id: true, username: true, email: true } } },
        });
        const liveStreamWithRelations = liveStream;
        return {
            ...liveStreamWithRelations,
            collectionId: liveStreamWithRelations.programId,
        };
    }
    /**
     * @swagger
     * /media/live-streams/course/{courseId}:
     *   get:
     *     summary: Get all live streams for a course
     *     tags: [Live Streams]
     */
    async getLiveStreamsByCourse(collectionId) {
        const liveStreams = await prisma_1.prisma.liveStream.findMany({
            where: { programId: collectionId },
            include: { creator: { select: { id: true, username: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return liveStreams.map((ls) => ({
            ...ls,
            collectionId: ls.programId,
        }));
    }
    /**
     * @swagger
     * /media/live-streams/{streamId}/start:
     *   patch:
     *     summary: Start a live stream
     *     tags: [Live Streams]
     */
    async startLiveStream(streamId) {
        const liveStream = await prisma_1.prisma.liveStream.findUnique({ where: { streamId } });
        if (!liveStream)
            throw new Error('Live stream not found');
        const updatedStream = await prisma_1.prisma.liveStream.update({
            where: { streamId },
            data: { status: 'live', isActive: true, startedAt: new Date() },
            include: { creator: { select: { id: true, username: true, email: true } } },
        });
        const updatedStreamWithRelations = updatedStream;
        return {
            ...updatedStreamWithRelations,
            collectionId: updatedStreamWithRelations.programId,
        };
    }
    /**
     * @swagger
     * /media/live-streams/{streamId}/end:
     *   patch:
     *     summary: End a live stream
     *     tags: [Live Streams]
     */
    async endLiveStream(streamId) {
        const liveStream = await prisma_1.prisma.liveStream.findUnique({ where: { streamId } });
        if (!liveStream)
            throw new Error('Live stream not found');
        await streamService.endLiveStream(streamId);
        const updatedStream = await prisma_1.prisma.liveStream.update({
            where: { streamId },
            data: { status: 'ended', isActive: false, endedAt: new Date() },
            include: { creator: { select: { id: true, username: true, email: true } } },
        });
        const updatedStreamWithRelations = updatedStream;
        return {
            ...updatedStreamWithRelations,
            collectionId: updatedStreamWithRelations.programId,
        };
    }
    /**
     * @swagger
     * /media/live-streams/questions:
     *   post:
     *     summary: Ask a question during a live stream
     *     tags: [Live Streams]
     */
    async askQuestion(data) {
        const question = await prisma_1.prisma.streamQuestion.create({
            data,
            include: { student: { select: { id: true, username: true, email: true } } },
        });
        return question;
    }
    /**
     * @swagger
     * /media/live-streams/{streamId}/questions:
     *   get:
     *     summary: Get all questions for a live stream
     *     tags: [Live Streams]
     */
    async getStreamQuestions(streamId) {
        const questions = await prisma_1.prisma.streamQuestion.findMany({
            where: { streamId },
            include: { student: { select: { id: true, username: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return questions;
    }
    /**
     * @swagger
     * /media/live-streams/questions/{questionId}/answer:
     *   post:
     *     summary: Answer a question during a live stream
     *     tags: [Live Streams]
     */
    async answerQuestion(questionId, answeredBy, answer) {
        const question = await prisma_1.prisma.streamQuestion.update({
            where: { id: questionId },
            data: {
                isAnswered: true,
                answeredBy,
                answer,
                answeredAt: new Date(),
            },
            include: { student: { select: { id: true, username: true, email: true } } },
        });
        return question;
    }
    /**
     * @swagger
     * /media/live-streams/{streamId}/polls:
     *   get:
     *     summary: Get all polls for a live stream
     *     tags: [Live Streams]
     */
    async getStreamPolls(streamId) {
        const polls = await prisma_1.prisma.streamPoll.findMany({
            where: { streamId },
            include: {
                instructor: { select: { id: true, username: true, email: true } },
                responses: {
                    include: { student: { select: { id: true, username: true, email: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return polls;
    }
    /**
     * @swagger
     * /media/live-streams/{streamId}/polls:
     *   post:
     *     summary: Create a poll for a live stream
     *     tags: [Live Streams]
     */
    async createPoll(data) {
        const poll = await prisma_1.prisma.streamPoll.create({
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
        return poll;
    }
    /**
     * @swagger
     * /media/live-streams/polls/{pollId}/respond:
     *   post:
     *     summary: Respond to a poll
     *     tags: [Live Streams]
     */
    async respondToPoll(data) {
        const response = await prisma_1.prisma.pollResponse.create({
            data: {
                pollId: data.pollId,
                studentId: data.studentId,
                option: data.option,
            },
            include: { student: { select: { id: true, username: true, email: true } } },
        });
        return response;
    }
    /**
     * @swagger
     * /media/live-streams/polls/{pollId}/end:
     *   patch:
     *     summary: End a poll
     *     tags: [Live Streams]
     */
    async endPoll(pollId) {
        const poll = await prisma_1.prisma.streamPoll.update({
            where: { id: pollId },
            data: { isActive: false },
            include: {
                instructor: { select: { id: true, username: true, email: true } },
                responses: {
                    include: { student: { select: { id: true, username: true, email: true } } },
                },
            },
        });
        return poll;
    }
}
exports.MediaService = MediaService;
