const mongoose = require('mongoose');

async function clean() {
  await mongoose.connect('mongodb://localhost:27017/plantopark');
  const res = await mongoose.connection.db.collection('bookings').deleteMany({
    status: { $in: ['allotted', 'pending_approval'] }
  });
  console.log(`Deleted ${res.deletedCount} unpaid/allotted test bookings.`);
  process.exit(0);
}

clean();
