const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// ⚠️ MUST be called FIRST before any module that reads process.env
dotenv.config();

const connectDB = require('./config/db');

// Models
const User = require('./models/User');

// Routes (loaded AFTER dotenv.config so env vars are available at module init)
const authRoutes = require('./routes/auth');
const spaceRoutes = require('./routes/spaces');
const bookingRoutes = require('./routes/bookings');
const analyticsRoutes = require('./routes/analytics');
const reviewRoutes = require('./routes/reviews');
const complaintRoutes = require('./routes/complaints');
const notificationRoutes = require('./routes/notifications');
const { router: walletRoutes } = require('./routes/wallet');

// Connect to Database
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve local uploads directory directly from local AWS server disk (both /uploads and /api/uploads)
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/terms', require('./routes/terms'));
app.use('/api/faqs', require('./routes/faqs'));
app.use('/api/settings', require('./routes/settings'));

// Root health check
app.get('/', (req, res) => {
  res.json({
    status: 'PlanToPark API is running',
    storage: '✅ Local AWS Server Disk (/uploads)',
    database: '✅ Self-Hosted MongoDB (AWS Server)',
    smtp: process.env.SMTP_HOST ? '✅ Configured' : '⚠️ Console OTP mode',
  });
});

// Seed default Admin account if none exists
const seedAdmin = async () => {
  try {
    const adminEmail = 'plantopark@gmail.com';
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: 'Plan2park@12',
        role: 'admin',
        contact: '8919360467',
        status: 'verified',
        isEmailVerified: true,
      });
      console.log('✅ Default Admin seeded → plantopark@gmail.com / Plan2park@12');
    }
  } catch (error) {
    console.error('Error seeding admin:', error.message);
  }
};

// Auto-complete expired bookings every 60 seconds and release slots
const autoCompleteExpiredBookings = async () => {
  try {
    const Booking = require('./models/Booking');
    const ParkingSpace = require('./models/ParkingSpace');
    const User = require('./models/User');
    const { sendPushNotification } = require('./utils/pushNotifier');

    const now = new Date();
    // Find all active/checked-in/paid bookings that reached or exceeded their booked endTime
    const expiredBookings = await Booking.find({
      status: { $in: ['paid', 'checked_in'] },
      endTime: { $lte: now }
    });

    if (expiredBookings.length > 0) {
      for (const booking of expiredBookings) {
        booking.status = 'completed';
        if (!booking.checkOutTime) {
          booking.checkOutTime = booking.endTime || now;
        }
        await booking.save();

        // Release the slot in the parking space so it becomes available for new drivers
        if (booking.spaceId && booking.slotId) {
          try {
            const space = await ParkingSpace.findById(booking.spaceId);
            if (space && space.slots) {
              const slot = space.slots.find(s => s.slotId === booking.slotId);
              if (slot) {
                slot.isAvailable = true;
                await space.save();
              }
            }
          } catch (spaceErr) {
            console.error(`[Auto-Complete] Error releasing slot ${booking.slotId}:`, spaceErr.message);
          }
        }

        // Notify Seeker and Space Owner
        try {
          const seeker = await User.findById(booking.seekerId);
          if (seeker && seeker.pushToken) {
            sendPushNotification(
              seeker.pushToken,
              '⏱️ Parking Session Completed',
              `Your ${booking.hours || 1}-hour booking for slot ${booking.slotId || ''} has ended. Thank you for parking with PlanToPark!`,
              { screen: 'Bookings', bookingId: booking._id }
            );
          }

          const space = await ParkingSpace.findById(booking.spaceId);
          if (space && space.ownerId) {
            const owner = await User.findById(space.ownerId);
            if (owner && owner.pushToken) {
              sendPushNotification(
                owner.pushToken,
                '🅿️ Slot Released',
                `Booking duration for slot ${booking.slotId || ''} at ${space.title || 'your spot'} has ended. Slot is now available for new bookings.`,
                { screen: 'Orders', bookingId: booking._id }
              );
            }
          }
        } catch (notifErr) {
          // non-critical notification error
        }
      }

      console.log(`[Auto-Complete] Automatically completed ${expiredBookings.length} expired parking sessions and released their slots.`);
    }
  } catch (err) {
    console.error('[Auto-Complete Error]:', err.message);
  }
};

setTimeout(seedAdmin, 3000);
setTimeout(autoCompleteExpiredBookings, 5000);
setInterval(autoCompleteExpiredBookings, 60000);


// Global error handler
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    console.error('Multer upload error:', err.message, err.field);
    return res.status(400).json({
      message: `Upload error: ${err.message}${err.field ? ` (${err.field})` : ''}`,
    });
  }
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📂 Image Storage: Local AWS Server Disk (/uploads)`);
  console.log(`🗄️  Database: Self-Hosted MongoDB on AWS Server`);
  console.log(`📧 SMTP: ${process.env.SMTP_HOST ? `${process.env.SMTP_HOST}:${process.env.SMTP_PORT}` : 'Not configured — OTP printed to console'}`);
});
