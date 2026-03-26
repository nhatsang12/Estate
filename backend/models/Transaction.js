const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction userId is required'],
      index: true,
    },
    subscriptionPlan: {
      type: String,
      enum: ['Free', 'Pro', 'ProPlus'],
      required: [true, 'subscriptionPlan is required'],
    },
    amount: {
      type: Number,
      required: [true, 'amount is required'],
      min: [0, 'amount must be >= 0'],
    },
    paymentMethod: {
      type: String,
      enum: ['VNPay', 'PayPal'],
      required: [true, 'paymentMethod is required'],
    },
    paymentGatewayTransactionId: {
      type: String,
      trim: true,
      index: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentGatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    orderedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    checkoutExpiresAt: {
      type: Date,
      index: true,
    },
    subscriptionExpiresAt: {
      type: Date,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'expiresAt is required'],
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ userId: 1, status: 1, orderedAt: -1 });
transactionSchema.index({ paymentMethod: 1, paymentGatewayTransactionId: 1 });
transactionSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
