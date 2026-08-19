const mongoose = require("mongoose");
const fs = require("fs");

async function migrate() {
  await mongoose.connect("mongodb://127.0.0.1:27017/plantopark");
  const db = mongoose.connection.db;
  const backup = JSON.parse(fs.readFileSync("/home/ubuntu/local_mongo_backup.json", "utf8"));
  
  for (const collName of Object.keys(backup)) {
    const docs = backup[collName];
    if (!docs || docs.length === 0) continue;
    
    const collection = db.collection(collName);
    console.log(`Importing ${docs.length} records into ${collName}...`);
    
    for (const doc of docs) {
      const cleanDoc = { ...doc };
      delete cleanDoc._id; // avoid _id immutable conflict if existing by email

      if (cleanDoc.ownerId && typeof cleanDoc.ownerId === "string") {
        try { cleanDoc.ownerId = new mongoose.Types.ObjectId(cleanDoc.ownerId); } catch(e) {}
      }
      if (cleanDoc.spaceId && typeof cleanDoc.spaceId === "string") {
        try { cleanDoc.spaceId = new mongoose.Types.ObjectId(cleanDoc.spaceId); } catch(e) {}
      }
      if (cleanDoc.seekerId && typeof cleanDoc.seekerId === "string") {
        try { cleanDoc.seekerId = new mongoose.Types.ObjectId(cleanDoc.seekerId); } catch(e) {}
      }

      if (collName === "users") {
        // Upsert by email
        await collection.updateOne({ email: doc.email.toLowerCase() }, { $set: cleanDoc }, { upsert: true });
      } else {
        const id = typeof doc._id === "string" ? new mongoose.Types.ObjectId(doc._id) : doc._id;
        await collection.updateOne({ _id: id }, { $set: cleanDoc }, { upsert: true });
      }
    }
  }
  console.log("MIGRATION_COMPLETED_SUCCESSFULLY");
  process.exit(0);
}

migrate().catch(e => {
  console.error("Migration error:", e);
  process.exit(1);
});
