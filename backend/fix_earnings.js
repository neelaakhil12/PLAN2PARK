const mongoose = require('mongoose');
const Booking = require('./models/Booking');
require('dotenv').config();

const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/plan2park';
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const bookings = await Booking.find();
    console.log(`Found ${bookings.length} total bookings`);

    for (let b of bookings) {
      if (b.refundStatus === 'half' || b.refundPolicyApplied === 'half') {
        const retained = Math.max(0, (b.totalAmount || 0) - (b.refundAmount || 0));
        b.ownerEarnings = Number((retained * 0.9).toFixed(2));
        b.paymentStatus = 'paid';
        await b.save();
        console.log(`Updated half-refund booking ${b._id}: refundAmount=${b.refundAmount}, ownerEarnings=${b.ownerEarnings}`);
      } else if (b.paymentStatus === 'paid' && b.status !== 'cancelled') {
        if (!b.ownerEarnings || b.ownerEarnings === 0) {
          b.ownerEarnings = Number(((b.totalAmount || 0) * 0.9).toFixed(2));
          await b.save();
          console.log(`Updated active paid booking ${b._id}: ownerEarnings=${b.ownerEarnings}`);
        }
      }
    }

    console.log('Finished updating bookings!');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
