"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarSchema = exports.recommendationSchema = exports.mediaSchema = exports.enrollmentSchema = exports.coursesSchema = exports.CalendarService = exports.RecommendationService = exports.RealtimeService = exports.CloudflareStreamService = exports.CloudflareR2Service = exports.MediaService = exports.PaymentService = exports.EnrollmentService = exports.CoursesService = void 0;
exports.registerCoursesModule = registerCoursesModule;
const express_graphql_1 = require("express-graphql");
const courses_routes_1 = __importDefault(require("./routes/rest/courses.routes"));
const course_resolver_1 = require("./routes/graphql/course.resolver");
Object.defineProperty(exports, "coursesSchema", { enumerable: true, get: function () { return course_resolver_1.coursesSchema; } });
const enrollment_resolver_1 = require("./routes/graphql/enrollment.resolver");
Object.defineProperty(exports, "enrollmentSchema", { enumerable: true, get: function () { return enrollment_resolver_1.enrollmentSchema; } });
const media_resolver_1 = require("./routes/graphql/media.resolver");
Object.defineProperty(exports, "mediaSchema", { enumerable: true, get: function () { return media_resolver_1.mediaSchema; } });
const recommendation_resolver_1 = require("./routes/graphql/recommendation.resolver");
Object.defineProperty(exports, "recommendationSchema", { enumerable: true, get: function () { return recommendation_resolver_1.recommendationSchema; } });
const calendar_resolver_1 = require("./routes/graphql/calendar.resolver");
Object.defineProperty(exports, "calendarSchema", { enumerable: true, get: function () { return calendar_resolver_1.calendarSchema; } });
function registerCoursesModule(app) {
    // REST routes
    app.use('/api/courses', courses_routes_1.default);
    // GraphQL endpoints
    app.use('/graphql/courses', (0, express_graphql_1.graphqlHTTP)({
        schema: course_resolver_1.coursesSchema,
        graphiql: true,
    }));
    app.use('/graphql/enrollments', (0, express_graphql_1.graphqlHTTP)({
        schema: enrollment_resolver_1.enrollmentSchema,
        graphiql: true,
    }));
    app.use('/graphql/media', (0, express_graphql_1.graphqlHTTP)({
        schema: media_resolver_1.mediaSchema,
        graphiql: true,
    }));
    app.use('/graphql/recommendations', (0, express_graphql_1.graphqlHTTP)({
        schema: recommendation_resolver_1.recommendationSchema,
        graphiql: true,
    }));
    app.use('/graphql/calendar', (0, express_graphql_1.graphqlHTTP)({
        schema: calendar_resolver_1.calendarSchema,
        graphiql: true,
    }));
}
var service_1 = require("./services/service");
Object.defineProperty(exports, "CoursesService", { enumerable: true, get: function () { return service_1.CoursesService; } });
var enrollment_service_1 = require("./services/enrollment.service");
Object.defineProperty(exports, "EnrollmentService", { enumerable: true, get: function () { return enrollment_service_1.EnrollmentService; } });
var payment_service_1 = require("./services/payment.service");
Object.defineProperty(exports, "PaymentService", { enumerable: true, get: function () { return payment_service_1.PaymentService; } });
var media_service_1 = require("./services/media.service");
Object.defineProperty(exports, "MediaService", { enumerable: true, get: function () { return media_service_1.MediaService; } });
var cloudflare_r2_service_1 = require("./services/cloudflare-r2.service");
Object.defineProperty(exports, "CloudflareR2Service", { enumerable: true, get: function () { return cloudflare_r2_service_1.CloudflareR2Service; } });
var cloudflare_stream_service_1 = require("./services/cloudflare-stream.service");
Object.defineProperty(exports, "CloudflareStreamService", { enumerable: true, get: function () { return cloudflare_stream_service_1.CloudflareStreamService; } });
var realtime_service_1 = require("./services/realtime.service");
Object.defineProperty(exports, "RealtimeService", { enumerable: true, get: function () { return realtime_service_1.RealtimeService; } });
var recommendation_service_1 = require("./services/recommendation.service");
Object.defineProperty(exports, "RecommendationService", { enumerable: true, get: function () { return recommendation_service_1.RecommendationService; } });
var calendar_service_1 = require("./services/calendar.service");
Object.defineProperty(exports, "CalendarService", { enumerable: true, get: function () { return calendar_service_1.CalendarService; } });
__exportStar(require("./dtos/enrollment.dto"), exports);
__exportStar(require("./dtos/payment.dto"), exports);
__exportStar(require("./dtos/media.dto"), exports);
__exportStar(require("./dtos/recommendation.dto"), exports);
__exportStar(require("./dtos/calendar.dto"), exports);
