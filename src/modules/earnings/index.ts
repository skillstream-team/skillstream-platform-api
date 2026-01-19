import { Application } from 'express';
import earningsRoutes from './routes/rest/earnings.routes';

export const registerEarningsRoutes = (app: Application) => {
  app.use('/api/earnings', earningsRoutes);
};

export { TeacherEarningsService } from './services/teacher-earnings.service';
export { SubscriptionRevenueService } from './services/subscription-revenue.service';
