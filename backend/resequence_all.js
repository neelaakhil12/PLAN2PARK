const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/plantopark');
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const users = db.collection('users');
  const counters = db.collection('counters');

  // Resequence Seekers
  const seekers = await users.find({ role: 'seeker' }).sort({ createdAt: 1, _id: 1 }).toArray();
  console.log(`Found ${seekers.length} seekers`);
  for (let i = 0; i < seekers.length; i++) {
    const seq = i + 1;
    const newId = `VO${String(seq).padStart(6, '0')}`;
    console.log(`Updating seeker ${seekers[i].name} (${seekers[i].email}) from ${seekers[i].uniqueId} -> ${newId}`);
    await users.updateOne({ _id: seekers[i]._id }, { $set: { uniqueId: newId } });
  }
  await counters.updateOne({ _id: 'seeker_seq' }, { $set: { seq: seekers.length } }, { upsert: true });

  // Resequence Owners
  const owners = await users.find({ role: 'owner' }).sort({ createdAt: 1, _id: 1 }).toArray();
  console.log(`Found ${owners.length} owners`);
  for (let i = 0; i < owners.length; i++) {
    const seq = i + 1;
    const newId = `PO${String(seq).padStart(6, '0')}`;
    console.log(`Updating owner ${owners[i].name} (${owners[i].email}) from ${owners[i].uniqueId} -> ${newId}`);
    await users.updateOne({ _id: owners[i]._id }, { $set: { uniqueId: newId } });
  }
  await counters.updateOne({ _id: 'owner_seq' }, { $set: { seq: owners.length } }, { upsert: true });

  console.log('Resequence complete!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
