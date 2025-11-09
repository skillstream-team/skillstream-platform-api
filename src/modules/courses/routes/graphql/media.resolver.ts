import { GraphQLObjectType, GraphQLSchema, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLList, GraphQLNonNull, GraphQLBoolean } from 'graphql';
import { MediaService } from '../../services/media.service';

const mediaService = new MediaService();

// Types
const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const CourseType = new GraphQLObjectType({
  name: 'Course',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    title: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const MaterialType = new GraphQLObjectType({
  name: 'Material',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    courseId: { type: new GraphQLNonNull(GraphQLInt) },
    type: { type: new GraphQLNonNull(GraphQLString) },
    key: { type: new GraphQLNonNull(GraphQLString) },
    filename: { type: new GraphQLNonNull(GraphQLString) },
    size: { type: new GraphQLNonNull(GraphQLInt) },
    mimeType: { type: new GraphQLNonNull(GraphQLString) },
    url: { type: new GraphQLNonNull(GraphQLString) },
    uploadedBy: { type: new GraphQLNonNull(GraphQLInt) },
    uploader: { type: UserType },
    meta: { type: GraphQLString },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const VideoType = new GraphQLObjectType({
  name: 'Video',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    courseId: { type: new GraphQLNonNull(GraphQLInt) },
    streamId: { type: new GraphQLNonNull(GraphQLString) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    type: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    playbackUrl: { type: GraphQLString },
    thumbnailUrl: { type: GraphQLString },
    duration: { type: GraphQLInt },
    size: { type: GraphQLInt },
    uploadedBy: { type: new GraphQLNonNull(GraphQLInt) },
    uploader: { type: UserType },
    scheduledAt: { type: GraphQLString },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const LiveStreamType = new GraphQLObjectType({
  name: 'LiveStream',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    courseId: { type: new GraphQLNonNull(GraphQLInt) },
    streamId: { type: new GraphQLNonNull(GraphQLString) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    status: { type: new GraphQLNonNull(GraphQLString) },
    playbackUrl: { type: GraphQLString },
    rtmpUrl: { type: GraphQLString },
    streamKey: { type: GraphQLString },
    isActive: { type: new GraphQLNonNull(GraphQLBoolean) },
    startedAt: { type: GraphQLString },
    endedAt: { type: GraphQLString },
    createdBy: { type: new GraphQLNonNull(GraphQLInt) },
    creator: { type: UserType },
    scheduledAt: { type: GraphQLString },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const StreamQuestionType = new GraphQLObjectType({
  name: 'StreamQuestion',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    streamId: { type: new GraphQLNonNull(GraphQLString) },
    studentId: { type: new GraphQLNonNull(GraphQLInt) },
    student: { type: UserType },
    question: { type: new GraphQLNonNull(GraphQLString) },
    timestamp: { type: new GraphQLNonNull(GraphQLInt) },
    isAnswered: { type: new GraphQLNonNull(GraphQLBoolean) },
    answeredBy: { type: GraphQLInt },
    answer: { type: GraphQLString },
    answeredAt: { type: GraphQLString },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const PollResponseType = new GraphQLObjectType({
  name: 'PollResponse',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    pollId: { type: new GraphQLNonNull(GraphQLInt) },
    studentId: { type: new GraphQLNonNull(GraphQLInt) },
    student: { type: UserType },
    option: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const StreamPollType = new GraphQLObjectType({
  name: 'StreamPoll',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    streamId: { type: new GraphQLNonNull(GraphQLString) },
    instructorId: { type: new GraphQLNonNull(GraphQLInt) },
    instructor: { type: UserType },
    question: { type: new GraphQLNonNull(GraphQLString) },
    options: { type: new GraphQLList(GraphQLString) },
    isActive: { type: new GraphQLNonNull(GraphQLBoolean) },
    expiresAt: { type: GraphQLString },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
    responses: { type: new GraphQLList(PollResponseType) },
  }),
});

const VideoUploadUrlType = new GraphQLObjectType({
  name: 'VideoUploadUrl',
  fields: () => ({
    videoId: { type: new GraphQLNonNull(GraphQLString) },
    uploadUrl: { type: new GraphQLNonNull(GraphQLString) },
    expiresAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

// Queries
const mediaQueries = {
  // Materials
  courseMaterials: {
    type: new GraphQLList(MaterialType),
    args: { courseId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      return await mediaService.getMaterialsByCourse(args.courseId);
    },
  },

  // Videos
  courseVideos: {
    type: new GraphQLList(VideoType),
    args: { courseId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      return await mediaService.getVideosByCourse(args.courseId);
    },
  },
  video: {
    type: VideoType,
    args: { videoId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      return await mediaService.getVideo(args.videoId);
    },
  },

  // Live Streams
  courseLiveStreams: {
    type: new GraphQLList(LiveStreamType),
    args: { courseId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      return await mediaService.getLiveStreamsByCourse(args.courseId);
    },
  },

  // Real-time Features
  streamQuestions: {
    type: new GraphQLList(StreamQuestionType),
    args: { streamId: { type: new GraphQLNonNull(GraphQLString) } },
    resolve: async (_: any, args: any) => {
      return await mediaService.getStreamQuestions(args.streamId);
    },
  },
  streamPolls: {
    type: new GraphQLList(StreamPollType),
    args: { streamId: { type: new GraphQLNonNull(GraphQLString) } },
    resolve: async (_: any, args: any) => {
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
      courseId: { type: new GraphQLNonNull(GraphQLInt) },
      type: { type: new GraphQLNonNull(GraphQLString) },
      filename: { type: new GraphQLNonNull(GraphQLString) },
      size: { type: new GraphQLNonNull(GraphQLInt) },
      mimeType: { type: new GraphQLNonNull(GraphQLString) },
      uploadedBy: { type: new GraphQLNonNull(GraphQLInt) },
    },
    resolve: async (_: any, args: any) => {
      // Note: In a real implementation, you'd need to handle file upload
      // This is a simplified version for demonstration
      throw new Error('File upload not implemented in this example');
    },
  },
  deleteMaterial: {
    type: GraphQLString,
    args: { materialId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      await mediaService.deleteMaterial(args.materialId);
      return 'Material deleted successfully';
    },
  },
  getMaterialSignedUrl: {
    type: GraphQLString,
    args: { 
      materialId: { type: new GraphQLNonNull(GraphQLInt) },
      expiresIn: { type: GraphQLInt }
    },
    resolve: async (_: any, args: any) => {
      return await mediaService.getSignedUrl(args.materialId, args.expiresIn || 3600);
    },
  },

  // Video Mutations
  createVideo: {
    type: VideoType,
    args: {
      courseId: { type: new GraphQLNonNull(GraphQLInt) },
      title: { type: new GraphQLNonNull(GraphQLString) },
      description: { type: GraphQLString },
      type: { type: new GraphQLNonNull(GraphQLString) },
      duration: { type: GraphQLInt },
      uploadedBy: { type: new GraphQLNonNull(GraphQLInt) },
      scheduledAt: { type: GraphQLString },
    },
    resolve: async (_: any, args: any) => {
      return await mediaService.createVideo({
        courseId: args.courseId,
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
    args: { videoId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      return await mediaService.updateVideoStatus(args.videoId);
    },
  },
  deleteVideo: {
    type: GraphQLString,
    args: { videoId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      await mediaService.deleteVideo(args.videoId);
      return 'Video deleted successfully';
    },
  },
  getVideoUploadUrl: {
    type: VideoUploadUrlType,
    args: { videoId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      return await mediaService.getVideoUploadUrl(args.videoId);
    },
  },

  // Live Stream Mutations
  createLiveStream: {
    type: LiveStreamType,
    args: {
      courseId: { type: new GraphQLNonNull(GraphQLInt) },
      title: { type: new GraphQLNonNull(GraphQLString) },
      description: { type: GraphQLString },
      createdBy: { type: new GraphQLNonNull(GraphQLInt) },
      scheduledAt: { type: GraphQLString },
    },
    resolve: async (_: any, args: any) => {
      return await mediaService.createLiveStream({
        courseId: args.courseId,
        title: args.title,
        description: args.description,
        createdBy: args.createdBy,
        scheduledAt: args.scheduledAt ? new Date(args.scheduledAt) : undefined,
      });
    },
  },
  startLiveStream: {
    type: LiveStreamType,
    args: { streamId: { type: new GraphQLNonNull(GraphQLString) } },
    resolve: async (_: any, args: any) => {
      return await mediaService.startLiveStream(args.streamId);
    },
  },
  endLiveStream: {
    type: LiveStreamType,
    args: { streamId: { type: new GraphQLNonNull(GraphQLString) } },
    resolve: async (_: any, args: any) => {
      return await mediaService.endLiveStream(args.streamId);
    },
  },

  // Real-time Features
  askQuestion: {
    type: StreamQuestionType,
    args: {
      streamId: { type: new GraphQLNonNull(GraphQLString) },
      studentId: { type: new GraphQLNonNull(GraphQLInt) },
      question: { type: new GraphQLNonNull(GraphQLString) },
      timestamp: { type: new GraphQLNonNull(GraphQLInt) },
    },
    resolve: async (_: any, args: any) => {
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
      questionId: { type: new GraphQLNonNull(GraphQLInt) },
      answeredBy: { type: new GraphQLNonNull(GraphQLInt) },
      answer: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: async (_: any, args: any) => {
      return await mediaService.answerQuestion(args.questionId, args.answeredBy, args.answer);
    },
  },
  createPoll: {
    type: StreamPollType,
    args: {
      streamId: { type: new GraphQLNonNull(GraphQLString) },
      instructorId: { type: new GraphQLNonNull(GraphQLInt) },
      question: { type: new GraphQLNonNull(GraphQLString) },
      options: { type: new GraphQLList(GraphQLString) },
      expiresAt: { type: GraphQLString },
    },
    resolve: async (_: any, args: any) => {
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
      pollId: { type: new GraphQLNonNull(GraphQLInt) },
      studentId: { type: new GraphQLNonNull(GraphQLInt) },
      option: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: async (_: any, args: any) => {
      return await mediaService.respondToPoll({
        pollId: args.pollId,
        studentId: args.studentId,
        option: args.option,
      });
    },
  },
  endPoll: {
    type: StreamPollType,
    args: { pollId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      return await mediaService.endPoll(args.pollId);
    },
  },
};

export const mediaSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: mediaQueries,
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: mediaMutations,
  }),
});
