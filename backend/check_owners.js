const mongoose = require("mongoose");

async function check() {
  await mongoose.connect("mongodb://127.0.0.1:27017/plantopark");
  const users = await mongoose.connection.db.collection("users").find({ role: "owner" }).toArray();
  console.log("=== OWNER USERS ===");
  users.forEach(u => console.log("User:", u.email, " | _id:", u._id.toString()));
  
  const spaces = await mongoose.connection.db.collection("parkingspaces").find({}).toArray();
  console.log("=== SPACES ===");
  spaces.forEach(s => console.log("Space:", s.title, " | ownerId:", s.ownerId ? s.ownerId.toString() : "NONE"));
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
