const mongoose = require('mongoose');

// ─── Property Schema ─────────────────────────────────────────
const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'A property must have a title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'A property must have a description'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'A property must have a price'],
    min: [0, 'Price cannot be negative'],
  },
  address: {
    type: String,
    required: [true, 'A property must have an address'],
    trim: true,
  },

  // ─── GeoJSON Location ─────────────────────────────────────
  // CRITICAL: MongoDB requires coordinates as [longitude, latitude]
  // Do NOT reverse to [lat, lng] — Leaflet conversion must happen on frontend
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
      required: [true, 'Coordinates are required for geospatial queries'],
      validate: {
        validator: function (val) {
          return val.length === 2 &&
            val[0] >= -180 && val[0] <= 180 &&  // longitude
            val[1] >= -90 && val[1] <= 90;        // latitude
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges',
      },
    },
  },

  // ─── Property Details ──────────────────────────────────────
  type: {
    type: String,
    enum: ['apartment', 'house', 'villa', 'studio', 'office'],
    default: 'apartment',
  },
  bedrooms: {
    type: Number,
    min: [0, 'Bedrooms cannot be negative'],
  },
  bathrooms: {
    type: Number,
    min: [0, 'Bathrooms cannot be negative'],
  },
  area: {
    type: Number,
    min: [0, 'Area cannot be negative'],
  },
  furnished: {
    type: Boolean,
    default: false,
  },
  yearBuilt: {
    type: Number,
  },
  amenities: {
    type: [String],
    default: [],
  },

  // ─── Media ─────────────────────────────────────────────────
  images: {
    type: [String], // Cloudinary URLs
    default: [],
  },
  ownershipDocuments: {
    type: [String], // URLs to Property Deeds, Utility Bills, etc.
    default: [],
  },
  embedding: {
    type: [Number],
    default: undefined,
  },

  // ─── Ownership & Agent ─────────────────────────────────────
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A property must belong to a Provider (Owner)'],
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // ─── Moderation Status ─────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'available', 'rented', 'sold', 'hidden'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
    trim: true,
  },
  isSold: {
    type: Boolean,
    default: false,
    index: true,
  },
  soldAt: {
    type: Date,
    default: null,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ─────────────────────────────────────────────────
// CRUCIAL for map-based geospatial search ($geoWithin, $near)
propertySchema.index({ location: '2dsphere' });
propertySchema.index({ price: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ ownerId: 1 });
propertySchema.index({ ownerId: 1, isSold: 1, soldAt: -1 });
propertySchema.index({ type: 1 });
propertySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Property', propertySchema);
