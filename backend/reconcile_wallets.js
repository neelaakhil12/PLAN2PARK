const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/plantopark').then(async () => {
  const db = mongoose.connection.db;

  // Find all spaces and map spaceId -> ownerId, spaceTitle
  const spaces = await db.collection('parkingspaces').find({}).toArray();
  const spaceMap = new Map();
  spaces.forEach(s => {
    spaceMap.set(s._id.toString(), s);
  });

  // Find all genuinely paid bookings
  const paidBookings = await db.collection('bookings').find({ paymentStatus: 'paid' }).toArray();
  console.log(`Found ${paidBookings.length} paid booking(s) in system.`);

  // Group earnings by owner
  const ownerTransactions = new Map();
  for (const b of paidBookings) {
    const space = spaceMap.get(b.spaceId ? b.spaceId.toString() : '');
    const ownerId = space && space.ownerId ? space.ownerId.toString() : null;
    if (!ownerId) continue;

    const earnings = b.ownerEarnings !== undefined && b.ownerEarnings !== null ? Number(b.ownerEarnings) : 0.85;
    const tx = {
      type: 'credit',
      amount: earnings,
      description: `Booking #${b._id.toString().slice(-6).toUpperCase()} at ${space.title || 'Parking spot'} (Gross: ₹${b.totalAmount || 1} - 15% Platform Fee)`,
      bookingId: b._id,
      date: b.paidAt || b.createdAt || new Date(),
    };

    if (!ownerTransactions.has(ownerId)) {
      ownerTransactions.set(ownerId, []);
    }
    ownerTransactions.get(ownerId).push(tx);
  }

  // Update all owners
  const owners = await db.collection('users').find({ role: 'owner' }).toArray();
  for (const owner of owners) {
    const oId = owner._id.toString();
    const txs = ownerTransactions.get(oId) || [];
    const balance = txs.reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
    const rounded = Math.round(balance * 100) / 100;

    await db.collection('users').updateOne(
      { _id: owner._id },
      {
        $set: {
          walletTransactions: txs,
          walletBalance: rounded,
        }
      }
    );
    console.log(`✓ Owner ${owner.name} (${owner.email}): walletBalance = ₹${rounded}, total paid orders = ${txs.length}`);
  }

  process.exit(0);
});
