const express = require('express');
const router = express.Router();
const Faq = require('../models/Faq');
const seekerFaqs = require('../data/seekerFaqs');
const bankFinanceFaqs = require('../data/bankFinanceFaqs');
const { protect, adminOnly } = require('../middleware/auth');

// Normalize audience helper
const normalizeAudience = (aud) => {
  if (!aud) return 'parking_seeker';
  const lower = aud.toLowerCase();
  if (['bank_finance', 'bank_finance_seeker', 'bank', 'finance', 'stockyard'].includes(lower)) {
    return 'bank_finance';
  }
  return 'parking_seeker';
};

// Auto-seed default FAQs if none exist in the database
const ensureDefaultFaqs = async (audience) => {
  try {
    const targetAudience = normalizeAudience(audience);
    const count = await Faq.countDocuments({ audience: targetAudience });
    if (count === 0) {
      const sourceList = targetAudience === 'bank_finance' ? bankFinanceFaqs : seekerFaqs;
      const docs = sourceList.map((f, idx) => ({
        faqId: f.id || idx + 1,
        audience: targetAudience,
        category: f.category || 'General',
        question: f.question,
        answer: f.answer,
        order: idx + 1,
        isActive: true,
      }));
      await Faq.insertMany(docs);
    }
  } catch (err) {
    console.error(`Error ensuring default FAQs for ${audience}:`, err.message);
  }
};

// @desc    Get all active FAQs or filter by query / category / audience
// @route   GET /api/faqs
// @access  Public
router.get('/', async (req, res) => {
  const { q, category, audience } = req.query;
  const targetAudience = normalizeAudience(audience);

  try {
    await ensureDefaultFaqs(targetAudience);

    const filter = {
      audience: targetAudience,
      isActive: true,
    };

    if (category && category !== 'all') {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    if (q) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { question: searchRegex },
        { answer: searchRegex },
      ];
    }

    const faqs = await Faq.find(filter).sort({ order: 1, createdAt: 1 });

    // Map output to include both `id` and `_id` for backward compatibility
    const formatted = faqs.map(f => ({
      id: f.faqId || f._id,
      _id: f._id,
      faqId: f.faqId,
      audience: f.audience,
      category: f.category,
      question: f.question,
      answer: f.answer,
      order: f.order,
      isActive: f.isActive,
    }));

    res.json(formatted);
  } catch (err) {
    // Fallback to static in case DB is unreachable
    const fallback = targetAudience === 'bank_finance' ? bankFinanceFaqs : seekerFaqs;
    res.json(fallback);
  }
});

// @desc    Get FAQ categories
// @route   GET /api/faqs/categories
// @access  Public
router.get('/categories', async (req, res) => {
  const { audience } = req.query;
  const targetAudience = normalizeAudience(audience);

  try {
    await ensureDefaultFaqs(targetAudience);
    const categories = await Faq.distinct('category', { audience: targetAudience, isActive: true });
    res.json(categories);
  } catch (err) {
    const fallback = targetAudience === 'bank_finance' ? bankFinanceFaqs : seekerFaqs;
    const cats = [...new Set(fallback.map(f => f.category))];
    res.json(cats);
  }
});

// @desc    Admin: Get all FAQs (both active and inactive, all audiences)
// @route   GET /api/faqs/admin/all
// @access  Private (Admin)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    await Promise.all([
      ensureDefaultFaqs('parking_seeker'),
      ensureDefaultFaqs('bank_finance'),
    ]);

    const { audience } = req.query;
    const filter = {};
    if (audience && audience !== 'all') {
      filter.audience = normalizeAudience(audience);
    }

    const faqs = await Faq.find(filter).sort({ audience: 1, order: 1, createdAt: 1 });
    res.json(faqs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Admin: Create new FAQ
// @route   POST /api/faqs/admin
// @access  Private (Admin)
router.post('/admin', protect, adminOnly, async (req, res) => {
  const { audience, category, question, answer, order, isActive } = req.body;

  if (!question || !answer || !category) {
    return res.status(400).json({ message: 'Category, question, and answer are required' });
  }

  const targetAudience = normalizeAudience(audience);

  try {
    const maxFaq = await Faq.findOne({ audience: targetAudience }).sort({ order: -1 });
    const assignedOrder = order !== undefined && order !== '' ? Number(order) : (maxFaq ? (maxFaq.order || 0) + 1 : 1);
    const assignedFaqId = (maxFaq?.faqId || 0) + 1;

    const faq = await Faq.create({
      faqId: assignedFaqId,
      audience: targetAudience,
      category: category.trim(),
      question: question.trim(),
      answer: answer.trim(),
      order: assignedOrder,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json(faq);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Admin: Update FAQ
// @route   PUT /api/faqs/admin/:id
// @access  Private (Admin)
router.put('/admin/:id', protect, adminOnly, async (req, res) => {
  const { audience, category, question, answer, order, isActive } = req.body;

  try {
    const faq = await Faq.findById(req.params.id);
    if (!faq) return res.status(404).json({ message: 'FAQ not found' });

    if (audience !== undefined) faq.audience = normalizeAudience(audience);
    if (category !== undefined) faq.category = category.trim();
    if (question !== undefined) faq.question = question.trim();
    if (answer !== undefined) faq.answer = answer.trim();
    if (order !== undefined && order !== '') faq.order = Number(order);
    if (isActive !== undefined) faq.isActive = Boolean(isActive);

    await faq.save();
    res.json(faq);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Admin: Delete FAQ
// @route   DELETE /api/faqs/admin/:id
// @access  Private (Admin)
router.delete('/admin/:id', protect, adminOnly, async (req, res) => {
  try {
    const faq = await Faq.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ message: 'FAQ not found' });
    res.json({ message: 'FAQ deleted successfully', _id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Get single FAQ by ID
// @route   GET /api/faqs/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let faq = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      faq = await Faq.findById(id);
    } else {
      faq = await Faq.findOne({ faqId: parseInt(id, 10) });
    }
    if (!faq) return res.status(404).json({ message: 'FAQ not found' });
    res.json(faq);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
