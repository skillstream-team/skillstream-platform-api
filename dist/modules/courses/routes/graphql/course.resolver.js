"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coursesSchema = void 0;
const graphql_1 = require("graphql");
const service_1 = require("../../services/service");
const enrollment_service_1 = require("../../services/enrollment.service");
const service = new service_1.CoursesService();
const enrollmentService = new enrollment_service_1.EnrollmentService();
const UserType = new graphql_1.GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        username: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        email: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
const CourseEnrollmentType = new graphql_1.GraphQLObjectType({
    name: 'CourseEnrollment',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        username: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        email: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        enrollmentDate: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
const CourseStatsType = new graphql_1.GraphQLObjectType({
    name: 'CourseStats',
    fields: () => ({
        enrolledCount: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        totalRevenue: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
    }),
});
const CourseType = new graphql_1.GraphQLObjectType({
    name: 'Course',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        description: { type: graphql_1.GraphQLString },
        price: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
        instructorId: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) },
        instructor: { type: UserType },
        attachments: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        videos: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        enrolledCount: { type: graphql_1.GraphQLInt },
        totalRevenue: { type: graphql_1.GraphQLFloat },
        enrollments: { type: new graphql_1.GraphQLList(CourseEnrollmentType) },
        stats: { type: CourseStatsType },
    }),
});
const coursesQuery = {
    courses: {
        type: new graphql_1.GraphQLList(CourseType),
        args: {
            page: { type: graphql_1.GraphQLInt },
            limit: { type: graphql_1.GraphQLInt },
        },
        resolve: async (_, args) => {
            const result = await service.getAllCourses(args.page || 1, args.limit || 20);
            return result.data.map((course) => ({
                ...course,
                id: Number(course.id),
                enrolledCount: course.enrollments?.length || 0,
                totalRevenue: (course.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0),
                enrollments: course.enrollments?.map((enrollment) => ({
                    id: enrollment.student.id,
                    username: enrollment.student.username,
                    email: enrollment.student.email,
                    enrollmentDate: enrollment.createdAt.toISOString(),
                })) || [],
                stats: {
                    enrolledCount: course.enrollments?.length || 0,
                    totalRevenue: (course.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0),
                },
            }));
        },
    },
    course: {
        type: CourseType,
        args: { id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            const course = await service.getCourseById(String(args.id));
            if (!course)
                return null;
            return {
                ...course,
                id: Number(course.id),
                enrolledCount: course.enrollments?.length || 0,
                totalRevenue: (course.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0),
                enrollments: course.enrollments?.map((enrollment) => ({
                    id: enrollment.student.id,
                    username: enrollment.student.username,
                    email: enrollment.student.email,
                    enrollmentDate: enrollment.createdAt.toISOString(),
                })) || [],
                stats: {
                    enrolledCount: course.enrollments?.length || 0,
                    totalRevenue: (course.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0),
                },
            };
        }
    },
    courseEnrollments: {
        type: new graphql_1.GraphQLList(CourseEnrollmentType),
        args: {
            courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            page: { type: graphql_1.GraphQLInt },
            limit: { type: graphql_1.GraphQLInt },
        },
        resolve: async (_, args) => {
            const result = await enrollmentService.getCourseEnrollments(String(args.courseId), args.page || 1, args.limit || 20);
            return result.data;
        },
    },
    courseStats: {
        type: CourseStatsType,
        args: { courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await enrollmentService.getCourseStats(String(args.courseId));
        },
    },
};
const coursesMutation = {
    createCourse: {
        type: CourseType,
        args: {
            title: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
            description: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
            price: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLFloat) },
            instructorId: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) },
        },
        resolve: async (_, args) => {
            const created = await service.createCourse(args);
            return { ...created, id: Number(created.id) };
        }
    },
    updateCourse: {
        type: CourseType,
        args: {
            id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) },
            title: { type: graphql_1.GraphQLString },
            description: { type: graphql_1.GraphQLString },
            price: { type: graphql_1.GraphQLFloat },
        },
        resolve: async (_, args) => {
            const updated = await service.updateCourse(String(args.id), args);
            return { ...updated, id: Number(updated.id) };
        }
    },
    deleteCourse: {
        type: graphql_1.GraphQLString,
        args: { id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            await service.deleteCourse(String(args.id));
            return 'Course deleted';
        },
    },
    enrollCourse: {
        type: graphql_1.GraphQLString,
        args: {
            courseId: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) },
            studentId: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) },
            amount: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLFloat) },
            currency: { type: graphql_1.GraphQLString },
            provider: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
            transactionId: { type: graphql_1.GraphQLString },
        },
        resolve: async (_, args) => {
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
            }
            catch (error) {
                throw new Error(error instanceof Error ? error.message : 'Failed to enroll in course');
            }
        },
    },
};
exports.coursesSchema = new graphql_1.GraphQLSchema({
    query: new graphql_1.GraphQLObjectType({
        name: 'Query',
        fields: coursesQuery,
    }),
    mutation: new graphql_1.GraphQLObjectType({
        name: 'Mutation',
        fields: coursesMutation,
    }),
});
