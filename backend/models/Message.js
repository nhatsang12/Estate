const mongoose = require('mongoose');

const propertySnapshotSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    },
    title: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 320,
    },
    price: {
      type: Number,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1200,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: [true, 'Conversation ID is required'],
      index: true,
      trim: true,
    },
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],
      validate: {
        validator(value) {
          const normalized = (value || []).map((item) => String(item));
          return normalized.length === 2 && new Set(normalized).size === 2;
        },
        message: 'Message must have exactly 2 unique participants',
      },
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver is required'],
    },
    messageType: {
      type: String,
      enum: ['text', 'image'],
      default: 'text',
    },
    content: {
      type: String,
      trim: true,
      maxlength: [4000, 'Message cannot exceed 4000 characters'],
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    propertySnapshot: {
      type: propertySnapshotSchema,
      default: undefined,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ participants: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, isRead: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, createdAt: 1 });

messageSchema.pre('validate', function preValidate() {
  const hasText = Boolean((this.content || '').trim());
  const hasImage = Boolean(this.imageUrl);

  if (!hasText && !hasImage) {
    throw new Error('Message content or image is required');
  }

  if (hasImage) {
    this.messageType = 'image';
  } else {
    this.messageType = 'text';
  }
});

module.exports = mongoose.model('Message', messageSchema);
