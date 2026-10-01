const express = require('express');
const router = express.Router();
const Term = require('../models/Term');
const { protect, adminOnly } = require('../middleware/auth');
const defaultTerms = require('../data/defaultTerms');

// Normalize type aliases
const normalizeType = (t) => {
  if (!t) return 'owner';
  const lower = t.toLowerCase();
  if (['storage_owner', 'storage_yard_owner', 'storage-owner', 'storage'].includes(lower)) return 'storage_owner';
  if (['bank_finance', 'bank', 'bank-finance', 'finance'].includes(lower)) return 'bank_finance';
  if (['seeker', 'driver', 'commuter'].includes(lower)) return 'seeker';
  if (['owner', 'space_owner', 'space-owner'].includes(lower)) return 'owner';
  return lower;
};

// Seed default terms for a given type if none exist
const ensureDefaultTerms = async (type) => {
  try {
    const count = await Term.countDocuments({ type });
    if (count === 0 && defaultTerms[type]) {
      const docs = defaultTerms[type].map((clause, idx) => ({
        type,
        clause,
        order: idx + 1,
        isActive: true,
      }));
      await Term.insertMany(docs);
    }
  } catch (err) {
    console.error(`Error auto-seeding terms for ${type}:`, err.message);
  }
};

// @desc    Get active terms & conditions for any role
// @route   GET /api/terms/:type
// @access  Public
router.get('/:type', async (req, res) => {
  const type = normalizeType(req.params.type);
  const validTypes = ['owner', 'storage_owner', 'seeker', 'bank_finance'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: `Invalid terms type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    await ensureDefaultTerms(type);
    const terms = await Term.find({ type, isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json(terms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Admin get all terms & conditions (auto seeds all 4 categories if missing)
// @route   GET /api/terms/admin/all
// @access  Private (Admin)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    await Promise.all([
      ensureDefaultTerms('owner'),
      ensureDefaultTerms('storage_owner'),
      ensureDefaultTerms('seeker'),
      ensureDefaultTerms('bank_finance'),
    ]);
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
  let { type, clause, order } = req.body;
  type = normalizeType(type);
  const validTypes = ['owner', 'storage_owner', 'seeker', 'bank_finance'];

  if (!type || !clause) {
    return res.status(400).json({ message: 'Type and clause text are required' });
  }
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
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
  let { clause, order, isActive, type } = req.body;
  try {
    const term = await Term.findById(req.params.id);
    if (!term) return res.status(404).json({ message: 'Term clause not found' });

    if (clause !== undefined) term.clause = clause.trim();
    if (order !== undefined) term.order = Number(order);
    if (isActive !== undefined) term.isActive = Boolean(isActive);
    if (type !== undefined) {
      const normalized = normalizeType(type);
      if (['owner', 'storage_owner', 'seeker', 'bank_finance'].includes(normalized)) {
        term.type = normalized;
      }
    }

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
