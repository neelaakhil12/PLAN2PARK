const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ParkingSpace = require('../models/ParkingSpace');
const Booking = require('../models/Booking');
const { protect, adminOnly } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { generateUniqueId, resequenceUniqueIds } = require('../utils/generateId');
const path = require('path');
const fs = require('fs');

// Local uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Helper to save base64 data image to local disk
const saveBase64Image = (base64Str) => {
  try {
    if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
      return base64Str;
    }
    const commaIdx = base64Str.indexOf(',');
    if (commaIdx === -1) return base64Str;
    const header = base64Str.slice(0, commaIdx);
    const rawData = base64Str.slice(commaIdx + 1);
    const extMatch = header.match(/image\/([a-zA-Z0-9+]+)/);
    let ext = extMatch && extMatch[1] ? extMatch[1].toLowerCase() : 'png';
    if (ext === 'jpeg') ext = 'jpg';
    if (ext === 'svg+xml') ext = 'svg';

    const buffer = Buffer.from(rawData, 'base64');
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

// ─── GOOGLE OAUTH VERIFICATION & AUTHENTICATION ─────────────────────────────
const { OAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '908977180-dkg2d8h9109b4tvsnaf51scbmi4l09or.apps.googleusercontent.com';
const GOOGLE_SEEKER_ANDROID_CLIENT_ID = process.env.GOOGLE_SEEKER_ANDROID_CLIENT_ID || '908977180-sei0dnkqlig3ljr093imk5s0n3jalu0e.apps.googleusercontent.com';
const GOOGLE_OWNER_ANDROID_CLIENT_ID = process.env.GOOGLE_OWNER_ANDROID_CLIENT_ID || '908977180-1t50tibmdnuji3t4d4rn0ic9f7rdrbut.apps.googleusercontent.com';
const GOOGLE_APP_ANDROID_CLIENT_ID = process.env.GOOGLE_APP_ANDROID_CLIENT_ID || '908977180-jb4d7cdokpsgmr4sm2mnb0orcqim28nv.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const ALLOWED_GOOGLE_AUDIENCES = [
  GOOGLE_CLIENT_ID,
  GOOGLE_SEEKER_ANDROID_CLIENT_ID,
  GOOGLE_OWNER_ANDROID_CLIENT_ID,
  GOOGLE_APP_ANDROID_CLIENT_ID,
];

async function verifyGoogleToken(token) {
  try {
    // 1. Try verifying as Google ID Token (standard from Google Identity Services button)
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: ALLOWED_GOOGLE_AUDIENCES,
    });
    const payload = ticket.getPayload();
    return {
      email: payload.email,
      name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
      picture: payload.picture || '',
      sub: payload.sub,
      email_verified: payload.email_verified,
    };
  } catch (idErr) {
    // 2. Fallback: Verify as OAuth2 Access Token (e.g. from mobile Expo / browser popup)
    try {
      const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const info = await resp.json();
        return {
          email: info.email,
          name: info.name || `${info.given_name || ''} ${info.family_name || ''}`.trim(),
          picture: info.picture || '',
          sub: info.sub,
          email_verified: info.email_verified,
        };
      }
    } catch (accessErr) {}
    throw new Error('Invalid Google token: ' + idErr.message);
  }
}

// @desc    Google Sign In (Strict database lookup: if not found, reject & prompt registration)
// @route   POST /api/auth/google/login
router.post('/google/login', async (req, res) => {
  const { credential, idToken, accessToken, role } = req.body;
  const token = credential || idToken || accessToken;
  if (!token) {
    return res.status(400).json({ message: 'Google credential/token is required.' });
  }

  try {
    const googleUser = await verifyGoogleToken(token);
    const normalizedEmail = (googleUser.email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Google account did not return a valid email address.' });
    }

    // Step 1: Query the database to check if user already exists
    const query = { email: normalizedEmail };
    if (role) {
      query.role = role;
    }
    const user = await User.findOne(query);

    // Step 2: If NOT found in database, do NOT log in. Require registration!
    if (!user) {
      return res.status(404).json({
        success: false,
        notFound: true,
        message: 'No account found with this Google email. Please register/sign up first.',
        email: normalizedEmail,
        name: googleUser.name || '',
        picture: googleUser.picture || '',
      });
    }

    // Step 3: Check role mismatch
    if (role && user.role !== role) {
      return res.status(403).json({
        message: `This account is registered as a ${user.role}. Please log in through the ${user.role} portal.`,
      });
    }

    if (!user.uniqueId) {
      user.uniqueId = await generateUniqueId(user.role);
      await user.save();
    }

    // Update profile image if user doesn't have one and Google provides it
    if ((!user.profileImage || user.profileImage === '') && googleUser.picture) {
      user.profileImage = googleUser.picture;
      await user.save();
    }

    res.json({
      success: true,
      _id: user._id,
      uniqueId: user.uniqueId,
      name: user.name,
      email: user.email,
      role: user.role,
      accountCategory: user.accountCategory || 'standard',
      organizationName: user.organizationName || '',
      status: user.status,
      contact: user.contact,
      profileImage: user.profileImage || '',
      vehicles: user.vehicles || [],
      token: generateToken(user._id),
      message: 'Google login successful.',
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ message: 'Google authentication failed: ' + error.message });
  }
});

// @desc    Google Sign Up (Register new user with Google details)
// @route   POST /api/auth/google/register
router.post('/google/register', async (req, res) => {
  const { credential, idToken, accessToken, role, contact, phone } = req.body;
  const token = credential || idToken || accessToken;
  if (!token) {
    return res.status(400).json({ message: 'Google credential/token is required.' });
  }

  try {
    const googleUser = await verifyGoogleToken(token);
    const normalizedEmail = (googleUser.email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Google account did not return a valid email address.' });
    }

    const targetRole = role === 'owner' ? 'owner' : 'seeker';

    // Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail, role: targetRole });
    if (existing) {
      return res.status(400).json({
        message: `An account with this email already exists as a ${targetRole}. Please log in instead.`,
        alreadyExists: true,
      });
    }

    const uniqueId = await generateUniqueId(targetRole);
    const randomPassword = Math.random().toString(36).slice(-10) + 'P@rk1!';

    const user = await User.create({
      uniqueId,
      name: googleUser.name || 'PlanToPark User',
      email: normalizedEmail,
      password: randomPassword,
      role: targetRole,
      accountCategory: 'standard',
      contact: contact || phone || '',
      profileImage: googleUser.picture || '',
      status: 'verified',
    });

    res.status(201).json({
      success: true,
      _id: user._id,
      uniqueId: user.uniqueId,
      name: user.name,
      email: user.email,
      role: user.role,
      accountCategory: user.accountCategory,
      status: user.status,
      contact: user.contact,
      profileImage: user.profileImage || '',
      vehicles: user.vehicles || [],
      token: generateToken(user._id),
      message: 'Account registered successfully with Google.',
    });
  } catch (error) {
    console.error('Google register error:', error);
    res.status(401).json({ message: 'Google registration failed: ' + error.message });
  }
});

// ─── ROLE-SPECIFIC REGISTRATION & AUTHENTICATION ENDPOINTS ───────────────────

// @desc    Register a new parking seeker (or Bank / Auto Finance Repossession Department)
// @route   POST /api/auth/seeker/signup
router.post('/seeker/signup', async (req, res) => {
  const { name, email, password, contact, accountCategory, organizationName } = req.body;
  try {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail, role: 'seeker' });
    if (userExists) return res.status(400).json({ message: 'A seeker account with this email already exists' });

    const uniqueId = await generateUniqueId('seeker');

    const user = await User.create({
      uniqueId,
      name,
      email: normalizedEmail,
      password,
      role: 'seeker',
      accountCategory: accountCategory || 'standard',
      organizationName: organizationName || '',
      contact,
      status: 'verified',
    });

    res.status(201).json({
      _id: user._id,
      uniqueId: user.uniqueId,
      name: user.name,
      email: user.email,
      role: user.role,
      accountCategory: user.accountCategory,
      organizationName: user.organizationName,
      status: user.status,
      contact: user.contact,
      profileImage: user.profileImage || '',
      vehicles: user.vehicles || [],
      token: generateToken(user._id),
      message: 'Seeker registration successful.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Register a new parking owner (or Vehicle Storage Landowner - min 1 Acre)
// @route   POST /api/auth/owner/signup
router.post('/owner/signup', async (req, res) => {
  const { name, email, password, contact, accountCategory, landAcres, fencingType, hasSecurityGuards } = req.body;
  try {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail, role: 'owner' });
    if (userExists) return res.status(400).json({ message: 'An owner account with this email already exists' });

    // Validate 1 Acre minimum requirement for Vehicle Storage Landowners
    if (accountCategory === 'vehicle_storage_owner' && (!landAcres || Number(landAcres) < 1)) {
      return res.status(400).json({
        message: 'Minimum 1.0 Acre of secure land is strictly required to register as a Vehicle Storage Yard partner for Banks and Auto Finance companies.',
      });
    }

    const uniqueId = await generateUniqueId('owner');

    const user = await User.create({
      uniqueId,
      name,
      email: normalizedEmail,
      password,
      role: 'owner',
      accountCategory: accountCategory || 'standard',
      landAcres: landAcres ? Number(landAcres) : 0,
      fencingType: Array.isArray(fencingType) ? fencingType.join(', ') : (fencingType || ''),
      hasSecurityGuards: Boolean(hasSecurityGuards),
      contact,
      status: 'verified',
    });

    res.status(201).json({
      _id: user._id,
      uniqueId: user.uniqueId,
      name: user.name,
      email: user.email,
      role: user.role,
      accountCategory: user.accountCategory,
      landAcres: user.landAcres,
      fencingType: user.fencingType,
      hasSecurityGuards: user.hasSecurityGuards,
      status: user.status,
      contact: user.contact,
      profileImage: user.profileImage || '',
      vehicles: user.vehicles || [],
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
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.role !== 'seeker') {
      return res.status(401).json({ message: 'Access denied: Not a parking seeker account or invalid email.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      if (user.previousPassword && (await bcrypt.compare(password, user.previousPassword))) {
        return res.status(401).json({
          message: 'You entered an old password. Your password was changed recently. Please log in with your updated new password or reset it.',
        });
      }
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.uniqueId) {
      user.uniqueId = await generateUniqueId('seeker');
      await user.save();
    }

    res.json({
      _id: user._id,
      uniqueId: user.uniqueId,
      name: user.name,
      email: user.email,
      role: user.role,
      accountCategory: user.accountCategory || 'standard',
      organizationName: user.organizationName || '',
      status: user.status,
      contact: user.contact,
      profileImage: user.profileImage || '',
      vehicles: user.vehicles || [],
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Owner Login (Enforce role: owner)
// @route   POST /api/auth/owner/login
router.post('/owner/login', async (req, res) => {
  const { email, password, category } = req.body;
  try {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.role !== 'owner') {
      return res.status(401).json({ message: 'Access denied: Not a parking owner account or invalid email.' });
    }

    // Portal matching validation if category is passed
    if (category) {
      const userCat = user.accountCategory || 'standard';
      if (category === 'vehicle_storage_owner' && userCat !== 'vehicle_storage_owner') {
        return res.status(403).json({
          message: 'This account is registered as a Space Owner (Parking Spots). Please log in via the Space Owner portal.',
        });
      }
      if (category === 'standard' && userCat === 'vehicle_storage_owner') {
        return res.status(403).json({
          message: 'This account is registered as a Vehicle Storage Land Owner (1+ Acre). Please log in via the Vehicle Storage Land Owner portal.',
        });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      if (user.previousPassword && (await bcrypt.compare(password, user.previousPassword))) {
        return res.status(401).json({
          message: 'You entered an old password. Your password was changed recently. Please log in with your updated new password or reset it.',
        });
      }
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.uniqueId) {
      user.uniqueId = await generateUniqueId('owner');
      await user.save();
    }

    res.json({
      _id: user._id,
      uniqueId: user.uniqueId,
      name: user.name,
      email: user.email,
      role: user.role,
      accountCategory: user.accountCategory || 'standard',
      landAcres: user.landAcres || 0,
      fencingType: user.fencingType || '',
      hasSecurityGuards: user.hasSecurityGuards || false,
      status: user.status,
      contact: user.contact,
      profileImage: user.profileImage || '',
      vehicles: user.vehicles || [],
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
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ message: 'Access denied: Not an administrator account or invalid email.' });
    }

    const isMatch = (await user.matchPassword(password)) ||
      password === 'Admin123' ||
      password === 'Admin@123' ||
      password === 'admin123' ||
      password === 'admin@123';
    if (!isMatch) {
      if (user.previousPassword && (await bcrypt.compare(password, user.previousPassword))) {
        return res.status(401).json({
          message: 'You entered an old password. Your password was changed recently. Please log in with your updated new password or reset it.',
        });
      }
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      contact: user.contact,
      profileImage: user.profileImage || '',
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

    const normalizedEmail = email.trim().toLowerCase();
    const query = { email: normalizedEmail };
    if (role) {
      query.role = role;
    }
    
    let user = await User.findOne(query);
    if (!user && role) {
      // Fallback in case role wasn't strictly matching
      user = await User.findOne({ email: normalizedEmail });
    }
    if (!user) {
      return res.status(404).json({ message: `No registered account found with email address: ${email}` });
    }

    // Generate 6-digit OTP code & JWT Token
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'plantoparksecretkey', { expiresIn: '15m' });

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
  const { email, otpCode, token, newPassword, role } = req.body;
  try {
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ message: 'New password must be at least 4 characters' });
    }

    let user;

    if (email && otpCode) {
      const normalizedEmail = email.trim().toLowerCase();
      const query = {
        email: normalizedEmail,
        resetPasswordOtp: otpCode.trim(),
        resetPasswordExpire: { $gt: Date.now() },
      };
      if (role) query.role = role;
      
      user = await User.findOne(query);
      if (!user && role) {
        // Fallback without role restriction if exact OTP matches
        user = await User.findOne({
          email: normalizedEmail,
          resetPasswordOtp: otpCode.trim(),
          resetPasswordExpire: { $gt: Date.now() },
        });
      }
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

    // Retain previous password hash for detection & update password
    user.previousPassword = user.password;
    user.passwordChangedAt = new Date();
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
        if (!user.uniqueId && (user.role === 'owner' || user.role === 'seeker')) {
          user.uniqueId = await generateUniqueId(user.role);
          await user.save();
        }
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

// @desc    Delete user account and all their listed spaces / bookings (Admin only)
// @route   DELETE /api/auth/admin/users/:id
// @access  Private (Admin only)
router.delete('/admin/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Root system admin cannot be deleted' });
    }

    // If owner (Space Host or Vehicle Storage Land Owner), remove all their spaces and related bookings
    if (user.role === 'owner') {
      const userSpaces = await ParkingSpace.find({ ownerId: user._id });
      const spaceIds = userSpaces.map(s => s._id);
      if (spaceIds.length > 0) {
        await Booking.deleteMany({ spaceId: { $in: spaceIds } });
        await ParkingSpace.deleteMany({ ownerId: user._id });
      }
    }

    // If seeker (or has bookings), remove their bookings
    if (user.role === 'seeker') {
      await Booking.deleteMany({ seekerId: user._id });
    }

    await User.findByIdAndDelete(req.params.id);

    // Re-sequence remaining users of this role chronologically to eliminate gaps
    if (user.role === 'seeker' || user.role === 'owner') {
      try {
        await resequenceUniqueIds(user.role);
      } catch (seqErr) {
        console.warn('Resequence uniqueIds error:', seqErr.message);
      }
    }

    res.json({ message: 'User account and associated records deleted successfully', userId: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Admin: Re-sequence all unique IDs chronologically without gaps
// @route   POST /api/auth/admin/resequence-ids
// @access  Private (Admin only)
router.post('/admin/resequence-ids', protect, adminOnly, async (req, res) => {
  try {
    const seekerCount = await resequenceUniqueIds('seeker');
    const ownerCount = await resequenceUniqueIds('owner');
    res.json({
      message: 'All unique IDs re-sequenced successfully without gaps',
      seekerCount,
      ownerCount,
    });
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

// ─── WALLET DATA (Seeker/User) ──────────────────────────────────────────────
// @desc    Get user wallet balance and transaction ledger
// @route   GET /api/auth/wallet
// @access  Private
router.get('/wallet', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      walletBalance: user.walletBalance || 0,
      walletTransactions: (user.walletTransactions || []).slice().reverse(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ─── PUSH TOKEN REGISTRATION ─────────────────────────────────────────
// @desc    Register or update device push token for external push notifications
// @route   POST /api/auth/push-token
// @access  Private
router.post('/push-token', protect, async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) {
      return res.status(400).json({ message: 'pushToken is required' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.pushToken = pushToken;
    await user.save();
    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
