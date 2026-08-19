const mongoose = require('mongoose');

async function cleanup() {
  await mongoose.connect('mongodb://localhost:27017/plantopark');
  console.log('Connected to MongoDB');

  // 1. Delete all bookings
  const deletedBookings = await mongoose.connection.collection('bookings').deleteMany({});
  console.log(`Deleted ${deletedBookings.deletedCount} bookings.`);

  // 2. Reset all space slots to available
  const spaces = await mongoose.connection.collection('parkingspaces').find({}).toArray();
  for (const space of spaces) {
    if (space.slots && space.slots.length > 0) {
      const resetSlots = space.slots.map(s => ({ ...s, isAvailable: true }));
      await mongoose.connection.collection('parkingspaces').updateOne(
        { _id: space._id },
        { $set: { slots: resetSlots, availableSlots: space.totalSlots || resetSlots.length } }
      );
    }
  }
  console.log('Reset all parking spaces to 100% available slots.');

  // 3. Restore seeker wallet balances to ₹150
  const walletUpdate = await mongoose.connection.collection('users').updateMany(
    { role: 'seeker' },
    { $set: { walletBalance: 150, walletTransactions: [] } }
  );
  console.log(`Restored wallet balance for ${walletUpdate.modifiedCount} seeker(s) to ₹150.`);

  // 4. Clear all notifications
  await mongoose.connection.collection('notifications').deleteMany({});
  console.log('Cleared notifications inbox.');

  process.exit(0);
}

cleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
