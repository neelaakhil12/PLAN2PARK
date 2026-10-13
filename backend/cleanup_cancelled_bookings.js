const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Booking = require('./models/Booking');

async function cleanupCancelledBookings() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/plantopark';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoUri);

    const cancelledBookings = await Booking.find({ status: 'cancelled' });
    console.log(`Found ${cancelledBookings.length} cancelled bookings.`);

    let updatedCount = 0;
    for (const b of cancelledBookings) {
      if (b.adminCommission > 0 || (b.ownerEarnings > 0 && b.refundStatus === 'full')) {
        console.log(`Fixing booking ${b._id}: fee=₹${b.totalAmount}, old commission=₹${b.adminCommission}, old ownerEarnings=₹${b.ownerEarnings}`);
        b.adminCommission = 0;
        if (b.refundStatus === 'full' || !b.refundStatus) {
          b.ownerEarnings = 0;
        }
        await b.save();
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} cancelled bookings to 0 commission/earnings.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Cleanup error:', err);
    process.exit(1);
  }
}

cleanupCancelledBookings();
