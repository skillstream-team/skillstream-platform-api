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
