import fp from 'fastify-plugin';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '../env.js';

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

export default fp(async (app) => {
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    app.log.info(`🔌 WebSocket connected: ${socket.id}`);
    socket.on('subscribe:activity', () => socket.join('activity'));
    socket.on('subscribe:bots', () => socket.join('bots'));
    socket.on('disconnect', () => {
      app.log.info(`🔌 WebSocket disconnected: ${socket.id}`);
    });
  });

  app.decorate('io', io);
  app.addHook('onClose', async () => {
    io.close();
  });
});
