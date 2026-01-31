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
exports.calendarSchema = exports.recommendationSchema = exports.mediaSchema = exports.enrollmentSchema = exports.coursesSchema = exports.MonetizationService = exports.CourseImportService = exports.ComparisonService = exports.ShareService = exports.ReferralService = exports.InstructorQAService = exports.TagsService = exports.LearningPathsService = exports.CouponsService = exports.BundlesService = exports.DashboardService = exports.PrerequisitesService = exports.WishlistService = exports.CategoryService = exports.TeacherEarningsService = exports.WhiteboardService = exports.PollService = exports.CalendarService = exports.RecommendationService = exports.RealtimeService = exports.CloudflareStreamService = exports.CloudflareR2Service = exports.MediaService = exports.PaymentService = exports.EnrollmentService = exports.ProgramsService = exports.CollectionsService = void 0;
exports.registerCoursesModule = registerCoursesModule;
const express_graphql_1 = require("express-graphql");
const courses_routes_1 = __importDefault(require("./routes/rest/courses.routes"));
const progress_routes_1 = __importDefault(require("./routes/rest/progress.routes"));
const enrollments_routes_1 = __importDefault(require("./routes/rest/enrollments.routes"));
const announcements_routes_1 = __importDefault(require("./routes/rest/announcements.routes"));
const recommendations_user_routes_1 = __importDefault(require("./routes/rest/recommendations-user.routes"));
const bookings_routes_1 = __importDefault(require("./routes/rest/bookings.routes"));
const lessons_routes_1 = __importDefault(require("./routes/rest/lessons.routes"));
const earnings_routes_1 = __importDefault(require("./routes/rest/earnings.routes"));
const certificates_routes_1 = __importDefault(require("./routes/rest/certificates.routes"));
const attendance_routes_1 = __importDefault(require("./routes/rest/attendance.routes"));
const resources_routes_1 = __importDefault(require("./routes/rest/resources.routes"));
const video_routes_1 = __importDefault(require("./routes/rest/video.routes"));
const marketing_routes_1 = __importDefault(require("./routes/rest/marketing.routes"));
const calendar_routes_1 = __importDefault(require("./routes/rest/calendar.routes"));
const recommendations_routes_1 = __importDefault(require("./routes/rest/recommendations.routes"));
const polls_routes_1 = __importDefault(require("./routes/rest/polls.routes"));
const whiteboard_routes_1 = __importDefault(require("./routes/rest/whiteboard.routes"));
const content_versioning_routes_1 = __importDefault(require("./routes/rest/content-versioning.routes"));
const content_moderation_routes_1 = __importDefault(require("./routes/rest/content-moderation.routes"));
const reviews_routes_1 = __importDefault(require("./routes/rest/reviews.routes"));
const forums_routes_1 = __importDefault(require("./routes/rest/forums.routes"));
const video_features_routes_1 = __importDefault(require("./routes/rest/video-features.routes"));
const collaboration_routes_1 = __importDefault(require("./routes/rest/collaboration.routes"));
const teacher_earnings_routes_1 = __importDefault(require("./routes/rest/teacher-earnings.routes"));
const categories_routes_1 = __importDefault(require("./routes/rest/categories.routes"));
const wishlist_routes_1 = __importDefault(require("./routes/rest/wishlist.routes"));
const prerequisites_routes_1 = __importDefault(require("./routes/rest/prerequisites.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/rest/dashboard.routes"));
const bundles_routes_1 = __importDefault(require("./routes/rest/bundles.routes"));
const coupons_routes_1 = __importDefault(require("./routes/rest/coupons.routes"));
const learning_paths_routes_1 = __importDefault(require("./routes/rest/learning-paths.routes"));
const tags_routes_1 = __importDefault(require("./routes/rest/tags.routes"));
const tags_platform_routes_1 = __importDefault(require("./routes/rest/tags-platform.routes"));
const instructor_qa_routes_1 = __importDefault(require("./routes/rest/instructor-qa.routes"));
const referral_routes_1 = __importDefault(require("./routes/rest/referral.routes"));
const share_routes_1 = __importDefault(require("./routes/rest/share.routes"));
const comparison_routes_1 = __importDefault(require("./routes/rest/comparison.routes"));
const course_import_routes_1 = __importDefault(require("./routes/rest/course-import.routes"));
const lesson_payment_routes_1 = __importDefault(require("./routes/rest/lesson-payment.routes"));
const lesson_purchase_routes_1 = __importDefault(require("./routes/rest/lesson-purchase.routes"));
const monetization_routes_1 = __importDefault(require("./routes/rest/monetization.routes"));
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
    // Register specific routes BEFORE the main programs router to ensure they match first
    // This prevents /api/programs/:id from matching routes like /api/programs/wishlist
    app.use('/api/programs/wishlist', wishlist_routes_1.default);
    // Register main programs router AFTER specific routes
    // This ensures POST /api/programs matches before parameterized routes
    app.use('/api/programs', courses_routes_1.default);
    // Alias /api/courses to /api/programs for backward compatibility
    app.use('/api/courses', courses_routes_1.default);
    // Register other specific program sub-routes AFTER the main router
    // These have parameterized routes like /:programId/tags which won't conflict
    app.use('/api/programs', prerequisites_routes_1.default);
    app.use('/api/programs', tags_routes_1.default); // Program-specific tag routes
    app.use('/api/programs', instructor_qa_routes_1.default);
    app.use('/api/programs', share_routes_1.default);
    app.use('/api/programs', comparison_routes_1.default);
    app.use('/api/programs', course_import_routes_1.default);
    // Alias /api/courses for all sub-routes too
    app.use('/api/courses', prerequisites_routes_1.default);
    app.use('/api/courses', tags_routes_1.default);
    app.use('/api/courses', instructor_qa_routes_1.default);
    app.use('/api/courses', share_routes_1.default);
    app.use('/api/courses', comparison_routes_1.default);
    app.use('/api/courses', course_import_routes_1.default);
    app.use('/api', progress_routes_1.default);
    app.use('/api/enrollments', enrollments_routes_1.default);
    app.use('/api', announcements_routes_1.default);
    app.use('/api', recommendations_user_routes_1.default);
    app.use('/api', bookings_routes_1.default);
    // Register resources routes BEFORE lessons routes to ensure more specific routes match first
    app.use('/api', resources_routes_1.default);
    app.use('/api', lessons_routes_1.default); // Note: routes are now /api/modules but file is still lessons.routes.ts for now
    app.use('/api', earnings_routes_1.default);
    app.use('/api', certificates_routes_1.default);
    app.use('/api', attendance_routes_1.default);
    app.use('/api', video_routes_1.default);
    app.use('/api', marketing_routes_1.default);
    app.use('/api/calendar', calendar_routes_1.default);
    app.use('/api/recommendations', recommendations_routes_1.default);
    app.use('/api/polls', polls_routes_1.default);
    app.use('/api/whiteboards', whiteboard_routes_1.default);
    app.use('/api', content_versioning_routes_1.default);
    app.use('/api', content_moderation_routes_1.default);
    app.use('/api', reviews_routes_1.default);
    app.use('/api', forums_routes_1.default);
    app.use('/api', video_features_routes_1.default);
    app.use('/api', collaboration_routes_1.default);
    app.use('/api', teacher_earnings_routes_1.default);
    app.use('/api/categories', categories_routes_1.default);
    app.use('/api/dashboard', dashboard_routes_1.default);
    app.use('/api/bundles', bundles_routes_1.default);
    app.use('/api/coupons', coupons_routes_1.default);
    app.use('/api/learning-paths', learning_paths_routes_1.default);
    app.use('/api/tags', tags_platform_routes_1.default); // Platform-wide tag routes
    app.use('/api/referrals', referral_routes_1.default);
    app.use('/api', lesson_payment_routes_1.default);
    app.use('/api', lesson_purchase_routes_1.default);
    app.use('/api', monetization_routes_1.default);
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
Object.defineProperty(exports, "CollectionsService", { enumerable: true, get: function () { return service_1.CollectionsService; } });
Object.defineProperty(exports, "ProgramsService", { enumerable: true, get: function () { return service_1.ProgramsService; } });
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
var poll_service_1 = require("./services/poll.service");
Object.defineProperty(exports, "PollService", { enumerable: true, get: function () { return poll_service_1.PollService; } });
var whiteboard_service_1 = require("./services/whiteboard.service");
Object.defineProperty(exports, "WhiteboardService", { enumerable: true, get: function () { return whiteboard_service_1.WhiteboardService; } });
var teacher_earnings_service_1 = require("./services/teacher-earnings.service");
Object.defineProperty(exports, "TeacherEarningsService", { enumerable: true, get: function () { return teacher_earnings_service_1.TeacherEarningsService; } });
var category_service_1 = require("./services/category.service");
Object.defineProperty(exports, "CategoryService", { enumerable: true, get: function () { return category_service_1.CategoryService; } });
var wishlist_service_1 = require("./services/wishlist.service");
Object.defineProperty(exports, "WishlistService", { enumerable: true, get: function () { return wishlist_service_1.WishlistService; } });
var prerequisites_service_1 = require("./services/prerequisites.service");
Object.defineProperty(exports, "PrerequisitesService", { enumerable: true, get: function () { return prerequisites_service_1.PrerequisitesService; } });
var dashboard_service_1 = require("./services/dashboard.service");
Object.defineProperty(exports, "DashboardService", { enumerable: true, get: function () { return dashboard_service_1.DashboardService; } });
var bundles_service_1 = require("./services/bundles.service");
Object.defineProperty(exports, "BundlesService", { enumerable: true, get: function () { return bundles_service_1.BundlesService; } });
var coupons_service_1 = require("./services/coupons.service");
Object.defineProperty(exports, "CouponsService", { enumerable: true, get: function () { return coupons_service_1.CouponsService; } });
var learning_paths_service_1 = require("./services/learning-paths.service");
Object.defineProperty(exports, "LearningPathsService", { enumerable: true, get: function () { return learning_paths_service_1.LearningPathsService; } });
var tags_service_1 = require("./services/tags.service");
Object.defineProperty(exports, "TagsService", { enumerable: true, get: function () { return tags_service_1.TagsService; } });
var instructor_qa_service_1 = require("./services/instructor-qa.service");
Object.defineProperty(exports, "InstructorQAService", { enumerable: true, get: function () { return instructor_qa_service_1.InstructorQAService; } });
var referral_service_1 = require("./services/referral.service");
Object.defineProperty(exports, "ReferralService", { enumerable: true, get: function () { return referral_service_1.ReferralService; } });
var share_service_1 = require("./services/share.service");
Object.defineProperty(exports, "ShareService", { enumerable: true, get: function () { return share_service_1.ShareService; } });
var comparison_service_1 = require("./services/comparison.service");
Object.defineProperty(exports, "ComparisonService", { enumerable: true, get: function () { return comparison_service_1.ComparisonService; } });
var course_import_service_1 = require("./services/course-import.service");
Object.defineProperty(exports, "CourseImportService", { enumerable: true, get: function () { return course_import_service_1.CourseImportService; } });
var monetization_service_1 = require("./services/monetization.service");
Object.defineProperty(exports, "MonetizationService", { enumerable: true, get: function () { return monetization_service_1.MonetizationService; } });
__exportStar(require("./dtos/enrollment.dto"), exports);
__exportStar(require("./dtos/payment.dto"), exports);
__exportStar(require("./dtos/media.dto"), exports);
__exportStar(require("./dtos/recommendation.dto"), exports);
__exportStar(require("./dtos/calendar.dto"), exports);
__exportStar(require("./dtos/whiteboard.dto"), exports);
