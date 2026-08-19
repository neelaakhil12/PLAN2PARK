const mongoose = require("mongoose");

async function updateIndexes() {
  await mongoose.connect("mongodb://127.0.0.1:27017/plantopark");
  const collection = mongoose.connection.db.collection("users");
  const indexes = await collection.indexes();
  console.log("Current indexes:", indexes.map(i => i.name));
  
  for (const idx of indexes) {
    if (idx.name === "email_1") {
      await collection.dropIndex("email_1");
      console.log("Dropped old email_1 index");
    }
  }
  
  await collection.createIndex({ email: 1, role: 1 }, { unique: true });
  console.log("Created compound unique index: email_1_role_1");
  process.exit(0);
}

updateIndexes().catch(err => {
  console.error("Index error:", err);
  process.exit(1);
});
