const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('../models/User');
const { getAllowedOrigins } = require('../utils/allowedOrigins');

let io = null;

const resolveSocketToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.replace(/^Bearer\s+/i, '').trim();
  }

  const authHeader = socket.handshake?.headers?.authorization;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return '';
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = resolveSocketToken(socket);
    if (!token) {
      return next(new Error('Missing auth token'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id role name avatar');
    if (!user) {
      return next(new Error('Socket auth user not found'));
    }

    if (!['user', 'provider'].includes(user.role)) {
      return next(new Error('Socket auth role is not allowed'));
    }

    socket.user = user;
    return next();
  } catch (error) {
    return next(new Error('Socket authentication failed'));
  }
};

const initSocketServer = (httpServer) => {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);

    socket.on('conversation:join', (conversationId) => {
      if (typeof conversationId !== 'string' || !conversationId.trim()) {
        return;
      }
      socket.join(`conversation:${conversationId.trim()}`);
    });

    socket.on('conversation:leave', (conversationId) => {
      if (typeof conversationId !== 'string' || !conversationId.trim()) {
        return;
      }
      socket.leave(`conversation:${conversationId.trim()}`);
    });
  });

  return io;
};

const getIo = () => io;

const emitToUser = (userId, event, payload) => {
  if (!io || !userId || !event) {
    return;
  }
  io.to(`user:${String(userId)}`).emit(event, payload);
};

module.exports = {
  initSocketServer,
  getIo,
  emitToUser,
};
