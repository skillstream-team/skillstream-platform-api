import { GraphQLObjectType, GraphQLSchema, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLList, GraphQLNonNull } from 'graphql';
import { CoursesService } from '../../services/service';
import { EnrollmentService } from '../../services/enrollment.service';

const service = new CoursesService();
const enrollmentService = new EnrollmentService();

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
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

const CourseStatsType = new GraphQLObjectType({
  name: 'CourseStats',
  fields: () => ({
    enrolledCount: { type: new GraphQLNonNull(GraphQLInt) },
    totalRevenue: { type: new GraphQLNonNull(GraphQLFloat) },
  }),
});

const CourseType = new GraphQLObjectType({
  name: 'Course',
  fields: () => ({
    id: { type:  new GraphQLNonNull(GraphQLInt) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    price: { type: new GraphQLNonNull(GraphQLFloat) },
    instructorId: { type: GraphQLNonNull(GraphQLInt) },
    instructor: { type: UserType },
    attachments: { type: new GraphQLList(GraphQLString) },
    videos: { type: new GraphQLList(GraphQLString) },
    enrolledCount: { type: GraphQLInt },
    totalRevenue: { type: GraphQLFloat },
    enrollments: { type: new GraphQLList(CourseEnrollmentType) },
    stats: { type: CourseStatsType },
  }),
});

const coursesQuery = {
  courses: {
    type: new GraphQLList(CourseType),
    args: {
      page: { type: GraphQLInt },
      limit: { type: GraphQLInt },
    },
    resolve: async (_: any, args: any) => {
      const result = await service.getAllCourses(args.page || 1, args.limit || 20);
      return (result.data as any[]).map((course: any) => ({
        ...course,
        id: Number(course.id),
        enrolledCount: course.enrollments?.length || 0,
        totalRevenue: (course.payments?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0),
        enrollments: course.enrollments?.map((enrollment: any) => ({
          id: enrollment.student.id,
          username: enrollment.student.username,
          email: enrollment.student.email,
          enrollmentDate: enrollment.createdAt.toISOString(),
        })) || [],
        stats: {
          enrolledCount: course.enrollments?.length || 0,
          totalRevenue: (course.payments?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0),
        },
      }));
    },
  },
  course: {
    type: CourseType,
    args: { id: { type: GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
        const course = await service.getCourseById(String(args.id)) as any;
        if (!course) return null;
        return {
          ...course,
          id: Number(course.id),
          enrolledCount: course.enrollments?.length || 0,
          totalRevenue: (course.payments?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0),
          enrollments: course.enrollments?.map((enrollment: any) => ({
            id: enrollment.student.id,
            username: enrollment.student.username,
            email: enrollment.student.email,
            enrollmentDate: enrollment.createdAt.toISOString(),
          })) || [],
          stats: {
            enrolledCount: course.enrollments?.length || 0,
            totalRevenue: (course.payments?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0),
          },
        };
    }
  },
  courseEnrollments: {
    type: new GraphQLList(CourseEnrollmentType),
    args: { 
      courseId: { type: new GraphQLNonNull(GraphQLInt) },
      page: { type: GraphQLInt },
      limit: { type: GraphQLInt },
    },
    resolve: async (_: any, args: any) => {
      const result = await enrollmentService.getCourseEnrollments(
        String(args.courseId),
        args.page || 1,
        args.limit || 20
      );
      return result.data;
    },
  },
  courseStats: {
    type: CourseStatsType,
    args: { courseId: { type: new GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      return await enrollmentService.getCourseStats(String(args.courseId));
    },
  },
};

const coursesMutation = {
  createCourse: {
    type: CourseType,
    args: {
      title: { type: GraphQLNonNull(GraphQLString) },
      description: { type: GraphQLNonNull(GraphQLString) },
      price: { type: GraphQLNonNull(GraphQLFloat) },
      instructorId: { type: GraphQLNonNull(GraphQLInt) },
    },
    resolve: async (_: any, args: any) => {
        const created = await service.createCourse(args);
        return { ...created, id: Number(created.id) };
    }
  },
  updateCourse: {
    type: CourseType,
    args: {
      id: { type: GraphQLNonNull(GraphQLInt) },
      title: { type: GraphQLString },
      description: { type: GraphQLString },
      price: { type: GraphQLFloat },
    },
    resolve: async (_: any, args: any) => {
        const updated = await service.updateCourse(String(args.id), args);
        return { ...updated, id: Number(updated.id) };
    }
  },
  deleteCourse: {
    type: GraphQLString,
    args: { id: { type: GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      await service.deleteCourse(String(args.id));
      return 'Course deleted';
    },
  },
  enrollCourse: {
    type: GraphQLString,
    args: {
      courseId: { type: GraphQLNonNull(GraphQLInt) },
      studentId: { type: GraphQLNonNull(GraphQLInt) },
      amount: { type: GraphQLNonNull(GraphQLFloat) },
      currency: { type: GraphQLString },
      provider: { type: GraphQLNonNull(GraphQLString) },
      transactionId: { type: GraphQLString },
    },
    resolve: async (_: any, args: any) => {
      try {
        await enrollmentService.enrollStudent({
          courseId: String(args.courseId),
          studentId: String(args.studentId),
          amount: args.amount,
          currency: args.currency,
          provider: args.provider,
          transactionId: args.transactionId,
        });
        return 'Successfully enrolled in course';
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to enroll in course');
      }
    },
  },
};

export const coursesSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: coursesQuery,
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: coursesMutation,
  }),
});