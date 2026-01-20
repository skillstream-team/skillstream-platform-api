"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaSchema = void 0;
const graphql_1 = require("graphql");
const media_service_1 = require("../../services/media.service");
const mediaService = new media_service_1.MediaService();
// Types
const UserType = new graphql_1.GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        username: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        email: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
const CourseType = new graphql_1.GraphQLObjectType({
    name: 'Course',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
const MaterialType = new graphql_1.GraphQLObjectType({
    name: 'Material',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        key: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        filename: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        size: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        mimeType: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        url: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        uploadedBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        uploader: { type: UserType },
        meta: { type: graphql_1.GraphQLString },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        updatedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
const VideoType = new graphql_1.GraphQLObjectType({
    name: 'Video',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        streamId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        description: { type: graphql_1.GraphQLString },
        type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        status: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        playbackUrl: { type: graphql_1.GraphQLString },
        thumbnailUrl: { type: graphql_1.GraphQLString },
        duration: { type: graphql_1.GraphQLInt },
        size: { type: graphql_1.GraphQLInt },
        uploadedBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        uploader: { type: UserType },
        scheduledAt: { type: graphql_1.GraphQLString },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        updatedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
const LiveStreamType = new graphql_1.GraphQLObjectType({
    name: 'LiveStream',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        streamId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        description: { type: graphql_1.GraphQLString },
        status: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        playbackUrl: { type: graphql_1.GraphQLString },
        rtmpUrl: { type: graphql_1.GraphQLString },
        streamKey: { type: graphql_1.GraphQLString },
        isActive: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
        startedAt: { type: graphql_1.GraphQLString },
        endedAt: { type: graphql_1.GraphQLString },
        createdBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        creator: { type: UserType },
        scheduledAt: { type: graphql_1.GraphQLString },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        updatedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
const StreamQuestionType = new graphql_1.GraphQLObjectType({
    name: 'StreamQuestion',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        streamId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        studentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        student: { type: UserType },
        question: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        timestamp: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        isAnswered: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
        answeredBy: { type: graphql_1.GraphQLInt },
        answer: { type: graphql_1.GraphQLString },
        answeredAt: { type: graphql_1.GraphQLString },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
const PollResponseType = new graphql_1.GraphQLObjectType({
    name: 'PollResponse',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        pollId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        studentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        student: { type: UserType },
        option: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
const StreamPollType = new graphql_1.GraphQLObjectType({
    name: 'StreamPoll',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        streamId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        instructorId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        instructor: { type: UserType },
        question: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        options: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        isActive: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
        expiresAt: { type: graphql_1.GraphQLString },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        updatedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        responses: { type: new graphql_1.GraphQLList(PollResponseType) },
    }),
});
const VideoUploadUrlType = new graphql_1.GraphQLObjectType({
    name: 'VideoUploadUrl',
    fields: () => ({
        videoId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        uploadUrl: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        expiresAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
// Queries
const mediaQueries = {
    // Materials
    courseMaterials: {
        type: new graphql_1.GraphQLList(MaterialType),
        args: { courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await mediaService.getMaterialsByCourse(args.courseId);
        },
    },
    // Videos
    courseVideos: {
        type: new graphql_1.GraphQLList(VideoType),
        args: { courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await mediaService.getVideosByCourse(args.courseId);
        },
    },
    video: {
        type: VideoType,
        args: { videoId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await mediaService.getVideo(args.videoId);
        },
    },
    // Live Streams
    courseLiveStreams: {
        type: new graphql_1.GraphQLList(LiveStreamType),
        args: { courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await mediaService.getLiveStreamsByCourse(args.courseId);
        },
    },
    // Real-time Features
    streamQuestions: {
        type: new graphql_1.GraphQLList(StreamQuestionType),
        args: { streamId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) } },
        resolve: async (_, args) => {
            return await mediaService.getStreamQuestions(args.streamId);
        },
    },
    streamPolls: {
        type: new graphql_1.GraphQLList(StreamPollType),
        args: { streamId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) } },
        resolve: async (_, args) => {
            return await mediaService.getStreamPolls(args.streamId);
        },
    },
};
// Mutations
const mediaMutations = {
    // Material Mutations
    uploadMaterial: {
        type: MaterialType,
        args: {
            courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            filename: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            size: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            mimeType: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            uploadedBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        },
        resolve: async (_, args) => {
            // Note: In a real implementation, you'd need to handle file upload
            // This is a simplified version for demonstration
            throw new Error('File upload not implemented in this example');
        },
    },
    deleteMaterial: {
        type: graphql_1.GraphQLString,
        args: { materialId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            await mediaService.deleteMaterial(args.materialId);
            return 'Material deleted successfully';
        },
    },
    getMaterialSignedUrl: {
        type: graphql_1.GraphQLString,
        args: {
            materialId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            expiresIn: { type: graphql_1.GraphQLInt }
        },
        resolve: async (_, args) => {
            return await mediaService.getSignedUrl(args.materialId, args.expiresIn || 3600);
        },
    },
    // Video Mutations
    createVideo: {
        type: VideoType,
        args: {
            courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            description: { type: graphql_1.GraphQLString },
            type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            duration: { type: graphql_1.GraphQLInt },
            uploadedBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            scheduledAt: { type: graphql_1.GraphQLString },
        },
        resolve: async (_, args) => {
            return await mediaService.createVideo({
                collectionId: args.courseId,
                title: args.title,
                description: args.description,
                type: args.type,
                duration: args.duration,
                uploadedBy: args.uploadedBy,
                scheduledAt: args.scheduledAt ? new Date(args.scheduledAt) : undefined,
            });
        },
    },
    updateVideoStatus: {
        type: VideoType,
        args: { videoId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await mediaService.updateVideoStatus(args.videoId);
        },
    },
    deleteVideo: {
        type: graphql_1.GraphQLString,
        args: { videoId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            await mediaService.deleteVideo(args.videoId);
            return 'Video deleted successfully';
        },
    },
    getVideoUploadUrl: {
        type: VideoUploadUrlType,
        args: { videoId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await mediaService.getVideoUploadUrl(args.videoId);
        },
    },
    // Live Stream Mutations
    createLiveStream: {
        type: LiveStreamType,
        args: {
            courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            description: { type: graphql_1.GraphQLString },
            createdBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            scheduledAt: { type: graphql_1.GraphQLString },
        },
        resolve: async (_, args) => {
            return await mediaService.createLiveStream({
                collectionId: args.courseId,
                title: args.title,
                description: args.description,
                createdBy: args.createdBy,
                scheduledAt: args.scheduledAt ? new Date(args.scheduledAt) : undefined,
            });
        },
    },
    startLiveStream: {
        type: LiveStreamType,
        args: { streamId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) } },
        resolve: async (_, args) => {
            return await mediaService.startLiveStream(args.streamId);
        },
    },
    endLiveStream: {
        type: LiveStreamType,
        args: { streamId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) } },
        resolve: async (_, args) => {
            return await mediaService.endLiveStream(args.streamId);
        },
    },
    // Real-time Features
    askQuestion: {
        type: StreamQuestionType,
        args: {
            streamId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            studentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            question: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            timestamp: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        },
        resolve: async (_, args) => {
            return await mediaService.askQuestion({
                streamId: args.streamId,
                studentId: args.studentId,
                question: args.question,
                timestamp: args.timestamp,
            });
        },
    },
    answerQuestion: {
        type: StreamQuestionType,
        args: {
            questionId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            answeredBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            answer: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        },
        resolve: async (_, args) => {
            return await mediaService.answerQuestion(args.questionId, args.answeredBy, args.answer);
        },
    },
    createPoll: {
        type: StreamPollType,
        args: {
            streamId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            instructorId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            question: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            options: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
            expiresAt: { type: graphql_1.GraphQLString },
        },
        resolve: async (_, args) => {
            return await mediaService.createPoll({
                streamId: args.streamId,
                instructorId: args.instructorId,
                question: args.question,
                options: args.options,
                expiresAt: args.expiresAt ? new Date(args.expiresAt) : undefined,
            });
        },
    },
    respondToPoll: {
        type: PollResponseType,
        args: {
            pollId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            studentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            option: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        },
        resolve: async (_, args) => {
            return await mediaService.respondToPoll({
                pollId: args.pollId,
                studentId: args.studentId,
                option: args.option,
            });
        },
    },
    endPoll: {
        type: StreamPollType,
        args: { pollId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await mediaService.endPoll(args.pollId);
        },
    },
};
exports.mediaSchema = new graphql_1.GraphQLSchema({
    query: new graphql_1.GraphQLObjectType({
        name: 'Query',
        fields: mediaQueries,
    }),
    mutation: new graphql_1.GraphQLObjectType({
        name: 'Mutation',
        fields: mediaMutations,
    }),
});
