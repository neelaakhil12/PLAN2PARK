const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const { migrateAllToNewUniqueIds } = require('./utils/generateId');

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/plantopark';
  console.log('Connecting to MongoDB:', mongoUri.replace(/\/\/.*@/, '//***@'));
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  console.log('Migrating all user uniqueIds to OW (Owner) and PS (Seeker) with 6 random digits...');
  const result = await migrateAllToNewUniqueIds();
  console.log('Migration finished successfully!');
  console.log('Owners migrated:', result.ownerCount);
  console.log('Seekers migrated:', result.seekerCount);

  // Print sample migrated users
  const sampleUsers = await User.find({ role: { $in: ['owner', 'seeker'] } }).select('name email role uniqueId').limit(10);
  console.log('\nSample Users with new Unique IDs:');
  console.table(sampleUsers.map(u => ({ name: u.name, email: u.email, role: u.role, uniqueId: u.uniqueId })));

  await mongoose.disconnect();
  console.log('Database disconnected.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
