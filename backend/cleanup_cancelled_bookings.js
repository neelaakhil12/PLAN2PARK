const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Booking = require('./models/Booking');
const User = require('./models/User');
const ParkingSpace = require('./models/ParkingSpace');

async function cleanupAndReconcile() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to DB:', mongoUri);

    const cancelledBookings = await Booking.find({ status: 'cancelled' }).populate('spaceId');
    console.log(`Found ${cancelledBookings.length} cancelled bookings.`);

    for (const b of cancelledBookings) {
      console.log(`Processing cancelled booking: ${b._id}, fee: ₹${b.totalAmount}, commission: ₹${b.adminCommission}, ownerEarnings: ₹${b.ownerEarnings}`);
      
      // Calculate how much was previously credited to the owner for this booking
      if (b.spaceId && b.spaceId.ownerId) {
        const owner = await User.findById(b.spaceId.ownerId);
        if (owner && owner.walletTransactions) {
          const creditsForThisBooking = owner.walletTransactions
            .filter(t => t.bookingId && t.bookingId.toString() === b._id.toString() && t.type === 'credit')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

          const debitsForThisBooking = owner.walletTransactions
            .filter(t => t.bookingId && t.bookingId.toString() === b._id.toString() && t.type === 'debit')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

          const netCredited = Math.max(0, Number((creditsForThisBooking - debitsForThisBooking).toFixed(2)));

          if (netCredited > 0) {
            console.log(`Reversing net credited amount of ₹${netCredited} for owner ${owner.name} (${owner._id})`);
            owner.walletBalance = Number(Math.max(0, (owner.walletBalance || 0) - netCredited).toFixed(2));
            owner.walletTransactions.push({
              type: 'debit',
              amount: netCredited,
              description: `Booking #${b._id.toString().slice(-6).toUpperCase()} cancelled & refunded to commuter - Payout reversed`,
              bookingId: b._id,
              date: new Date()
            });
            await owner.save();
            console.log(`Owner ${owner.name} new wallet balance: ₹${owner.walletBalance}`);
          }
        }
      }

      // Zero out commission and owner earnings for full refund cancellation
      b.adminCommission = 0;
      b.ownerEarnings = 0;
      await b.save();
      console.log(`Updated booking ${b._id}: adminCommission=0, ownerEarnings=0`);
    }

    console.log('Cleanup and reconciliation completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

cleanupAndReconcile();
