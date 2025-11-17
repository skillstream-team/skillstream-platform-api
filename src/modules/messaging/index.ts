// src/modules/messaging/index.ts
import express from 'express';
import restRoutes from './routes/rest/messaging.routes';
import { Server as SocketIOServer } from 'socket.io';
import { RealtimeMessagingService } from './services/realtime-messaging.service';

let realtimeService: RealtimeMessagingService | null = null;

export function registerMessagingModule(app: express.Application, io?: SocketIOServer) {
  // REST routes
  app.use('/api/messaging', restRoutes);

  // Socket.IO real-time messaging
  if (io) {
    realtimeService = new RealtimeMessagingService(io);
    console.log('✅ Messaging module registered with Socket.IO support');
  } else {
    console.log('⚠️  Messaging module registered without Socket.IO (real-time features disabled)');
  }
}

export { realtimeService };
export { MessagingService } from './services/messaging.service';

