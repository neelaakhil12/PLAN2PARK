const mongoose = require("mongoose");

async function linkEverything() {
  await mongoose.connect("mongodb://127.0.0.1:27017/plantopark");
  const db = mongoose.connection.db;
  
  const harish = await db.collection("users").findOne({ email: "harishneela71@gmail.com", role: "owner" });
  if (!harish) {
    console.error("Harish owner not found");
    process.exit(1);
  }
  
  const oldOwnerId = new mongoose.Types.ObjectId("6a759e7f0e39fbd7ec17818e");

  const spacesRes = await db.collection("parkingspaces").updateMany(
    { ownerId: oldOwnerId },
    { $set: { ownerId: harish._id } }
  );
  
  const bookingsRes = await db.collection("bookings").updateMany(
    { ownerId: oldOwnerId },
    { $set: { ownerId: harish._id } }
  );
  
  console.log(`Updated ${spacesRes.modifiedCount} spaces and ${bookingsRes.modifiedCount} bookings to Harish!`);
  process.exit(0);
}

linkEverything().catch(e => { console.error(e); process.exit(1); });
