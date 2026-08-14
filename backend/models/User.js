const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['seeker', 'owner', 'admin'],
      default: 'seeker',
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'verified',
    },
    profileImage: {
      type: String,
      default: '',
    },
    driverLicenseNumber: {
      type: String,
      default: '',
    },
    driverLicenseImage: {
      type: String,
      default: '',
    },
    bankAccountDetails: {
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      bankName: { type: String, default: '' },
    },
    contact: {
      type: String,
      required: true,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ParkingSpace',
      }
    ],
    vehicles: [
      {
        plateNumber: { type: String, required: true },
        vehicleType: { type: String, required: true },
        model: { type: String },
      }
    ],
    ownerPaidRevenue: {
      type: Number,
      default: 0, // Track how much the admin has paid to this host/owner
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    walletTransactions: [
      {
        type: { type: String, enum: ['credit', 'debit'], default: 'credit' },
        amount: { type: Number, required: true },
        description: { type: String, default: 'Refund' },
        date: { type: Date, default: Date.now },
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
      }
    ],
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
    },
    previousPassword: {
      type: String,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
