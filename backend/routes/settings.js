const express = require('express');
const router = express.Router();
const SystemSetting = require('../models/SystemSetting');
const { protect, adminOnly } = require('../middleware/auth');

const DEFAULT_SUPPORT_SETTINGS = {
  supportEmail: 'plantopark@gmail.com',
  supportResponseNote: 'Contact us through email. If you have any query, response will be received within 24 to 48 hours.',
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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    let setting = await SystemSetting.findOne({ key: 'support_contacts' });
    if (!setting) {
      setting = await SystemSetting.create({
        key: 'support_contacts',
        value: DEFAULT_SUPPORT_SETTINGS,
        description: '24/7 PlanToPark Help Desk and Contact Details for all roles',
      });
    }
    // Merge any missing keys with defaults
    const val = setting.value || {};
    const merged = { ...DEFAULT_SUPPORT_SETTINGS, ...val };

    // If supportEmail is configured, ensure it propagates to all role aliases
    if (merged.supportEmail) {
      merged.ownerSupportEmail = merged.supportEmail;
      merged.seekerSupportEmail = merged.supportEmail;
      merged.storageYardSupportEmail = merged.supportEmail;
      merged.bankFinanceSupportEmail = merged.supportEmail;
    }
    if (merged.supportPhone) {
      merged.ownerSupportPhone = merged.supportPhone;
      merged.seekerSupportPhone = merged.supportPhone;
      merged.storageYardSupportPhone = merged.supportPhone;
      merged.bankFinanceSupportPhone = merged.supportPhone;
    }

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

    // If supportEmail was updated, keep all role email aliases in sync
    if (req.body.supportEmail) {
      updatedValue.supportEmail = req.body.supportEmail.trim();
      updatedValue.ownerSupportEmail = req.body.supportEmail.trim();
      updatedValue.seekerSupportEmail = req.body.supportEmail.trim();
      updatedValue.storageYardSupportEmail = req.body.supportEmail.trim();
      updatedValue.bankFinanceSupportEmail = req.body.supportEmail.trim();
    }
    // If supportPhone was updated, keep all role phone aliases in sync
    if (req.body.supportPhone) {
      updatedValue.supportPhone = req.body.supportPhone.trim();
      updatedValue.ownerSupportPhone = req.body.supportPhone.trim();
      updatedValue.seekerSupportPhone = req.body.supportPhone.trim();
      updatedValue.storageYardSupportPhone = req.body.supportPhone.trim();
      updatedValue.bankFinanceSupportPhone = req.body.supportPhone.trim();
    }

    setting = await SystemSetting.findOneAndUpdate(
      { key: 'support_contacts' },
      { value: updatedValue, description: '24/7 PlanToPark Help Desk and Contact Details for all roles' },
      { upsert: true, new: true }
    );

    res.json({ message: 'Support contact details updated successfully', data: setting.value });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Get post-check-in cancellation grace period (public/seeker)
// @route   GET /api/settings/cancellation-rules
// @access  Public
router.get('/cancellation-rules', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    let setting = await SystemSetting.findOne({ key: 'cancellation_rules' });
    if (!setting) {
      setting = await SystemSetting.create({
        key: 'cancellation_rules',
        value: { postCheckInGraceMinutes: 10 },
        description: 'Post-check-in cancellation grace window (minutes) before cancellation locks',
      });
    }
    const graceMinutes = Number(setting.value?.postCheckInGraceMinutes) || 10;
    res.json({ postCheckInGraceMinutes: graceMinutes });
  } catch (err) {
    res.status(500).json({ postCheckInGraceMinutes: 10, message: err.message });
  }
});

// @desc    Update post-check-in cancellation grace period (admin only)
// @route   PUT /api/settings/cancellation-rules
// @access  Private (Admin)
router.put('/cancellation-rules', protect, adminOnly, async (req, res) => {
  try {
    const minutes = Math.max(1, Number(req.body.postCheckInGraceMinutes) || 10);
    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'cancellation_rules' },
      {
        value: { postCheckInGraceMinutes: minutes },
        description: 'Post-check-in cancellation grace window (minutes) before cancellation locks',
      },
      { upsert: true, new: true }
    );
    res.json({
      message: `Cancellation grace window updated to ${minutes} minutes.`,
      postCheckInGraceMinutes: minutes,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

