const express = require('express');
const router = express.Router();
const seekerFaqs = require('../data/seekerFaqs');

// @desc    Get all FAQs or filter by query / category
// @route   GET /api/faqs
// @access  Public
router.get('/', (req, res) => {
  const { q, category } = req.query;
  let results = seekerFaqs;

  if (category) {
    results = results.filter(f => f.category.toLowerCase() === category.toLowerCase());
  }

  if (q) {
    const query = q.toLowerCase();
    results = results.filter(
      f => f.question.toLowerCase().includes(query) || f.answer.toLowerCase().includes(query)
    );
  }

  res.json(results);
});

// @desc    Get FAQ categories
// @route   GET /api/faqs/categories
// @access  Public
router.get('/categories', (req, res) => {
  const categories = [...new Set(seekerFaqs.map(f => f.category))];
  res.json(categories);
});

// @desc    Get single FAQ by ID
// @route   GET /api/faqs/:id
// @access  Public
router.get('/:id', (req, res) => {
  const faq = seekerFaqs.find(f => f.id === parseInt(req.params.id, 10));
  if (!faq) return res.status(404).json({ message: 'FAQ not found' });
  res.json(faq);
});

module.exports = router;
