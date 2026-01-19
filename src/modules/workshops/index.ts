import { Application } from 'express';
import workshopRoutes from './routes/rest/workshops.routes';

export const registerWorkshopRoutes = (app: Application) => {
  app.use('/api/workshops', workshopRoutes);
};

export { WorkshopService } from './services/workshop.service';
