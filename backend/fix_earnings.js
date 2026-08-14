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
      if (b.status === 'cancelled') {
        const refund = b.refundAmount || 0;
        const retained = Math.max(0, (b.totalAmount || 0) - refund);
        b.ownerEarnings = Number(retained.toFixed(2));
        b.adminCommission = 0;
        await b.save();
        console.log(`Updated cancelled booking ${b._id}: refundAmount=${refund}, ownerEarnings=${b.ownerEarnings}`);
      } else if (b.paymentStatus === 'paid' || b.status === 'paid') {
        b.ownerEarnings = Number((b.totalAmount || 0).toFixed(2));
        b.adminCommission = 0;
        await b.save();
        console.log(`Updated active paid booking ${b._id}: totalAmount=${b.totalAmount}, ownerEarnings=${b.ownerEarnings}`);
      }
    }

    console.log('Finished updating all bookings to 100% owner payout!');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
