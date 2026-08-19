const mongoose = require("mongoose");
const Notification = require("./models/Notification");

async function seedPromo() {
  await mongoose.connect("mongodb://127.0.0.1:27017/plantopark");
  
  // Create sample promotional offer
  const promo = await Notification.create({
    userId: null, // broadcast
    targetRole: "seeker",
    type: "promotional_offer",
    title: "🎉 Welcome Offer: 20% OFF on All Bookings!",
    message: "Use promo code PARK20 during checkout to get instant 20% off on your parking booking. Valid across all verified spots!",
    promoCode: "PARK20",
    discountPercent: 20,
    data: {
      validUntil: "End of Month",
    },
  });

  console.log("✅ Seeded promotional notification:", promo._id);
  process.exit(0);
}

seedPromo().catch(e => { console.error(e); process.exit(1); });
