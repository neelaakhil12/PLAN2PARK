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

// Connect to Database
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve local uploads directory directly from local AWS server disk
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/complaints', complaintRoutes);

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

setTimeout(seedAdmin, 3000);

// Global error handler
app.use((err, req, res, next) => {
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
