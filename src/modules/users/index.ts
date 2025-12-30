// modules/users/index.ts
import restRoutes from './routes/rest/users.routes';
import oauthRoutes from './routes/rest/oauth.routes';
import adminRoutes from './routes/rest/admin.routes';
import settingsRoutes from './routes/rest/settings.routes';
import notificationsRoutes from './routes/rest/notifications.routes';
import pushNotificationsRoutes from './routes/rest/push-notifications.routes';
import dataExportRoutes from './routes/rest/data-export.routes';
import webhooksRoutes from './routes/rest/webhooks.routes';
import analyticsRoutes from './routes/rest/analytics.routes';
import apiKeysRoutes from './routes/rest/api-keys.routes';
import bulkOperationsRoutes from './routes/rest/bulk-operations.routes';
import activityLogRoutes from './routes/rest/activity-log.routes';
import gamificationRoutes from './routes/rest/gamification.routes';
import adminManagementRoutes from './routes/rest/admin-management.routes';
import adminPlatformRoutes from './routes/rest/admin-platform.routes';
import { usersSchema } from './routes/graphql/users.resolver';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';

export function registerUserModule(app: express.Application) {
  // REST
  app.use('/api/users', restRoutes);
  app.use('/api', oauthRoutes);
  app.use('/api', adminRoutes);
  app.use('/api', settingsRoutes);
  app.use('/api', notificationsRoutes);
  app.use('/api/users', pushNotificationsRoutes);
  app.use('/api', dataExportRoutes);
  app.use('/api', webhooksRoutes);
  app.use('/api', analyticsRoutes);
  app.use('/api', apiKeysRoutes);
  app.use('/api', bulkOperationsRoutes);
  app.use('/api', activityLogRoutes);
  app.use('/api', gamificationRoutes);
  app.use('/api', adminManagementRoutes);
  app.use('/api', adminPlatformRoutes);

  // GraphQL
  app.use('/graphql/users', graphqlHTTP({
    schema: usersSchema,
    graphiql: true,
  }));
}