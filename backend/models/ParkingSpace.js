const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  slotId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
});

const parkingSpaceSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      default: 'Hyderabad',
    },
    googleMapsLink: {
      type: String,
      default: '',
    },
    hasEvCharger: {
      type: Boolean,
      default: false,
    },
    // Map coordinates — set when owner pins location on map
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    totalSlots: {
      type: Number,
      required: true,
    },
    pricePerHour: {
      type: Number,
      required: true,
    },
    pricePerDay: {
      type: Number,
      required: true,
    },
    pricePerWeek: {
      type: Number,
      default: 0,
    },
    pricePerMonth: {
      type: Number,
      default: 0,
    },
    image: {
      type: String, // Stores Cloudinary URL or placeholder URL
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    suitableVehicles: {
      type: [String],
      enum: ['2-wheeler', '4-wheeler', 'large-car', 'heavy-vehicle'],
      default: ['4-wheeler'],
    },
    slots: [slotSchema], // Populated on creation/approval
  },
  {
    timestamps: true,
  }
);

const ParkingSpace = mongoose.model('ParkingSpace', parkingSpaceSchema);
module.exports = ParkingSpace;
