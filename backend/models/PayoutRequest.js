const mongoose = require('mongoose');

const payoutRequestSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    payoutMethod: {
      type: String,
      enum: ['upi', 'bank_transfer'],
      default: 'upi',
    },
    payoutDetails: {
      upiId: { type: String, default: '' },
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      bankName: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminReceiptImage: {
      type: String,
      default: '', // URL to payment proof screenshot uploaded by admin
    },
    transactionReference: {
      type: String,
      default: '', // UTR or Bank/UPI Reference ID
    },
    adminNotes: {
      type: String,
      default: '',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PayoutRequest', payoutRequestSchema);
