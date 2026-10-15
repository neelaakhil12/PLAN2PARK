const Counter = require('../models/Counter');
const User = require('../models/User');

/**
 * Generate sequential unique ID by filling the lowest available number:
 * Place Owner: PO000001, PO000002, etc.
 * Parking Seeker: VO000001, VO000002, etc.
 * @param {'owner'|'seeker'} role
 * @returns {Promise<string>}
 */
async function generateUniqueId(role) {
  const isOwner = role === 'owner';
  const prefix = isOwner ? 'PO' : 'VO';
  const counterId = isOwner ? 'owner_seq' : 'seeker_seq';

  // Find all existing uniqueIds for this role
  const users = await User.find(
    { role, uniqueId: { $regex: new RegExp(`^${prefix}\\d+$`) } },
    { uniqueId: 1 }
  );

  const usedSeqs = new Set();
  users.forEach((u) => {
    if (u.uniqueId) {
      const num = parseInt(u.uniqueId.slice(prefix.length), 10);
      if (!isNaN(num) && num > 0) {
        usedSeqs.add(num);
      }
    }
  });

  // Find the smallest missing integer starting from 1 (fills any gaps)
  let nextSeq = 1;
  while (usedSeqs.has(nextSeq)) {
    nextSeq++;
  }

  const paddedNum = String(nextSeq).padStart(6, '0');
  const uniqueId = `${prefix}${paddedNum}`;

  // Update counter to at least the highest sequence number
  const maxSeq = Math.max(nextSeq, ...Array.from(usedSeqs));
  await Counter.findByIdAndUpdate(
    counterId,
    { seq: maxSeq },
    { upsert: true }
  );

  return uniqueId;
}

/**
 * Re-sequence all users of given role chronologically (1..N) without gaps
 * and keep the counter in exact sync.
 * @param {'owner'|'seeker'} role
 * @returns {Promise<number>} count of users resequenced
 */
async function resequenceUniqueIds(role) {
  const isOwner = role === 'owner';
  const prefix = isOwner ? 'PO' : 'VO';
  const counterId = isOwner ? 'owner_seq' : 'seeker_seq';

  const users = await User.find({ role }).sort({ createdAt: 1, _id: 1 });

  for (let i = 0; i < users.length; i++) {
    const seqNum = i + 1;
    const expectedId = `${prefix}${String(seqNum).padStart(6, '0')}`;
    if (users[i].uniqueId !== expectedId) {
      await User.updateOne({ _id: users[i]._id }, { $set: { uniqueId: expectedId } });
    }
  }

  await Counter.findByIdAndUpdate(
    counterId,
    { seq: users.length },
    { upsert: true }
  );

  return users.length;
}

module.exports = { generateUniqueId, resequenceUniqueIds };
