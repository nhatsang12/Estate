const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'subscription userId is required'],
      index: true,
    },
    planType: {
      type: String,
      enum: ['Free', 'Pro', 'ProPlus'],
      required: [true, 'planType is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'expiresAt is required'],
      index: true,
    },
    durationDays: {
      type: Number,
      required: [true, 'durationDays is required'],
      min: [1, 'durationDays must be >= 1'],
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      min: [0, 'amount must be >= 0'],
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['VNPay', 'PayPal', ''],
      default: '',
    },
    lastRenewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ userId: 1, status: 1, expiresAt: -1 });
subscriptionSchema.index({ status: 1, expiresAt: 1 });
subscriptionSchema.index({ planType: 1, createdAt: -1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
