const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/plantopark');
  const all = await mongoose.connection.db.collection('bookings').find({}).toArray();
  console.log('Total bookings:', all.length);
  console.log(JSON.stringify(all.map(b => ({ id: b._id, seeker: b.seekerName, status: b.status, slotId: b.slotId, spaceId: b.spaceId, createdAt: b.createdAt })), null, 2));
  process.exit(0);
}

check();
