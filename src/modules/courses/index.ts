import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import restCoursesRoutes from './routes/rest/courses.routes';
import progressRoutes from './routes/rest/progress.routes';
import announcementsRoutes from './routes/rest/announcements.routes';
import recommendationsUserRoutes from './routes/rest/recommendations-user.routes';
import bookingsRoutes from './routes/rest/bookings.routes';
import lessonsRoutes from './routes/rest/lessons.routes';
import earningsRoutes from './routes/rest/earnings.routes';
import certificatesRoutes from './routes/rest/certificates.routes';
import attendanceRoutes from './routes/rest/attendance.routes';
import resourcesRoutes from './routes/rest/resources.routes';
import videoRoutes from './routes/rest/video.routes';
import marketingRoutes from './routes/rest/marketing.routes';
import calendarRoutes from './routes/rest/calendar.routes';
import recommendationsRoutes from './routes/rest/recommendations.routes';
import pollsRoutes from './routes/rest/polls.routes';
import whiteboardRoutes from './routes/rest/whiteboard.routes';
import contentVersioningRoutes from './routes/rest/content-versioning.routes';
import contentModerationRoutes from './routes/rest/content-moderation.routes';
import reviewsRoutes from './routes/rest/reviews.routes';
import forumsRoutes from './routes/rest/forums.routes';
import videoFeaturesRoutes from './routes/rest/video-features.routes';
import collaborationRoutes from './routes/rest/collaboration.routes';
import teacherEarningsRoutes from './routes/rest/teacher-earnings.routes';
import categoriesRoutes from './routes/rest/categories.routes';
import wishlistRoutes from './routes/rest/wishlist.routes';
import prerequisitesRoutes from './routes/rest/prerequisites.routes';
import dashboardRoutes from './routes/rest/dashboard.routes';
import bundlesRoutes from './routes/rest/bundles.routes';
import couponsRoutes from './routes/rest/coupons.routes';
import learningPathsRoutes from './routes/rest/learning-paths.routes';
import tagsRoutes from './routes/rest/tags.routes';
import tagsPlatformRoutes from './routes/rest/tags-platform.routes';
import instructorQARoutes from './routes/rest/instructor-qa.routes';
import referralRoutes from './routes/rest/referral.routes';
import shareRoutes from './routes/rest/share.routes';
import comparisonRoutes from './routes/rest/comparison.routes';
import courseImportRoutes from './routes/rest/course-import.routes';
import lessonPaymentRoutes from './routes/rest/lesson-payment.routes';
import { coursesSchema } from './routes/graphql/course.resolver';
import { enrollmentSchema } from './routes/graphql/enrollment.resolver';
import { mediaSchema } from './routes/graphql/media.resolver';
import { recommendationSchema } from './routes/graphql/recommendation.resolver';
import { calendarSchema } from './routes/graphql/calendar.resolver';

export function registerCoursesModule(app: express.Application) {
  // REST routes
  app.use('/api/courses', restCoursesRoutes);
  app.use('/api', progressRoutes);
  app.use('/api', announcementsRoutes);
  app.use('/api', recommendationsUserRoutes);
  app.use('/api', bookingsRoutes);
  app.use('/api', lessonsRoutes);
  app.use('/api', earningsRoutes);
  app.use('/api', certificatesRoutes);
  app.use('/api', attendanceRoutes);
  app.use('/api', resourcesRoutes);
  app.use('/api', videoRoutes);
  app.use('/api', marketingRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/recommendations', recommendationsRoutes);
  app.use('/api/polls', pollsRoutes);
  app.use('/api/whiteboards', whiteboardRoutes);
  app.use('/api', contentVersioningRoutes);
  app.use('/api', contentModerationRoutes);
  app.use('/api', reviewsRoutes);
  app.use('/api', forumsRoutes);
  app.use('/api', videoFeaturesRoutes);
  app.use('/api', collaborationRoutes);
  app.use('/api', teacherEarningsRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/courses/wishlist', wishlistRoutes);
  app.use('/api/courses', prerequisitesRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/bundles', bundlesRoutes);
  app.use('/api/coupons', couponsRoutes);
  app.use('/api/learning-paths', learningPathsRoutes);
  app.use('/api/courses', tagsRoutes); // Course-specific tag routes
  app.use('/api/tags', tagsPlatformRoutes); // Platform-wide tag routes
  app.use('/api/courses', instructorQARoutes);
  app.use('/api/referrals', referralRoutes);
  app.use('/api/courses', shareRoutes);
  app.use('/api/courses', comparisonRoutes);
  app.use('/api/courses', courseImportRoutes);
  app.use('/api', lessonPaymentRoutes);

  // GraphQL endpoints
  app.use('/graphql/courses', graphqlHTTP({
    schema: coursesSchema,
    graphiql: true,
  }));

  app.use('/graphql/enrollments', graphqlHTTP({
    schema: enrollmentSchema,
    graphiql: true,
  }));

  app.use('/graphql/media', graphqlHTTP({
    schema: mediaSchema,
    graphiql: true,
  }));

  app.use('/graphql/recommendations', graphqlHTTP({
    schema: recommendationSchema,
    graphiql: true,
  }));

  app.use('/graphql/calendar', graphqlHTTP({
    schema: calendarSchema,
    graphiql: true,
  }));
}

export { CoursesService } from './services/service';
export { EnrollmentService } from './services/enrollment.service';
export { PaymentService } from './services/payment.service';
export { MediaService } from './services/media.service';
export { CloudflareR2Service } from './services/cloudflare-r2.service';
export { CloudflareStreamService } from './services/cloudflare-stream.service';
export { RealtimeService } from './services/realtime.service';
export { RecommendationService } from './services/recommendation.service';
export { CalendarService } from './services/calendar.service';
export { PollService } from './services/poll.service';
export { WhiteboardService } from './services/whiteboard.service';
export { TeacherEarningsService } from './services/teacher-earnings.service';
export { CategoryService } from './services/category.service';
export { WishlistService } from './services/wishlist.service';
export { PrerequisitesService } from './services/prerequisites.service';
export { DashboardService } from './services/dashboard.service';
export { BundlesService } from './services/bundles.service';
export { CouponsService } from './services/coupons.service';
export { LearningPathsService } from './services/learning-paths.service';
export { TagsService } from './services/tags.service';
export { InstructorQAService } from './services/instructor-qa.service';
export { ReferralService } from './services/referral.service';
export { ShareService } from './services/share.service';
export { ComparisonService } from './services/comparison.service';
export { CourseImportService } from './services/course-import.service';
export { coursesSchema };
export { enrollmentSchema };
export { mediaSchema };
export { recommendationSchema };
export { calendarSchema };
export * from './dtos/enrollment.dto';
export * from './dtos/payment.dto';
export * from './dtos/media.dto';
export * from './dtos/recommendation.dto';
export * from './dtos/calendar.dto';
export * from './dtos/whiteboard.dto';
