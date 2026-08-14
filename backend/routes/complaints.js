const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/auth');

// @desc    Submit a complaint or support ticket
// @route   POST /api/complaints
// @access  Private
router.post('/', protect, async (req, res) => {
  const { subject, description } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ message: 'Subject and description are required' });
  }

  try {
    const complaint = await Complaint.create({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      subject,
      description,
    });
    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get user's own complaints
// @route   GET /api/complaints/my-complaints
// @access  Private
router.get('/my-complaints', protect, async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all complaints (Admin only)
// @route   GET /api/complaints
// @access  Private (Admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Reply/Resolve a complaint (Admin only)
// @route   PUT /api/complaints/:id/resolve
// @access  Private (Admin only)
router.put('/:id/resolve', protect, adminOnly, async (req, res) => {
  const { reply, status } = req.body; // status: 'in_progress' or 'resolved'
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint ticket not found' });

    complaint.reply = reply || complaint.reply;
    complaint.status = status || complaint.status;
    await complaint.save();

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
