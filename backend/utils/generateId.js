const Counter = require('../models/Counter');
const User = require('../models/User');

/**
 * Generate sequential unique ID:
 * Place Owner: PO000001, PO000002, etc.
 * Parking Seeker: VO000001, VO000002, etc.
 * @param {'owner'|'seeker'} role
 * @returns {Promise<string>}
 */
async function generateUniqueId(role) {
  const isOwner = role === 'owner';
  const prefix = isOwner ? 'PO' : 'VO';
  const counterId = isOwner ? 'owner_seq' : 'seeker_seq';

  // Find or initialize counter based on existing user count
  let counter = await Counter.findById(counterId);
  if (!counter) {
    const existingCount = await User.countDocuments({
      role,
      uniqueId: { $regex: new RegExp(`^${prefix}`) }
    });
    counter = await Counter.create({ _id: counterId, seq: existingCount });
  }

  // Atomically increment counter
  const updatedCounter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedNum = String(updatedCounter.seq).padStart(6, '0');
  const uniqueId = `${prefix}${paddedNum}`;

  // Ensure no conflict in user collection
  const conflict = await User.findOne({ uniqueId });
  if (conflict) {
    return generateUniqueId(role);
  }

  return uniqueId;
}

module.exports = { generateUniqueId };
