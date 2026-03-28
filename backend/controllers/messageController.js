const Joi = require('joi');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { emitToUser } = require('../services/socketService');

const MAX_LIMIT = 100;

const sendMessageSchema = Joi.object({
  receiverId: Joi.string().trim().required(),
  content: Joi.string().trim().allow('').max(4000).default(''),
  propertyId: Joi.string().trim().allow('', null),
  propertyTitle: Joi.string().trim().allow('', null).max(240),
  propertyAddress: Joi.string().trim().allow('', null).max(320),
  propertyPrice: Joi.number().min(0).allow(null),
  propertyDescription: Joi.string().trim().allow('', null).max(1200),
  propertyImageUrl: Joi.string().trim().uri().allow('', null),
  propertyUrl: Joi.string().trim().uri().allow('', null),
}).options({ stripUnknown: true });

const chatbotSchema = Joi.object({
  prompt: Joi.string().trim().min(1).max(1000).required(),
}).options({ stripUnknown: true });

const toObjectId = (value) => {
  try {
    return new mongoose.Types.ObjectId(String(value));
  } catch (error) {
    return null;
  }
};

const getConversationId = (userA, userB) =>
  [String(userA), String(userB)].sort().join(':');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
};

const buildPropertySnapshot = (payload = {}) => {
  const snapshot = {};

  if (payload.propertyId && mongoose.Types.ObjectId.isValid(String(payload.propertyId))) {
    snapshot.propertyId = String(payload.propertyId);
  }
  if (payload.propertyTitle) snapshot.title = payload.propertyTitle;
  if (payload.propertyAddress) snapshot.address = payload.propertyAddress;
  if (typeof payload.propertyPrice === 'number') snapshot.price = payload.propertyPrice;
  if (payload.propertyDescription) snapshot.description = payload.propertyDescription;
  if (payload.propertyImageUrl) snapshot.imageUrl = payload.propertyImageUrl;
  if (payload.propertyUrl) snapshot.propertyUrl = payload.propertyUrl;

  return Object.keys(snapshot).length ? snapshot : undefined;
};

const isConversationAllowed = (sender, receiver) => {
  if (!sender || !receiver) return false;
  if (String(sender._id) === String(receiver._id)) return false;
  if (sender.role === 'admin' || receiver.role === 'admin') return false;

  if (sender.role === 'user') {
    return receiver.role === 'provider';
  }

  if (sender.role === 'provider') {
    return receiver.role === 'provider' || receiver.role === 'user';
  }

  return false;
};

const serializeUser = (user) => {
  if (!user) return null;
  const userId = user._id || user.id;
  if (!userId) return null;

  return {
    _id: String(userId),
    name: user.name || 'Unknown user',
    avatar: user.avatar || '',
    role: user.role || 'user',
  };
};

const serializeMessage = (message) => {
  const senderDoc =
    message?.senderId && typeof message.senderId === 'object' && message.senderId._id
      ? message.senderId
      : null;
  const receiverDoc =
    message?.receiverId && typeof message.receiverId === 'object' && message.receiverId._id
      ? message.receiverId
      : null;

  const senderId = senderDoc ? senderDoc._id : message?.senderId;
  const receiverId = receiverDoc ? receiverDoc._id : message?.receiverId;

  return {
    _id: String(message._id),
    conversationId: message.conversationId,
    senderId: senderId ? String(senderId) : '',
    receiverId: receiverId ? String(receiverId) : '',
    sender: serializeUser(senderDoc),
    receiver: serializeUser(receiverDoc),
    messageType: message.messageType || 'text',
    content: message.content || '',
    imageUrl: message.imageUrl || '',
    propertySnapshot: message.propertySnapshot || null,
    isRead: Boolean(message.isRead),
    readAt: message.readAt || null,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
};

const countUnreadMessages = async (userId) => {
  return Message.countDocuments({
    receiverId: toObjectId(userId) || userId,
    isRead: false,
  });
};

const emitUnreadCount = async (userId) => {
  const unreadCount = await countUnreadMessages(userId);
  emitToUser(userId, 'message:unread_count', {
    status: 'success',
    data: { unreadCount },
  });
  return unreadCount;
};

const upsertConversationPayload = (serializedMessage, currentUserId) => {
  const currentId = String(currentUserId);
  const participant =
    serializedMessage.senderId === currentId
      ? serializedMessage.receiver
      : serializedMessage.sender;

  return {
    conversationId: serializedMessage.conversationId,
    participant,
    unreadCount:
      serializedMessage.receiverId === currentId && !serializedMessage.isRead ? 1 : 0,
    updatedAt: serializedMessage.createdAt,
    lastMessage: serializedMessage,
  };
};

const handleControllerError = (res, next, err) => {
  if (typeof next === 'function') {
    return next(err);
  }

  console.error('Message controller error (without next):', err);
  return res.status(500).json({
    status: 'error',
    message: err?.message || 'Internal Server Error',
  });
};

// POST /api/messages/send
exports.sendMessage = async (req, res, next) => {
  try {
    const { value, error } = sendMessageSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(String(value.receiverId))) {
      return res.status(400).json({
        status: 'error',
        message: 'Receiver ID is invalid',
      });
    }

    const sender = await User.findById(req.user.id).select('_id role name avatar');
    const receiver = await User.findById(value.receiverId).select('_id role name avatar');

    if (!sender || !receiver) {
      return res.status(404).json({
        status: 'error',
        message: 'Sender or receiver not found',
      });
    }

    if (!isConversationAllowed(sender, receiver)) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not allowed to start this conversation',
      });
    }

    let imageUrl = '';
    if (req.file) {
      if (!String(req.file.mimetype || '').startsWith('image/')) {
        return res.status(400).json({
          status: 'error',
          message: 'Only image files are supported for message attachments',
        });
      }

      imageUrl = await uploadToCloudinary(req.file.buffer, {
        folder: 'real-estate-messages',
        resource_type: 'image',
      });
    }

    const content = (value.content || '').trim();
    if (!content && !imageUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Message content or image is required',
      });
    }

    const conversationId = getConversationId(sender._id, receiver._id);
    const propertySnapshot = buildPropertySnapshot(value);

    const message = await Message.create({
      conversationId,
      participants: [sender._id, receiver._id],
      senderId: sender._id,
      receiverId: receiver._id,
      content,
      imageUrl,
      propertySnapshot,
      isRead: false,
      readAt: null,
    });

    await message.populate([
      { path: 'senderId', select: 'name avatar role' },
      { path: 'receiverId', select: 'name avatar role' },
    ]);

    const serializedMessage = serializeMessage(message);

    emitToUser(sender._id, 'message:new', {
      status: 'success',
      data: {
        message: serializedMessage,
        conversation: upsertConversationPayload(serializedMessage, sender._id),
      },
    });

    emitToUser(receiver._id, 'message:new', {
      status: 'success',
      data: {
        message: serializedMessage,
        conversation: upsertConversationPayload(serializedMessage, receiver._id),
      },
    });

    await Promise.all([emitUnreadCount(sender._id), emitUnreadCount(receiver._id)]);

    return res.status(201).json({
      status: 'success',
      data: {
        message: serializedMessage,
        conversationId,
      },
    });
  } catch (err) {
    return handleControllerError(res, next, err);
  }
};

// GET /api/messages/conversations
exports.getConversations = async (req, res, next) => {
  try {
    const userId = toObjectId(req.user.id);
    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'User ID is invalid' });
    }

    const grouped = await Message.aggregate([
      { $match: { participants: userId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', userId] },
                    { $eq: ['$isRead', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);

    const participantIds = new Set();
    grouped.forEach((item) => {
      const senderId = String(item.lastMessage.senderId || '');
      const receiverId = String(item.lastMessage.receiverId || '');
      const otherId = senderId === String(userId) ? receiverId : senderId;
      if (otherId) {
        participantIds.add(otherId);
      }
    });

    const users = await User.find({ _id: { $in: Array.from(participantIds) } })
      .select('_id name avatar role')
      .lean();
    const userMap = new Map(users.map((user) => [String(user._id), user]));

    const conversations = grouped.map((item) => {
      const lastMessage = item.lastMessage || {};
      const senderId = String(lastMessage.senderId || '');
      const receiverId = String(lastMessage.receiverId || '');
      const otherId = senderId === String(userId) ? receiverId : senderId;
      const participant = userMap.get(otherId) || { _id: otherId, name: 'Unknown user' };

      const normalizedMessage = {
        _id: String(lastMessage._id),
        conversationId: String(lastMessage.conversationId || ''),
        senderId,
        receiverId,
        sender: null,
        receiver: null,
        messageType: lastMessage.messageType || 'text',
        content: lastMessage.content || '',
        imageUrl: lastMessage.imageUrl || '',
        propertySnapshot: lastMessage.propertySnapshot || null,
        isRead: Boolean(lastMessage.isRead),
        readAt: lastMessage.readAt || null,
        createdAt: lastMessage.createdAt,
        updatedAt: lastMessage.updatedAt,
      };

      return {
        conversationId: item._id,
        participant: serializeUser(participant),
        unreadCount: item.unreadCount || 0,
        updatedAt: lastMessage.createdAt,
        lastMessage: normalizedMessage,
      };
    });

    return res.status(200).json({
      status: 'success',
      results: conversations.length,
      data: { conversations },
    });
  } catch (err) {
    return handleControllerError(res, next, err);
  }
};

// GET /api/messages/conversations/:conversationId/messages
exports.getConversationMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) {
      return res.status(400).json({ status: 'error', message: 'Conversation ID is required' });
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 30), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const baseQuery = {
      conversationId,
      participants: toObjectId(req.user.id) || req.user.id,
    };

    const [total, messages] = await Promise.all([
      Message.countDocuments(baseQuery),
      Message.find(baseQuery)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name avatar role')
        .populate('receiverId', 'name avatar role'),
    ]);

    return res.status(200).json({
      status: 'success',
      results: messages.length,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
      data: {
        messages: messages.map(serializeMessage),
      },
    });
  } catch (err) {
    return handleControllerError(res, next, err);
  }
};

// PATCH /api/messages/conversations/:conversationId/read
exports.markConversationAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) {
      return res.status(400).json({ status: 'error', message: 'Conversation ID is required' });
    }

    const userObjectId = toObjectId(req.user.id) || req.user.id;
    const conversationExists = await Message.exists({
      conversationId,
      participants: userObjectId,
    });

    if (!conversationExists) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found',
      });
    }

    const unreadMessages = await Message.find({
      conversationId,
      participants: userObjectId,
      receiverId: userObjectId,
      isRead: false,
    }).select('_id senderId');

    if (!unreadMessages.length) {
      const unreadCount = await emitUnreadCount(req.user.id);
      return res.status(200).json({
        status: 'success',
        data: { updatedCount: 0, unreadCount },
      });
    }

    const messageIds = unreadMessages.map((message) => message._id);
    await Message.updateMany(
      { _id: { $in: messageIds } },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    const senderIds = Array.from(
      new Set(unreadMessages.map((message) => String(message.senderId)))
    );

    senderIds.forEach((senderId) => {
      emitToUser(senderId, 'conversation:read', {
        status: 'success',
        data: {
          conversationId,
          readBy: String(req.user.id),
        },
      });
    });

    const unreadCount = await emitUnreadCount(req.user.id);

    return res.status(200).json({
      status: 'success',
      data: {
        updatedCount: messageIds.length,
        unreadCount,
      },
    });
  } catch (err) {
    return handleControllerError(res, next, err);
  }
};

// GET /api/messages/unread-count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await countUnreadMessages(req.user.id);
    return res.status(200).json({
      status: 'success',
      data: { unreadCount },
    });
  } catch (err) {
    return handleControllerError(res, next, err);
  }
};

// POST /api/messages/chatbot
exports.chatbotPlaceholder = async (req, res, next) => {
  try {
    const { value, error } = chatbotSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    const answer = [
      'Đây là trợ lý AI tạm thời của EstateManager.',
      'Tính năng phân tích nâng cao theo dữ liệu bất động sản sẽ được tích hợp ở phiên bản tiếp theo.',
      `Bạn vừa hỏi: "${value.prompt}".`,
    ].join(' ');

    return res.status(200).json({
      status: 'success',
      data: {
        answer,
        createdAt: new Date().toISOString(),
        suggestions: [
          'So sánh giá khu vực',
          'Ước lượng lợi suất cho thuê',
          'Đánh giá vị trí theo tiện ích lân cận',
        ],
      },
    });
  } catch (err) {
    return handleControllerError(res, next, err);
  }
};
