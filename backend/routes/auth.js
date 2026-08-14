const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');
const path = require('path');
const fs = require('fs');

// Local uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Helper to save base64 data image to local disk
const saveBase64Image = (base64Str) => {
  try {
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Str;
    const ext = matches[1].split('/')[1] || 'png';
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `user-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Error saving base64 image:', err);
    return base64Str;
  }
};

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'plantoparksecretkey', {
    expiresIn: '30d',
  });
};

// ─── ROLE-SPECIFIC REGISTRATION & AUTHENTICATION ENDPOINTS ───────────────────

// @desc    Register a new parking seeker
// @route   POST /api/auth/seeker/signup
router.post('/seeker/signup', async (req, res) => {
  const { name, email, password, contact } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({
      name,
      email,
      password,
      role: 'seeker',
      contact,
      status: 'verified',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      contact: user.contact,
      token: generateToken(user._id),
      message: 'Seeker registration successful.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Register a new parking owner
// @route   POST /api/auth/owner/signup
router.post('/owner/signup', async (req, res) => {
  const { name, email, password, contact } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({
      name,
      email,
      password,
      role: 'owner',
      contact,
      status: 'verified',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      contact: user.contact,
      token: generateToken(user._id),
      message: 'Owner registration successful.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Seeker Login (Enforce role: seeker)
// @route   POST /api/auth/seeker/login
router.post('/seeker/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.role !== 'seeker') {
      return res.status(401).json({ message: 'Access denied: Not a parking seeker account or invalid credentials' });
    }
    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      contact: user.contact,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Owner Login (Enforce role: owner)
// @route   POST /api/auth/owner/login
router.post('/owner/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.role !== 'owner') {
      return res.status(401).json({ message: 'Access denied: Not a parking owner account or invalid credentials' });
    }
    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      contact: user.contact,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Admin Login (Enforce role: admin)
// @route   POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ message: 'Access denied: Not an administrator account or invalid credentials' });
    }
    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      contact: user.contact,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── FORGOT & RESET PASSWORD (EMAIL via Nodemailer SMTP) ──────────────────────

// @desc    Request Password Reset (Sends 6-digit OTP code & Web Reset Link to Mail)
// @route   POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email, role } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: `No registered account found with email address: ${email}` });
    }

    // Generate 6-digit OTP code & JWT Token
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'plantoparksecretkey', { expiresIn: '15m' });

    user.resetPasswordOtp = otpCode;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Send email using Nodemailer SMTP (plantopark@gmail.com)
    const emailSent = await sendPasswordResetEmail(user.email, otpCode, resetToken);

    if (emailSent) {
      return res.json({
        success: true,
        message: `Password reset code sent to ${user.email}. Please check your inbox.`,
        token: resetToken,
      });
    } else {
      return res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Reset Password using OTP or Reset Token
// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, otpCode, token, newPassword } = req.body;
  try {
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ message: 'New password must be at least 4 characters' });
    }

    let user;

    if (email && otpCode) {
      user = await User.findOne({
        email: email.trim().toLowerCase(),
        resetPasswordOtp: otpCode.trim(),
        resetPasswordExpire: { $gt: Date.now() },
      });
    } else if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'plantoparksecretkey');
        user = await User.findOne({
          _id: decoded.id,
          resetPasswordToken: token,
          resetPasswordExpire: { $gt: Date.now() },
        });
      } catch (err) {
        return res.status(400).json({ message: 'Invalid or expired password reset link' });
      }
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset code. Please request a new password reset.' });
    }

    // Update password (pre-save hook will hash it with bcrypt)
    user.password = newPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', async (req, res) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'plantoparksecretkey');
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        return res.json(user);
      }
      return res.status(404).json({ message: 'User not found' });
    } catch (e) {
      return res.status(401).json({ message: 'Not authorized' });
    }
  }
  return res.status(401).json({ message: 'Not authorized, no token' });
});

// @desc    Get all users for admin review
// @route   GET /api/auth/admin/users
// @access  Private (Admin only)
router.get('/admin/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Verify or reject a user (seeker/owner)
// @route   PUT /api/auth/admin/users/:id/verify
// @access  Private (Admin only)
router.put('/admin/users/:id/verify', protect, adminOnly, async (req, res) => {
  const { status } = req.body; // 'verified' or 'rejected'

  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status update' });
  }

  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.status = status;
      await user.save();
      res.json({ message: `User status updated to ${status}`, user });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── USER PROFILE SETUP & SETTINGS ──────────────────────────────────────────
// @desc    Update user profile setup
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.contact) user.contact = req.body.contact;

    const img = req.body.profileImage || req.body.passPhoto;
    if (img !== undefined && img !== null) {
      if (img.startsWith('data:image/')) {
        user.profileImage = saveBase64Image(img);
      } else {
        user.profileImage = img;
      }
    }

    const vNum = req.body.vehicleNumber || req.body.plateNumber;
    if (vNum) {
      const vType = req.body.vehicleType || 'Car';
      if (!user.vehicles) user.vehicles = [];
      if (user.vehicles.length > 0) {
        user.vehicles[0].plateNumber = vNum;
        user.vehicles[0].vehicleType = vType;
      } else {
        user.vehicles.push({ plateNumber: vNum, vehicleType: vType });
      }
    } else if (Array.isArray(req.body.vehicles)) {
      user.vehicles = req.body.vehicles;
    }

    if (req.body.driverLicenseNumber !== undefined) user.driverLicenseNumber = req.body.driverLicenseNumber;
    if (req.body.driverLicenseImage !== undefined) {
      if (req.body.driverLicenseImage.startsWith('data:image/')) {
        user.driverLicenseImage = saveBase64Image(req.body.driverLicenseImage);
      } else {
        user.driverLicenseImage = req.body.driverLicenseImage;
      }
    }
    if (req.body.bankAccountDetails !== undefined) user.bankAccountDetails = req.body.bankAccountDetails;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      contact: updatedUser.contact,
      profileImage: updatedUser.profileImage,
      vehicles: updatedUser.vehicles,
      driverLicenseNumber: updatedUser.driverLicenseNumber,
      driverLicenseImage: updatedUser.driverLicenseImage,
      bankAccountDetails: updatedUser.bankAccountDetails,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── VEHICLE CRUD (Seeker Only) ─────────────────────────────────────────────
// @desc    Add vehicle to seeker profile
// @route   POST /api/auth/vehicles
// @access  Private
router.post('/vehicles', protect, async (req, res) => {
  const { plateNumber, vehicleType, model } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.vehicles.push({ plateNumber, vehicleType, model });
    await user.save();
    res.json(user.vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete vehicle from seeker profile
// @route   DELETE /api/auth/vehicles/:id
// @access  Private
router.delete('/vehicles/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.vehicles = user.vehicles.filter(v => v._id.toString() !== req.params.id);
    await user.save();
    res.json(user.vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── FAVORITES MANAGEMENT (Seeker Only) ──────────────────────────────────────
// @desc    Toggle favorite parking space
// @route   POST /api/auth/favorites/:spaceId
// @access  Private
router.post('/favorites/:spaceId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isFav = user.favorites.includes(req.params.spaceId);
    if (isFav) {
      // Remove
      user.favorites = user.favorites.filter(id => id.toString() !== req.params.spaceId);
    } else {
      // Add
      user.favorites.push(req.params.spaceId);
    }
    await user.save();
    res.json(user.favorites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
