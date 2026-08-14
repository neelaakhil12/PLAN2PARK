const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSpace',
      required: true,
    },
    bookingType: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      default: 'hourly',
    },
    slotId: {
      type: String, // Set when Owner allots a slot and confirms
      default: '',
    },
    vehicleNumber: {
      type: String,
      required: true,
    },
    seekerName: {
      type: String,
      required: true,
    },
    driverImage: {
      type: String,
      default: '',
    },
    seekerContact: {
      type: String,
      required: true,
    },
    hours: {
      type: Number,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    walletAmountUsed: {
      type: Number,
      default: 0,
    },
    adminCommission: {
      type: Number,
      default: 0,
    },
    ownerEarnings: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending_approval', 'allotted', 'paid', 'completed', 'cancelled'],
      default: 'pending_approval',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    transactionReference: {
      type: String, // Store Razorpay payment ID or transaction reference
    },
    invoiceId: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundStatus: {
      type: String,
      enum: ['none', 'full', 'half', 'rejected'],
      default: 'none',
    },
    refundPolicyApplied: {
      type: String,
      default: 'full',
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
