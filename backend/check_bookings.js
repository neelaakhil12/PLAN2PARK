const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Booking = require('./models/Booking');

async function verifyAnalytics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const bookingsData = await Booking.find({
      paymentStatus: 'paid',
      status: { $nin: ['cancelled'] },
    });
    const totalRevenue = bookingsData.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalCommission = bookingsData.reduce((sum, b) => sum + (b.adminCommission || 0), 0);
    const totalOwnerPayout = bookingsData.reduce((sum, b) => sum + (b.ownerEarnings || 0), 0);

    console.log('=== VERIFIED ANALYTICS TOTALS ===');
    console.log({
      realizedGrossTurnover: `₹${totalRevenue.toFixed(2)}`,
      adminCommissionCut: `₹${totalCommission.toFixed(2)}`,
      ownersNetEarnings: `₹${totalOwnerPayout.toFixed(2)}`,
      validBookingsCount: bookingsData.length
    });

    const ramya = await User.findOne({ name: /Ramya/i });
    if (ramya) {
      console.log('=== RAMYA OWNER WALLET ===');
      console.log({
        name: ramya.name,
        walletBalance: `₹${ramya.walletBalance}`,
        recentTransactions: ramya.walletTransactions.slice(-3)
      });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verifyAnalytics();
