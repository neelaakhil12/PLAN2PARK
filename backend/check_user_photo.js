const mongoose = require("mongoose");

async function checkPhoto() {
  await mongoose.connect("mongodb://127.0.0.1:27017/plantopark");
  const users = await mongoose.connection.db.collection("users").find({}).toArray();
  console.log("=== ALL USERS PROFILE IMAGES ===");
  users.forEach(u => {
    console.log(`Email: ${u.email} | Role: ${u.role} | ProfileImage: ${u.profileImage ? (u.profileImage.startsWith("data:") ? "BASE64_DATA (" + u.profileImage.length + " chars)" : u.profileImage) : "NONE"}`);
  });
  process.exit(0);
}

checkPhoto().catch(e => { console.error(e); process.exit(1); });
