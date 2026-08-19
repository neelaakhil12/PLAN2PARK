const mongoose = require('mongoose');

async function markPaid() {
  await mongoose.connect('mongodb://localhost:27017/plantopark');
  const res = await mongoose.connection.db.collection('bookings').updateMany(
    { status: 'allotted' },
    { $set: { status: 'paid', paymentStatus: 'paid' } }
  );
  console.log('Updated bookings to paid:', res.modifiedCount);
  process.exit(0);
}

markPaid();
