// src/modules/messaging/index.ts
import express from 'express';
import messagingRoutes from './routes/rest/messaging.routes';
import { RealtimeMessagingService } from './services/realtime-messaging.service';
import { logger } from '../../utils/logger';

let realtimeService: RealtimeMessagingService | null = null;

export function registerMessagingModule(app: express.Application, io?: any) {
  // REST routes
  app.use('/api/messaging', messagingRoutes);
  
  // Socket.IO real-time messaging
  if (io) {
    realtimeService = new RealtimeMessagingService(io);
    logger.info('Messaging module registered with Socket.IO support');
  } else {
    logger.warn('Messaging module registered without Socket.IO (real-time features disabled)');
  }
}

export { realtimeService };
export { MessagingService } from './services/messaging.service';

