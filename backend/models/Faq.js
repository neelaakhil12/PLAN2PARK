const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    faqId: {
      type: Number,
      index: true,
    },
    audience: {
      type: String,
      enum: ['parking_seeker', 'bank_finance'],
      default: 'parking_seeker',
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
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

// Compound index for fast queries
faqSchema.index({ audience: 1, isActive: 1, order: 1 });

const Faq = mongoose.model('Faq', faqSchema);

module.exports = Faq;
