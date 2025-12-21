import { Application } from 'express';
import subscriptionRoutes from './routes/rest/subscription.routes';

export const registerSubscriptionRoutes = (app: Application) => {
  app.use('/api/subscriptions', subscriptionRoutes);
};

export { SubscriptionService } from './services/subscription.service';
export * from './dtos/subscription.dto';
