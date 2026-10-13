const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Booking = require('./models/Booking');

async function checkDetails() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);

    const owners = await User.find({ role: 'owner' });
    console.log('--- OWNERS ---');
    owners.forEach(o => {
      console.log({
        id: o._id,
        name: o.name,
        walletBalance: o.walletBalance,
        transactions: o.walletTransactions
      });
    });

    const seekers = await User.find({ role: 'seeker' });
    console.log('--- SEEKERS ---');
    seekers.forEach(s => {
      console.log({
        id: s._id,
        name: s.name,
        walletBalance: s.walletBalance,
        transactions: s.walletTransactions
      });
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDetails();
