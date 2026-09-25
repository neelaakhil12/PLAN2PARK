const mongoose = require('mongoose');
const Term = require('./models/Term');
const User = require('./models/User');
const Counter = require('./models/Counter');
require('dotenv').config();

const ownerClauses = [
  "The Owner must provide accurate and complete details regarding the parking space, including address, landmarks, accessibility, dimensions, pricing, availability, and restrictions.",
  "The Owner confirms that they have the legal right, authority, or permission to list the parking space on the Plan To Park platform.",
  "The Owner shall ensure that the parking space is safe, reasonably maintained, and suitable for vehicle parking.",
  "The Owner shall keep the parking area free from hazards that may cause damage to vehicles or injury to users.",
  "The Owner is responsible for maintaining accurate availability schedules and updating them whenever necessary.",
  "The Owner shall honor all confirmed bookings made through the platform.",
  "The Owner shall not cancel a confirmed booking without a valid reason.",
  "The Owner shall not accept duplicate bookings for the same parking space during overlapping periods.",
  "The Owner shall clearly disclose any parking restrictions, vehicle size limitations, height restrictions, or access conditions.",
  "The Owner shall not provide misleading or false information regarding the parking facility.",
  "The Owner shall not demand additional charges beyond the amount displayed in the application unless such charges are approved and communicated through the platform.",
  "The Owner shall not encourage users to bypass the platform's payment system.",
  "The Owner shall communicate professionally and respectfully with all users.",
  "The Owner shall not discriminate against users based on gender, religion, race, nationality, disability, or any protected category.",
  "The Owner shall allow access to the booked parking space during the reserved period.",
  "If a vehicle remains after the booking period expires, the Owner must first attempt to contact the Vehicle Owner through the platform.",
  "The Owner shall provide reasonable time for vehicle collection after booking expiry.",
  "The Owner shall not damage, lock, remove, tow, or interfere with a vehicle solely because the booking period has expired.",
  "The Owner may charge applicable overstay charges according to the pricing structure displayed on the platform.",
  "The Owner is encouraged to capture photographs or videos of the vehicle condition at check-in and check-out.",
  "The Owner shall cooperate in investigations relating to disputes, damages, payment issues, or security incidents.",
  "Where CCTV is advertised, the Owner shall make reasonable efforts to keep the surveillance system operational.",
  "The Owner shall not misuse, share, sell, or disclose user information obtained through the platform.",
  "The Owner shall comply with all applicable laws, regulations, zoning rules, and parking-related requirements.",
  "The Owner shall immediately report suspicious, illegal, or unsafe activities occurring within the parking premises.",
  "The Owner shall not use the platform for fraudulent, deceptive, or unlawful purposes.",
  "The Owner agrees that ratings and reviews may be displayed publicly on the platform.",
  "The Owner acknowledges that Plan To Park acts only as a technology platform connecting parking providers and vehicle owners.",
  "The Owner agrees to resolve disputes through the platform before initiating legal proceedings wherever reasonably possible.",
  "Violation of these terms may result in listing suspension, account restriction, or permanent removal from the platform."
];

const seekerClauses = [
  "The Seeker must provide accurate vehicle registration details and contact information.",
  "The Seeker shall ensure that all information submitted through the platform is true and complete.",
  "The Seeker shall use only their own registered account and shall not share account credentials with others.",
  "The Seeker shall park only in the parking space allocated through the booking.",
  "The Seeker shall comply with all instructions provided by the Space Owner and the platform.",
  "The Seeker agrees to pay all parking fees displayed during the booking process.",
  "The Seeker agrees to pay additional charges if the vehicle remains beyond the booked period.",
  "The Seeker is responsible for collecting the vehicle before the booking period expires.",
  "The Seeker shall ensure that the vehicle is legally registered and roadworthy.",
  "The Seeker shall not leave an abandoned vehicle in the parking space.",
  "The Seeker shall not park a vehicle containing illegal, dangerous, explosive, or prohibited materials.",
  "The Seeker shall not use the parking space for unauthorized commercial activities.",
  "The Seeker is encouraged to inspect the parking area before leaving the vehicle.",
  "The Seeker is encouraged to take photographs or videos of the vehicle before parking.",
  "The Seeker should record any existing dents, scratches, or visible damage before leaving the vehicle.",
  "The Seeker should remove valuable items, documents, cash, electronics, and personal belongings from the vehicle.",
  "The Seeker shall properly lock and secure the vehicle before leaving it.",
  "The Seeker shall maintain valid insurance coverage for the vehicle.",
  "The Seeker shall not damage parking infrastructure, gates, barriers, equipment, or surrounding property.",
  "The Seeker shall not block entrances, exits, driveways, emergency access points, or neighboring parking spaces.",
  "The Seeker shall not engage in unlawful, disruptive, abusive, or threatening behavior.",
  "The Seeker shall not provide false booking information or misleading vehicle details.",
  "The Seeker shall not attempt to bypass platform fees or make unauthorized arrangements outside the application.",
  "The Seeker shall respond to important notifications related to bookings, extensions, payments, or disputes.",
  "The Seeker shall cooperate with investigations relating to damages, disputes, payment issues, or security incidents.",
  "The Seeker shall provide supporting evidence when filing complaints or disputes.",
  "The Seeker shall respect the property rights of Space Owners.",
  "The Seeker acknowledges that Plan To Park does not take physical custody of vehicles.",
  "The Seeker acknowledges that vehicle safety remains primarily the responsibility of the vehicle owner, subject to applicable law.",
  "Violation of these terms may result in account suspension, cancellation of bookings, restricted access, or permanent removal from the platform."
];

async function seedData() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/plantopark';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB for terms seeding & user ID backfill');

  // 1. Seed Owner Terms if not already seeded
  const ownerCount = await Term.countDocuments({ type: 'owner' });
  if (ownerCount === 0) {
    console.log('Seeding 30 Owner terms...');
    const ownerDocs = ownerClauses.map((clause, idx) => ({
      type: 'owner',
      clause,
      order: idx + 1,
      isActive: true,
    }));
    await Term.insertMany(ownerDocs);
    console.log('✅ Owner terms seeded successfully.');
  } else {
    console.log(`Owner terms already exist (${ownerCount} clauses).`);
  }

  // 2. Seed Seeker Terms if not already seeded
  const seekerCount = await Term.countDocuments({ type: 'seeker' });
  if (seekerCount === 0) {
    console.log('Seeding 30 Seeker terms...');
    const seekerDocs = seekerClauses.map((clause, idx) => ({
      type: 'seeker',
      clause,
      order: idx + 1,
      isActive: true,
    }));
    await Term.insertMany(seekerDocs);
    console.log('✅ Seeker terms seeded successfully.');
  } else {
    console.log(`Seeker terms already exist (${seekerCount} clauses).`);
  }

  // 3. Backfill Unique IDs for existing users without uniqueId
  // Owners: PO000001, PO000002...
  const owners = await User.find({ role: 'owner' }).sort({ createdAt: 1 });
  let ownerSeq = 0;
  for (const owner of owners) {
    if (!owner.uniqueId) {
      ownerSeq++;
      const padded = String(ownerSeq).padStart(6, '0');
      owner.uniqueId = `PO${padded}`;
      await owner.save();
      console.log(`Assigned Place Owner ID ${owner.uniqueId} to ${owner.email}`);
    } else {
      const num = parseInt(owner.uniqueId.replace('PO', ''), 10);
      if (!isNaN(num) && num > ownerSeq) ownerSeq = num;
    }
  }
  await Counter.findByIdAndUpdate(
    'owner_seq',
    { $set: { seq: ownerSeq } },
    { upsert: true }
  );

  // Seekers: VO000001, VO000002...
  const seekers = await User.find({ role: 'seeker' }).sort({ createdAt: 1 });
  let seekerSeq = 0;
  for (const seeker of seekers) {
    if (!seeker.uniqueId) {
      seekerSeq++;
      const padded = String(seekerSeq).padStart(6, '0');
      seeker.uniqueId = `VO${padded}`;
      await seeker.save();
      console.log(`Assigned Seeker ID ${seeker.uniqueId} to ${seeker.email}`);
    } else {
      const num = parseInt(seeker.uniqueId.replace('VO', ''), 10);
      if (!isNaN(num) && num > seekerSeq) seekerSeq = num;
    }
  }
  await Counter.findByIdAndUpdate(
    'seeker_seq',
    { $set: { seq: seekerSeq } },
    { upsert: true }
  );

  console.log(`✅ Counters initialized: owner_seq=${ownerSeq}, seeker_seq=${seekerSeq}`);
  await mongoose.disconnect();
}

seedData().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
