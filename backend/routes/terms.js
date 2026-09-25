const express = require('express');
const router = express.Router();
const Term = require('../models/Term');
const { protect, adminOnly } = require('../middleware/auth');

// @desc    Get active terms & conditions for owner or seeker
// @route   GET /api/terms/:type
// @access  Public
router.get('/:type', async (req, res) => {
  const { type } = req.params;
  if (!['owner', 'seeker'].includes(type)) {
    return res.status(400).json({ message: 'Invalid terms type. Must be "owner" or "seeker"' });
  }

  try {
    const terms = await Term.find({ type, isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json(terms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Admin get all terms & conditions
// @route   GET /api/terms/admin/all
// @access  Private (Admin)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const terms = await Term.find().sort({ type: 1, order: 1, createdAt: 1 });
    res.json(terms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Admin add a new term clause
// @route   POST /api/terms/admin
// @access  Private (Admin)
router.post('/admin', protect, adminOnly, async (req, res) => {
  const { type, clause, order } = req.body;
  if (!type || !clause) {
    return res.status(400).json({ message: 'Type and clause text are required' });
  }

  try {
    const maxOrderTerm = await Term.findOne({ type }).sort({ order: -1 });
    const assignedOrder = order !== undefined ? Number(order) : (maxOrderTerm ? maxOrderTerm.order + 1 : 1);

    const term = await Term.create({
      type,
      clause: clause.trim(),
      order: assignedOrder,
      isActive: true,
    });
    res.status(201).json(term);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Admin update a term clause
// @route   PUT /api/terms/admin/:id
// @access  Private (Admin)
router.put('/admin/:id', protect, adminOnly, async (req, res) => {
  const { clause, order, isActive, type } = req.body;
  try {
    const term = await Term.findById(req.params.id);
    if (!term) return res.status(404).json({ message: 'Term clause not found' });

    if (clause !== undefined) term.clause = clause.trim();
    if (order !== undefined) term.order = Number(order);
    if (isActive !== undefined) term.isActive = Boolean(isActive);
    if (type !== undefined && ['owner', 'seeker'].includes(type)) term.type = type;

    await term.save();
    res.json(term);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Admin delete a term clause
// @route   DELETE /api/terms/admin/:id
// @access  Private (Admin)
router.delete('/admin/:id', protect, adminOnly, async (req, res) => {
  try {
    const term = await Term.findByIdAndDelete(req.params.id);
    if (!term) return res.status(404).json({ message: 'Term clause not found' });
    res.json({ message: 'Clause deleted successfully', _id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
