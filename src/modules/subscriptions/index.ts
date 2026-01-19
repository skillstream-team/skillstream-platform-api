import { Application } from 'express';
import subscriptionRoutes from './routes/rest/subscription.routes';
import subscriptionAccessRoutes from './routes/rest/subscription-access.routes';

export const registerSubscriptionRoutes = (app: Application) => {
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/subscriptions/access', subscriptionAccessRoutes);
};

export { SubscriptionService } from './services/subscription.service';
export { SubscriptionAccessService } from './services/subscription-access.service';
export * from './dtos/subscription.dto';
