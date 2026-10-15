const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/plantopark');
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const users = db.collection('users');
  const payouts = db.collection('payoutrequests');

  const pendingPayouts = await payouts.find({ status: 'pending' }).toArray();
  console.log('Pending payouts found:', pendingPayouts.length);

  for (const p of pendingPayouts) {
    const owner = await users.findOne({ _id: p.ownerId });
    if (!owner) continue;

    console.log(`Processing owner: ${owner.name} (${owner.email}), current balance: ${owner.walletBalance}`);

    const shortId = p._id.toString().slice(-6).toUpperCase();
    const txs = owner.walletTransactions || [];
    for (const t of txs) {
      if ((t.payoutRequestId && t.payoutRequestId.toString() === p._id.toString()) ||
          (t.description && t.description.includes(shortId))) {
        t.status = 'pending';
        t.payoutRequestId = p._id;
      }
    }

    // Only restore if balance is currently 0 or less than earned
    const newBalance = Number(((owner.walletBalance || 0) + p.amount).toFixed(2));
    console.log(`Restoring balance from ${owner.walletBalance} to ${newBalance}`);

    await users.updateOne(
      { _id: owner._id },
      {
        $set: {
          walletBalance: newBalance,
          walletTransactions: txs
        }
      }
    );
  }

  console.log('Reconciliation complete!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
