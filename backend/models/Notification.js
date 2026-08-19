const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null indicates a broadcast notification to multiple users
  },
  targetRole: {
    type: String,
    enum: ['all', 'seeker', 'owner', 'admin'],
    default: 'seeker',
  },
  type: {
    type: String,
    enum: [
      'promotional_offer',
      'booking_confirmation',
      'payment_success',
      'booking_expiry',
      'cancellation',
      'general',
    ],
    default: 'general',
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  promoCode: {
    type: String,
    default: null,
  },
  discountPercent: {
    type: Number,
    default: null,
  },
  data: {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSpace', default: null },
    spaceTitle: { type: String, default: null },
    amount: { type: Number, default: null },
    slot: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    validUntil: { type: String, default: null },
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ targetRole: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
