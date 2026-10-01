const express = require('express');
const router = express.Router();
const SystemSetting = require('../models/SystemSetting');
const { protect, adminOnly } = require('../middleware/auth');

const DEFAULT_SUPPORT_SETTINGS = {
  supportEmail: 'plantopark@gmail.com',
  supportPhone: '+91 8919360467',
  supportWhatsapp: '+91 8919360467',
  supportHours: '24/7 Dedicated Concierge & Emergency Desk',
  supportAddress: 'Plan To Park Tech Solutions, Hyderabad, Telangana, India',
  ownerSupportEmail: 'plantopark@gmail.com',
  ownerSupportPhone: '+91 8919360467',
  seekerSupportEmail: 'plantopark@gmail.com',
  seekerSupportPhone: '+91 8919360467',
  storageYardSupportEmail: 'plantopark@gmail.com',
  storageYardSupportPhone: '+91 8919360467',
  bankFinanceSupportEmail: 'plantopark@gmail.com',
  bankFinanceSupportPhone: '+91 8919360467',
};

// @desc    Get support contact info (public)
// @route   GET /api/settings/support
// @access  Public
router.get('/support', async (req, res) => {
  try {
    let setting = await SystemSetting.findOne({ key: 'support_contacts' });
    if (!setting) {
      setting = await SystemSetting.create({
        key: 'support_contacts',
        value: DEFAULT_SUPPORT_SETTINGS,
        description: '24/7 Plan2Park Help Desk and Contact Details for all roles',
      });
    }
    // Merge any missing keys with defaults
    const merged = { ...DEFAULT_SUPPORT_SETTINGS, ...(setting.value || {}) };
    res.json(merged);
  } catch (err) {
    res.status(500).json({ message: err.message, fallback: DEFAULT_SUPPORT_SETTINGS });
  }
});

// @desc    Update support contact info (admin only)
// @route   PUT /api/settings/support
// @access  Private (Admin)
router.put('/support', protect, adminOnly, async (req, res) => {
  try {
    let setting = await SystemSetting.findOne({ key: 'support_contacts' });
    const currentValue = setting?.value || DEFAULT_SUPPORT_SETTINGS;
    const updatedValue = {
      ...currentValue,
      ...req.body,
    };

    setting = await SystemSetting.findOneAndUpdate(
      { key: 'support_contacts' },
      { value: updatedValue, description: '24/7 Plan2Park Help Desk and Contact Details for all roles' },
      { upsert: true, new: true }
    );

    res.json({ message: 'Support contact details updated successfully', data: setting.value });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
