const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ParkingSpace = require('../models/ParkingSpace');
const Booking = require('../models/Booking');
const { protect, adminOnly, ownerOnly } = require('../middleware/auth');
const { mapboxReverseGeocode, mapboxForwardSearch } = require('../utils/mapbox');

// ─── Local Disk Storage Setup (Self-hosted on AWS Server) ──────────────────────
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage: diskStorage });

// Helper to format image URL
const formatImageUrl = (req, file, fallbackUrl) => {
  if (file) {
    return `/uploads/${file.filename}`;
  }
  if (fallbackUrl && fallbackUrl.trim()) return fallbackUrl.trim();
  return 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=1200&q=80';
};

// @desc    Parse Google Maps link to extract address, city, and coordinates
// @route   POST /api/spaces/parse-maps-link
// @access  Public
router.post('/parse-maps-link', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: 'URL is required' });

  try {
    let targetUrl = url;

    // Expand shortened URLs like maps.app.goo.gl
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      try {
        const response = await fetch(url, { redirect: 'follow' });
        targetUrl = response.url || url;
      } catch (e) {
        console.error('Error expanding URL:', e);
      }
    }

    let lat = null;
    let lng = null;
    let placeName = '';

    // Extract coordinates from @lat,lng
    const atMatch = targetUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }

    // Extract from q=lat,lng
    if (!lat) {
      const qMatch = targetUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        lat = parseFloat(qMatch[1]);
        lng = parseFloat(qMatch[2]);
      }
    }

    // Extract place name from /place/PlaceName/
    const placeMatch = targetUrl.match(/\/place\/([^/]+)\/?/);
    if (placeMatch) {
      placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }

    // Extract search query if any
    const searchMatch = targetUrl.match(/[?&]q=([^&]+)/);
    if (!placeName && searchMatch && !searchMatch[1].includes(',')) {
      placeName = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
    }

    let address = placeName || '';
    let city = 'Hyderabad';
    let plotNo = '';
    let colonyArea = '';
    let landmark = placeName || '';

    // 1. Try Mapbox High-Precision Geocoding first if token is available
    if (lat && lng) {
      const mbRes = await mapboxReverseGeocode(lat, lng);
      if (mbRes && mbRes.address) {
        address = placeName ? `${placeName}, ${mbRes.address}` : mbRes.address;
        city = mbRes.city || city;
        plotNo = mbRes.plotNo || '';
        colonyArea = mbRes.colonyArea || '';
        if (mbRes.landmark) landmark = mbRes.landmark;
      } else {
        // Fallback to Nominatim
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { 'User-Agent': 'PlanToPark/1.0 (plantopark@gmail.com)' } }
          );
          const geoData = await geoRes.json();
          if (geoData && geoData.display_name) {
            const a = geoData.address || {};
            const area = a.suburb || a.neighbourhood || a.residential || a.quarter || a.subdistrict || '';
            city = a.city || a.town || a.village || a.county || 'Hyderabad';
            if (a.house_number) plotNo = `Plot No. ${a.house_number}`;
            if (area) colonyArea = area;
            address = placeName ? `${placeName}, ${area ? area + ', ' : ''}${city}` : geoData.display_name;
          }
        } catch (err) {
          console.error('Reverse geocode error:', err);
        }
      }
    } else if (placeName) {
      // Mapbox Forward Search
      const mbSearch = await mapboxForwardSearch(placeName);
      if (mbSearch && mbSearch.length > 0) {
        address = mbSearch[0].address;
        lat = mbSearch[0].lat;
        lng = mbSearch[0].lng;
      } else {
        // Fallback to Nominatim
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}`,
            { headers: { 'User-Agent': 'PlanToPark/1.0 (plantopark@gmail.com)' } }
          );
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            address = geoData[0].display_name;
            lat = parseFloat(geoData[0].lat);
            lng = parseFloat(geoData[0].lon);
          }
        } catch (err) {
          console.error('Search geocode error:', err);
        }
      }
    }

    if (!plotNo) {
      const plotMatch = (address || '').match(/(?:plot|h\.?no|door|flat|house)\s*(?:no\.?)?\s*([a-z0-9/A-Z-]+)/i);
      if (plotMatch) {
        plotNo = `Plot No. ${plotMatch[1]}`;
      }
    }

    if (!colonyArea) {
      const addrParts = (address || '').split(',').map(s => s.trim()).filter(Boolean);
      if (addrParts.length > 1) {
        colonyArea = addrParts.slice(0, 2).join(', ');
      } else {
        colonyArea = placeName || 'Chaitanya Hills, BN Reddy Nagar';
      }
    }

    return res.json({
      address: address || placeName || targetUrl,
      city: city || 'Hyderabad',
      plotNo,
      colonyArea,
      landmark,
      lat,
      lng,
      fullUrl: targetUrl,
    });
  } catch (error) {
    console.error('Parse maps link error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/spaces  (Owner) ───────────────────────────────────────────────
// @desc    Add a new parking space with image upload
// @access  Private (Owner only)
router.post('/', protect, ownerOnly, upload.single('imageFile'), async (req, res) => {
  const {
    title,
    address,
    location,
    city,
    googleMapsLink,
    locationLink,
    hasEvCharger,
    totalSlots,
    totalSpots,
    pricePerHour,
    hourlyRate,
    pricePerDay,
    pricePerWeek,
    pricePerMonth,
    imageUrl,
    lat,
    lng,
    suitableVehicles,
  } = req.body;

  try {
    const finalImageUrl = formatImageUrl(req, req.file, imageUrl);
    const finalTotalSlots = Number(totalSlots || totalSpots || 5);
    const finalRate = Number(pricePerHour || hourlyRate || 50);
    const finalAddress = address || location || 'Hyderabad';
    const finalLocation = location || address || 'Hyderabad';
    const finalCity = city || 'Hyderabad';
    const finalMapsLink = googleMapsLink || locationLink || `https://www.google.com/maps?q=${lat || 17.385044},${lng || 78.486671}`;

    // Auto-generate slots
    const slots = [];
    const prefix = 'Slot-';
    for (let i = 1; i <= finalTotalSlots; i++) {
      slots.push({
        slotId: `${prefix}${i}`,
        name: `Slot #${i}`,
        isAvailable: true,
      });
    }

    // Parse suitable vehicles
    let suitableList = ['4-wheeler'];
    if (suitableVehicles) {
      if (typeof suitableVehicles === 'string') {
        try {
          suitableList = JSON.parse(suitableVehicles);
        } catch (e) {
          suitableList = suitableVehicles.split(',').map((v) => v.trim());
        }
      } else if (Array.isArray(suitableVehicles)) {
        suitableList = suitableVehicles;
      }
    }

    const space = new ParkingSpace({
      ownerId: req.user._id,
      title: title || finalAddress,
      address: finalAddress,
      location: finalLocation,
      city: finalCity,
      googleMapsLink: finalMapsLink,
      hasEvCharger: (hasEvCharger === true || hasEvCharger === 'true' || hasEvCharger === 1 || hasEvCharger === '1'),
      totalSlots: finalTotalSlots,
      pricePerHour: finalRate,
      pricePerDay: pricePerDay ? Number(pricePerDay) : finalRate * 8,
      pricePerWeek: pricePerWeek ? Number(pricePerWeek) : finalRate * 24 * 7,
      pricePerMonth: pricePerMonth ? Number(pricePerMonth) : finalRate * 24 * 30,
      image: finalImageUrl,
      coordinates: {
        lat: lat ? parseFloat(lat) : 17.385044,
        lng: lng ? parseFloat(lng) : 78.486671,
      },
      slots,
      suitableVehicles: suitableList,
      cancellationPolicy: req.body.cancellationPolicy || 'full',
      maxWalletDiscount: req.body.maxWalletDiscount !== undefined ? Number(req.body.maxWalletDiscount) : 10,
      status: 'approved', // Auto-approved for verified owners
    });

    const createdSpace = await space.save();
    res.status(201).json(createdSpace);
  } catch (error) {
    console.error('Error creating space:', error);
    res.status(500).json({ message: error.message });
  }
});

// Helper to enrich spaces with real-time active bookings and slot availability
const enrichSpaceWithSlotAvailability = async (spaces) => {
  if (!spaces || spaces.length === 0) return [];
  const now = new Date();
  const spaceIds = spaces.map((s) => s._id);

  // Find all confirmed paid active bookings where end time is in future
  const activeBookings = await Booking.find({
    spaceId: { $in: spaceIds },
    status: 'paid',
    paymentStatus: 'paid',
    endTime: { $gt: now },
  });

  const bookedMap = {};
  activeBookings.forEach((b) => {
    const sId = b.spaceId.toString();
    if (!bookedMap[sId]) bookedMap[sId] = new Set();
    if (b.slotId) bookedMap[sId].add(b.slotId);
  });

  return spaces.map((space) => {
    const spaceObj = space.toObject ? space.toObject() : { ...space };
    const sId = spaceObj._id.toString();
    const bookedSet = bookedMap[sId] || new Set();

    const total = spaceObj.totalSlots || (spaceObj.slots ? spaceObj.slots.length : 1);
    const occupied = bookedSet.size;
    const available = Math.max(0, total - occupied);

    // Update slots array availability
    if (spaceObj.slots && spaceObj.slots.length > 0) {
      spaceObj.slots = spaceObj.slots.map((slot) => ({
        ...slot,
        isAvailable: !bookedSet.has(slot.slotId),
      }));
    }

    spaceObj.availableSlots = available;
    spaceObj.occupiedSlots = occupied;
    return spaceObj;
  });
};

// ─── GET /api/spaces  (Public / Seeker) ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { includeInactive, search } = req.query;
    const query = { status: 'approved' };

    // Hide inactive / offline spaces from seekers unless explicitly requested
    if (!includeInactive || includeInactive === 'false') {
      query.isActive = { $ne: false };
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { title: { $regex: s, $options: 'i' } },
        { address: { $regex: s, $options: 'i' } },
        { location: { $regex: s, $options: 'i' } },
        { city: { $regex: s, $options: 'i' } },
      ];
    }

    const spaces = await ParkingSpace.find(query);
    const enriched = await enrichSpaceWithSlotAvailability(spaces);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/spaces/owner/my-spaces  (Owner) ─────────────────────────────────
router.get('/owner/my-spaces', protect, ownerOnly, async (req, res) => {
  try {
    const spaces = await ParkingSpace.find({ ownerId: req.user._id });
    const enriched = await enrichSpaceWithSlotAvailability(spaces);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/spaces/admin/pending  (Admin) ───────────────────────────────────
router.get('/admin/pending', protect, adminOnly, async (req, res) => {
  try {
    const spaces = await ParkingSpace.find({ status: 'pending' }).populate('ownerId', 'name email contact');
    res.json(spaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/spaces/admin/all  (Admin) ───────────────────────────────────────
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const spaces = await ParkingSpace.find().populate('ownerId', 'name email contact');
    res.json(spaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/spaces/admin/approve/:id  (Admin) ───────────────────────────────
router.put('/admin/approve/:id', protect, adminOnly, async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    space.status = 'approved';
    await space.save();
    res.json({ message: 'Space approved successfully', space });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/spaces/admin/reject/:id  (Admin) ────────────────────────────────
router.put('/admin/reject/:id', protect, adminOnly, async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    space.status = 'rejected';
    await space.save();
    res.json({ message: 'Space rejected', space });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT & PATCH /api/spaces/:id/toggle  (Owner — toggle space active/inactive) ───
const toggleHandler = async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    if (space.ownerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to toggle this space' });
    }

    if (req.body && typeof req.body.isActive === 'boolean') {
      space.isActive = req.body.isActive;
    } else {
      space.isActive = space.isActive === false ? true : false;
    }
    const updated = await space.save();
    res.json({ message: `Space is now ${updated.isActive ? 'active' : 'inactive'}`, space: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
router.put('/:id/toggle', protect, ownerOnly, toggleHandler);
router.patch('/:id/toggle', protect, ownerOnly, toggleHandler);

// ─── GET /api/spaces/:id  (Public / Seeker) ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id).populate('ownerId', 'name email contact');
    if (!space) return res.status(404).json({ message: 'Space not found' });
    const [enriched] = await enrichSpaceWithSlotAvailability([space]);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/spaces/:id  (Owner update — supports image file replace) ────────
router.put('/:id', protect, ownerOnly, upload.single('imageFile'), async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    if (space.ownerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to update this space' });
    }

    // ── Image handling ───────────────────────────────────────────────────────
    if (req.file) {
      // Delete old local file if present
      if (space.image && space.image.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', space.image);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { console.warn(e.message); }
        }
      }
      space.image = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl && req.body.imageUrl.trim()) {
      space.image = req.body.imageUrl.trim();
    }

    // ── Other field updates ──────────────────────────────────────────────────
    if (req.body.title)        space.title       = req.body.title;
    if (req.body.address)      space.address     = req.body.address;
    if (req.body.city)         space.city        = req.body.city;
    if (req.body.location)     space.location    = req.body.location;
    if (req.body.locationLink) space.locationLink = req.body.locationLink;
    if (req.body.hasEvCharger !== undefined) {
      space.hasEvCharger = req.body.hasEvCharger === true || req.body.hasEvCharger === 'true' || req.body.hasEvCharger === 1 || req.body.hasEvCharger === '1';
    }
    
    const rate = req.body.pricePerHour !== undefined ? req.body.pricePerHour : req.body.hourlyRate;
    if (rate !== undefined)    space.pricePerHour = Number(rate);
    if (req.body.pricePerDay)   space.pricePerDay  = Number(req.body.pricePerDay);
    if (req.body.pricePerWeek !== undefined) space.pricePerWeek = Number(req.body.pricePerWeek);
    if (req.body.pricePerMonth !== undefined) space.pricePerMonth = Number(req.body.pricePerMonth);
    
    if (req.body.lat && req.body.lng) {
      space.coordinates = { lat: parseFloat(req.body.lat), lng: parseFloat(req.body.lng) };
    }

    const spotsCount = req.body.totalSlots !== undefined ? req.body.totalSlots : req.body.totalSpots;
    if (spotsCount && Number(spotsCount) !== space.totalSlots) {
      space.totalSlots = Number(spotsCount);
      const prefix = 'Slot-';
      const slots = [];
      for (let i = 1; i <= space.totalSlots; i++) {
        slots.push({
          slotId: `${prefix}${i}`,
          name: `Slot #${i}`,
          isAvailable: true,
        });
      }
      space.slots = slots;
      space.status = 'approved';
    }

    if (req.body.suitableVehicles) {
      let suitableList = [];
      if (typeof req.body.suitableVehicles === 'string') {
        try {
          suitableList = JSON.parse(req.body.suitableVehicles);
        } catch (e) {
          suitableList = req.body.suitableVehicles.split(',').map((v) => v.trim());
        }
      } else if (Array.isArray(req.body.suitableVehicles)) {
        suitableList = req.body.suitableVehicles;
      }
      if (suitableList.length > 0) {
        space.suitableVehicles = suitableList;
      }
    }

    if (req.body.isActive !== undefined) {
      space.isActive = req.body.isActive === true || req.body.isActive === 'true' || req.body.isActive === 1 || req.body.isActive === '1';
    }

    if (req.body.cancellationPolicy) {
      space.cancellationPolicy = req.body.cancellationPolicy;
    }

    if (req.body.maxWalletDiscount !== undefined) {
      space.maxWalletDiscount = Number(req.body.maxWalletDiscount);
    }

    const updated = await space.save();
    res.json({ message: 'Space updated successfully', space: updated });
  } catch (error) {
    console.error('Space update error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/spaces/:id/toggle  (Owner toggle Active/Offline) ────────────────
router.put('/:id/toggle', protect, ownerOnly, async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    if (space.ownerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to update this space' });
    }

    if (req.body.isActive !== undefined) {
      space.isActive = req.body.isActive === true || req.body.isActive === 'true' || req.body.isActive === 1 || req.body.isActive === '1';
    } else {
      space.isActive = !space.isActive;
    }

    const updated = await space.save();
    res.json({ message: 'Space status toggled successfully', space: updated, isActive: space.isActive });
  } catch (error) {
    console.error('Toggle error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── DELETE /api/spaces/:id  (Owner) ────────────────────────────────────────
router.delete('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    if (space.ownerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this space' });
    }

    if (space.image && space.image.startsWith('/uploads/')) {
      const imgPath = path.join(__dirname, '..', space.image);
      if (fs.existsSync(imgPath)) {
        try { fs.unlinkSync(imgPath); } catch (e) { console.warn(e.message); }
      }
    }

    await space.deleteOne();
    res.json({ message: 'Parking space removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get available slots for a space during a specific time window
// @route   GET /api/spaces/:id/available-slots-by-time
// @access  Private
router.get('/:id/available-slots-by-time', protect, async (req, res) => {
  const { startTime, hours } = req.query;
  if (!startTime || !hours) {
    return res.status(400).json({ message: 'startTime and hours are required' });
  }

  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    const requestedStart = new Date(startTime);
    const requestedEnd = new Date(requestedStart.getTime() + parseFloat(hours) * 60 * 60 * 1000);

    const overlappingBookings = await Booking.find({
      spaceId: req.params.id,
      status: 'confirmed',
      $or: [
        { startTime: { $lt: requestedEnd }, endTime: { $gt: requestedStart } },
      ],
    });

    const bookedSlotIds = new Set(overlappingBookings.map((b) => b.slotId));
    const availableSlots = space.slots.filter((s) => !bookedSlotIds.has(s.slotId) && s.isAvailable);

    res.json({
      totalSlots: space.totalSlots,
      availableCount: availableSlots.length,
      availableSlots,
      bookedSlotIds: Array.from(bookedSlotIds),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
