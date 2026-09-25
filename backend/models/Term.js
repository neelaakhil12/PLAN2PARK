const mongoose = require('mongoose');

const termSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['owner', 'seeker'],
      required: true,
      index: true,
    },
    clause: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Term = mongoose.model('Term', termSchema);

module.exports = Term;
