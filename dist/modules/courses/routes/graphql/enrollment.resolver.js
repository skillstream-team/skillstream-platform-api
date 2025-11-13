"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrollmentSchema = void 0;
const graphql_1 = require("graphql");
const enrollment_service_1 = require("../../services/enrollment.service");
const payment_service_1 = require("../../services/payment.service");
const enrollmentService = new enrollment_service_1.EnrollmentService();
const paymentService = new payment_service_1.PaymentService();
// Enums
const PaymentStatusEnum = new graphql_1.GraphQLEnumType({
    name: 'PaymentStatus',
    values: {
        PENDING: { value: 'PENDING' },
        COMPLETED: { value: 'COMPLETED' },
        FAILED: { value: 'FAILED' },
    },
});
const PaymentProviderEnum = new graphql_1.GraphQLEnumType({
    name: 'PaymentProvider',
    values: {
        STRIPE: { value: 'stripe' },
        PAYPAL: { value: 'paypal' },
    },
});
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
        price: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
    }),
});
const PaymentType = new graphql_1.GraphQLObjectType({
    name: 'Payment',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        amount: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
        currency: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        status: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        provider: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        transactionId: { type: graphql_1.GraphQLString },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        student: { type: UserType },
        course: { type: CourseType },
    }),
});
const EnrollmentType = new graphql_1.GraphQLObjectType({
    name: 'Enrollment',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        studentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        paymentId: { type: graphql_1.GraphQLInt },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        course: { type: CourseType },
        student: { type: UserType },
        payment: { type: PaymentType },
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
// Queries
const enrollmentQueries = {
    courseEnrollments: {
        type: new graphql_1.GraphQLList(CourseEnrollmentType),
        args: { courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await enrollmentService.getCourseEnrollments(args.courseId);
        },
    },
    courseStats: {
        type: CourseStatsType,
        args: { courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await enrollmentService.getCourseStats(args.courseId);
        },
    },
    studentEnrollments: {
        type: new graphql_1.GraphQLList(EnrollmentType),
        args: { studentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await enrollmentService.getStudentEnrollments(args.studentId);
        },
    },
    payment: {
        type: PaymentType,
        args: { paymentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await paymentService.getPaymentById(args.paymentId);
        },
    },
    studentPayments: {
        type: new graphql_1.GraphQLList(PaymentType),
        args: { studentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await paymentService.getPaymentsByStudent(args.studentId);
        },
    },
    coursePayments: {
        type: new graphql_1.GraphQLList(PaymentType),
        args: { courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            return await paymentService.getPaymentsByCourse(args.courseId);
        },
    },
};
// Mutations
const enrollmentMutations = {
    enrollCourse: {
        type: EnrollmentType,
        args: {
            courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            studentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            amount: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
            currency: { type: graphql_1.GraphQLString },
            provider: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            transactionId: { type: graphql_1.GraphQLString },
        },
        resolve: async (_, args) => {
            return await enrollmentService.enrollStudent({
                courseId: args.courseId,
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
            paymentId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            status: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
            transactionId: { type: graphql_1.GraphQLString },
        },
        resolve: async (_, args) => {
            return await paymentService.updatePaymentStatus(args.paymentId, {
                status: args.status,
                transactionId: args.transactionId,
            });
        },
    },
};
exports.enrollmentSchema = new graphql_1.GraphQLSchema({
    query: new graphql_1.GraphQLObjectType({
        name: 'Query',
        fields: enrollmentQueries,
    }),
    mutation: new graphql_1.GraphQLObjectType({
        name: 'Mutation',
        fields: enrollmentMutations,
    }),
});
