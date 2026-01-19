import { GraphQLObjectType, GraphQLSchema, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLList, GraphQLNonNull, GraphQLEnumType } from 'graphql';
import { EnrollmentService } from '../../services/enrollment.service';
import { PaymentService } from '../../services/payment.service';

const enrollmentService = new EnrollmentService();
const paymentService = new PaymentService();

// Enums
const PaymentStatusEnum = new GraphQLEnumType({
  name: 'PaymentStatus',
  values: {
    PENDING: { value: 'PENDING' },
    COMPLETED: { value: 'COMPLETED' },
    FAILED: { value: 'FAILED' },
  },
});

const PaymentProviderEnum = new GraphQLEnumType({
  name: 'PaymentProvider',
  values: {
    STRIPE: { value: 'stripe' },
    PAYPAL: { value: 'paypal' },
  },
});

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
    price: { type: new GraphQLNonNull(GraphQLFloat) },
  }),
});

const PaymentType = new GraphQLObjectType({
  name: 'Payment',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    amount: { type: new GraphQLNonNull(GraphQLFloat) },
    currency: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    provider: { type: new GraphQLNonNull(GraphQLString) },
    transactionId: { type: GraphQLString },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    student: { type: UserType },
    course: { type: CourseType },
  }),
});

const EnrollmentType = new GraphQLObjectType({
  name: 'Enrollment',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    courseId: { type: new GraphQLNonNull(GraphQLInt) },
    studentId: { type: new GraphQLNonNull(GraphQLInt) },
    paymentId: { type: GraphQLInt },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    course: { type: CourseType },
    student: { type: UserType },
    payment: { type: PaymentType },
  }),
});

const CourseEnrollmentType = new GraphQLObjectType({
  name: 'CourseEnrollment',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    enrollmentDate: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const ActivityBreakdownType = new GraphQLObjectType({
  name: 'ActivityBreakdown',
  fields: () => ({
    progress: { type: new GraphQLNonNull(GraphQLInt) },
    activityLogs: { type: new GraphQLNonNull(GraphQLInt) },
    interactions: { type: new GraphQLNonNull(GraphQLInt) },
    forumPosts: { type: new GraphQLNonNull(GraphQLInt) },
    forumReplies: { type: new GraphQLNonNull(GraphQLInt) },
    videoViews: { type: new GraphQLNonNull(GraphQLInt) },
  }),
});

const ActiveUserType = new GraphQLObjectType({
  name: 'ActiveUser',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    enrollmentDate: { type: new GraphQLNonNull(GraphQLString) },
    lastAccessed: { type: new GraphQLNonNull(GraphQLString) },
    totalActivityCount: { type: new GraphQLNonNull(GraphQLInt) },
    activityBreakdown: { type: new GraphQLNonNull(ActivityBreakdownType) },
  }),
});

const ActiveUsersResponseType = new GraphQLObjectType({
  name: 'ActiveUsersResponse',
  fields: () => ({
    data: { type: new GraphQLList(ActiveUserType) },
    summary: {
      type: new GraphQLObjectType({
        name: 'ActiveUsersSummary',
        fields: () => ({
          totalEnrolled: { type: new GraphQLNonNull(GraphQLInt) },
          activeCount: { type: new GraphQLNonNull(GraphQLInt) },
          activePercentage: { type: new GraphQLNonNull(GraphQLFloat) },
        }),
      }),
    },
  }),
});

const CourseStatsType = new GraphQLObjectType({
  name: 'CourseStats',
  fields: () => ({
    enrolledCount: { type: new GraphQLNonNull(GraphQLInt) },
    totalRevenue: { type: new GraphQLNonNull(GraphQLFloat) },
  }),
});

// Queries
const enrollmentQueries = {
  courseEnrollments: {
    type: new GraphQLList(CourseEnrollmentType),
    args: { collectionId: { type: new GraphQLNonNull(GraphQLString) } },
    resolve: async (_: any, args: any) => {
      const result = await enrollmentService.getCollectionEnrollments(args.collectionId, 1, 100);
      return result.data;
    },
  },
  courseStats: {
    type: CourseStatsType,
    args: { collectionId: { type: new GraphQLNonNull(GraphQLString) } },
    resolve: async (_: any, args: any) => {
      return await enrollmentService.getCollectionStats(args.collectionId);
    },
  },
  studentEnrollments: {
    type: new GraphQLList(EnrollmentType),
    args: { studentId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      return await enrollmentService.getStudentEnrollments(args.studentId);
    },
  },
  payment: {
    type: PaymentType,
    args: { paymentId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      return await paymentService.getPaymentById(args.paymentId);
    },
  },
  studentPayments: {
    type: new GraphQLList(PaymentType),
    args: { studentId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      return await paymentService.getPaymentsByStudent(args.studentId);
    },
  },
  coursePayments: {
    type: new GraphQLList(PaymentType),
    args: { courseId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      return await paymentService.getPaymentsByCourse(args.courseId);
    },
  },
  activeUsersInCourse: {
    type: ActiveUsersResponseType,
    args: {
      collectionId: { type: new GraphQLNonNull(GraphQLString) },
      days: { type: GraphQLInt, defaultValue: 7 },
      page: { type: GraphQLInt, defaultValue: 1 },
      limit: { type: GraphQLInt, defaultValue: 20 },
    },
    resolve: async (_: any, args: any) => {
      const result = await enrollmentService.getActiveUsersInCollection(
        args.collectionId,
        args.days || 7,
        args.page || 1,
        args.limit || 20
      );
      return {
        data: result.data.map((user: any) => ({
          ...user,
          enrollmentDate: user.enrollmentDate.toISOString(),
          lastAccessed: user.lastAccessed.toISOString(),
          activityBreakdown: user.activityBreakdown,
        })),
        summary: result.summary,
      };
    },
  },
  activeUserCount: {
    type: GraphQLInt,
    args: {
      collectionId: { type: new GraphQLNonNull(GraphQLString) },
      days: { type: GraphQLInt, defaultValue: 7 },
    },
    resolve: async (_: any, args: any) => {
      return await enrollmentService.getActiveUserCount(args.collectionId, args.days || 7);
    },
  },
};

// Mutations
const enrollmentMutations = {
  enrollCourse: {
    type: EnrollmentType,
    args: {
      collectionId: { type: new GraphQLNonNull(GraphQLString) },
      studentId: { type: new GraphQLNonNull(GraphQLString) },
      amount: { type: new GraphQLNonNull(GraphQLFloat) },
      currency: { type: GraphQLString },
      provider: { type: new GraphQLNonNull(GraphQLString) },
      transactionId: { type: GraphQLString },
    },
    resolve: async (_: any, args: any) => {
      return await enrollmentService.enrollStudent({
        collectionId: args.collectionId,
        studentId: args.studentId,
        amount: args.amount,
        currency: args.currency,
        provider: args.provider,
        transactionId: args.transactionId,
      });
    },
  },
  updatePaymentStatus: {
    type: PaymentType,
    args: {
      paymentId: { type: new GraphQLNonNull(GraphQLInt) },
      status: { type: new GraphQLNonNull(GraphQLString) },
      transactionId: { type: GraphQLString },
    },
    resolve: async (_: any, args: any) => {
      return await paymentService.updatePaymentStatus(args.paymentId, {
        status: args.status,
        transactionId: args.transactionId,
      });
    },
  },
};

export const enrollmentSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: enrollmentQueries,
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: enrollmentMutations,
  }),
});
