import { Application } from 'express';
import engagementRoutes from './routes/rest/engagement.routes';

export const registerAnalyticsRoutes = (app: Application) => {
  app.use('/api/analytics', engagementRoutes);
};

export { EngagementService } from './services/engagement.service';
