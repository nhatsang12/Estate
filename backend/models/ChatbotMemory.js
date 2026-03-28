const mongoose = require('mongoose');

const memoryMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 4000,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const preferenceProfileSchema = new mongoose.Schema(
  {
    budgetMin: {
      type: Number,
      min: 0,
      default: null,
    },
    budgetMax: {
      type: Number,
      min: 0,
      default: null,
    },
    locationKeyword: {
      type: String,
      trim: true,
      default: '',
    },
    bedrooms: {
      type: Number,
      min: 0,
      default: null,
    },
    bathrooms: {
      type: Number,
      min: 0,
      default: null,
    },
    propertyTypes: {
      type: [String],
      default: [],
    },
    amenities: {
      type: [String],
      default: [],
    },
    furnished: {
      type: Boolean,
      default: null,
    },
    lastIntent: {
      type: String,
      enum: ['property', 'navigation', 'mixed', 'unknown'],
      default: 'unknown',
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatbotMemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    recentMessages: {
      type: [memoryMessageSchema],
      default: [],
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 8000,
      default: '',
    },
    preferenceProfile: {
      type: preferenceProfileSchema,
      default: () => ({}),
    },
    turnsSinceSummary: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ChatbotMemory', chatbotMemorySchema);
