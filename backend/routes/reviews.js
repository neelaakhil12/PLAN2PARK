const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const ParkingSpace = require('../models/ParkingSpace');
const { protect } = require('../middleware/auth');

// @desc    Submit a review for a parking space
// @route   POST /api/reviews
// @access  Private (Seeker only)
router.post('/', protect, async (req, res) => {
  const { spaceId, rating, comment } = req.body;

  if (!spaceId || !rating || !comment) {
    return res.status(400).json({ message: 'Please provide all review details' });
  }

  try {
    const spaceExists = await ParkingSpace.findById(spaceId);
    if (!spaceExists) return res.status(404).json({ message: 'Parking space not found' });

    const review = await Review.create({
      spaceId,
      seekerId: req.user._id,
      seekerName: req.user.name,
      rating: Number(rating),
      comment,
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all reviews of a parking space
// @route   GET /api/reviews/space/:spaceId
// @access  Public
router.get('/space/:spaceId', async (req, res) => {
  try {
    const reviews = await Review.find({ spaceId: req.params.spaceId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all reviews for an owner's spaces
// @route   GET /api/reviews/owner
// @access  Private (Owner only)
router.get('/owner', protect, async (req, res) => {
  try {
    // Find all owner spaces
    const spaces = await ParkingSpace.find({ ownerId: req.user._id });
    const spaceIds = spaces.map(s => s._id);

    const reviews = await Review.find({ spaceId: { $in: spaceIds } })
      .populate('spaceId', 'address location')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all reviews for admin overview
// @route   GET /api/reviews
// @access  Private (Admin only)
router.get('/', protect, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('spaceId', 'address location')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
