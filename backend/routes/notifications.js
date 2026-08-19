const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// Auth middleware helper
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Admin auth middleware
const adminMiddleware = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// 1. GET /api/notifications - Get notifications for logged-in user (personal + relevant broadcasts)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const userRole = req.user.role || 'seeker';

    const notifications = await Notification.find({
      $or: [
        { userId: userId },
        { userId: null, targetRole: { $in: ['all', userRole] }, hiddenBy: { $ne: userId } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Map notifications to include user-specific isRead status
    const mapped = notifications.map((n) => {
      const isBroadcast = !n.userId;
      const isRead = isBroadcast
        ? (n.readBy || []).some((id) => id.toString() === userId.toString())
        : !!n.isRead;
      return {
        ...n,
        isRead,
      };
    });

    const unreadCount = mapped.filter((n) => !n.isRead).length;

    res.json({
      notifications: mapped,
      unreadCount,
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
});

// 2. POST /api/notifications/read-all - Mark all notifications as read for current user
router.post('/read-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const userRole = req.user.role || 'seeker';

    // Mark individual notifications
    await Notification.updateMany({ userId: userId, isRead: false }, { $set: { isRead: true } });

    // Mark broadcast notifications by adding userId to readBy
    await Notification.updateMany(
      {
        userId: null,
        targetRole: { $in: ['all', userRole] },
        readBy: { $ne: userId },
      },
      { $addToSet: { readBy: userId } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ message: 'Failed to update notifications', error: err.message });
  }
});

// 3. POST /api/notifications/read/:id - Mark single notification as read
router.post('/read/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.userId) {
      if (notification.userId.toString() === userId.toString()) {
        notification.isRead = true;
        await notification.save();
      }
    } else {
      if (!notification.readBy.some((id) => id.toString() === userId.toString())) {
        notification.readBy.push(userId);
        await notification.save();
      }
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking single notification as read:', err);
    res.status(500).json({ message: 'Failed to update notification', error: err.message });
  }
});

// User deletes single notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    if (notif.userId && notif.userId.toString() === userId.toString()) {
      await Notification.findByIdAndDelete(req.params.id);
    } else {
      // For broadcast, hide it by adding to hiddenBy array or deleting
      await Notification.findByIdAndUpdate(req.params.id, { $addToSet: { hiddenBy: userId } });
    }
    res.json({ success: true, message: 'Notification removed' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove notification', error: err.message });
  }
});

// User clears all notifications
router.delete('/user/clear-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    await Notification.deleteMany({ userId: userId });
    await Notification.updateMany({ userId: null }, { $addToSet: { hiddenBy: userId } });
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear notifications', error: err.message });
  }
});

// 4. POST /api/notifications/admin/broadcast - Admin broadcasts a promotional offer or alert
router.post('/admin/broadcast', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      title,
      message,
      targetRole = 'seeker',
      type = 'promotional_offer',
      promoCode,
      discountPercent,
      validUntil,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and Message are required' });
    }

    const notification = new Notification({
      userId: null, // Broadcast to all
      targetRole,
      type,
      title,
      message,
      promoCode: promoCode ? promoCode.toUpperCase().trim() : null,
      discountPercent: discountPercent ? Number(discountPercent) : null,
      data: {
        validUntil: validUntil || 'Limited Time Offer',
      },
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: `Promotional notification broadcasted successfully to ${targetRole} users! 📢`,
      notification,
    });
  } catch (err) {
    console.error('Error broadcasting notification:', err);
    res.status(500).json({ message: 'Failed to broadcast notification', error: err.message });
  }
});

// 5. GET /api/notifications/admin/history - Admin views sent broadcast campaigns
router.get('/admin/history', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const broadcasts = await Notification.find({ userId: null })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ broadcasts });
  } catch (err) {
    console.error('Error fetching broadcast history:', err);
    res.status(500).json({ message: 'Failed to fetch broadcast history', error: err.message });
  }
});

// 6. DELETE /api/notifications/admin/:id - Admin deletes a promotional notification
router.delete('/admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting broadcast:', err);
    res.status(500).json({ message: 'Failed to delete notification', error: err.message });
  }
});

module.exports = router;
