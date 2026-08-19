const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/plantopark');
  const spaces = await mongoose.connection.db.collection('parkingspaces').find({}).toArray();
  console.log(JSON.stringify(spaces.map(s => ({
    id: s._id,
    title: s.title,
    address: s.address,
    coordinates: s.coordinates,
    location: s.location,
    lat: s.lat,
    lng: s.lng,
  })), null, 2));
  process.exit(0);
}

check();
