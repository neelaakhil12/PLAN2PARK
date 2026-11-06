const User = require('../models/User');

/**
 * Generate Customer Unique ID like GoDaddy customer ID:
 * - Place Owner: OW + 6 random digits (e.g. OW089192)
 * - Parking Seeker: PS + 6 random digits (e.g. PS012456)
 * @param {'owner'|'seeker'} role
 * @returns {Promise<string>}
 */
async function generateUniqueId(role) {
  const isOwner = role === 'owner';
  const prefix = isOwner ? 'OW' : 'PS';

  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    // Generate 6 random digits (000000 - 999999)
    const randomDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const candidateId = `${prefix}${randomDigits}`;

    // Ensure uniqueness in database
    const existing = await User.findOne({ uniqueId: candidateId }, { _id: 1 });
    if (!existing) {
      return candidateId;
    }
  }

  // Fallback in astronomical case of 100 collisions: use timestamp slice
  const timestampSuffix = Date.now().toString().slice(-6);
  return `${prefix}${timestampSuffix}`;
}

/**
 * Migrate all existing users who have old IDs (PO..., VO...) or missing IDs
 * to the new GoDaddy-style format:
 * - Owner: OW + 6 random digits
 * - Seeker: PS + 6 random digits
 * @returns {Promise<{ ownerCount: number, seekerCount: number }>}
 */
async function migrateAllToNewUniqueIds() {
  const users = await User.find({ role: { $in: ['owner', 'seeker'] } });
  let ownerCount = 0;
  let seekerCount = 0;

  for (const user of users) {
    const isOwner = user.role === 'owner';
    const targetPrefix = isOwner ? 'OW' : 'PS';

    // If missing or has legacy prefix (PO, VO, SO) or wrong length
    const needsUpdate =
      !user.uniqueId ||
      !user.uniqueId.startsWith(targetPrefix) ||
      user.uniqueId.length !== 8;

    if (needsUpdate) {
      const newUniqueId = await generateUniqueId(user.role);
      await User.updateOne({ _id: user._id }, { $set: { uniqueId: newUniqueId } });
      if (isOwner) ownerCount++;
      else seekerCount++;
    }
  }

  return { ownerCount, seekerCount };
}

/**
 * Legacy support for backward compatibility with existing route imports
 */
async function resequenceUniqueIds(role) {
  return (await migrateAllToNewUniqueIds())[role === 'owner' ? 'ownerCount' : 'seekerCount'];
}

module.exports = {
  generateUniqueId,
  migrateAllToNewUniqueIds,
  resequenceUniqueIds,
};
