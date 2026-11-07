const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ParkingSpace = require('../models/ParkingSpace');
const Booking = require('../models/Booking');
const { protect, adminOnly, ownerOnly } = require('../middleware/auth');
const {
  googleForwardGeocode,
  googleReverseGeocode,
  extractCoordsFromMapsInput,
} = require('../utils/googleGeocode');

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

// Helper to save base64 data image to local disk
const saveBase64Image = (base64Str) => {
  try {
    if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
      return base64Str;
    }
    const commaIdx = base64Str.indexOf(',');
    if (commaIdx === -1) return base64Str;
    const header = base64Str.slice(0, commaIdx);
    const rawData = base64Str.slice(commaIdx + 1);
    const extMatch = header.match(/image\/([a-zA-Z0-9+]+)/);
    let ext = extMatch && extMatch[1] ? extMatch[1].toLowerCase() : 'png';
    if (ext === 'jpeg') ext = 'jpg';
    if (ext === 'svg+xml') ext = 'svg';

    const buffer = Buffer.from(rawData, 'base64');
    const filename = `space-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Error saving space base64 image:', err);
    return base64Str;
  }
};

// Helper to format image URL
const formatImageUrl = (req, file, fallbackUrl) => {
  if (file) {
    return `/uploads/${file.filename}`;
  }
  if (fallbackUrl && typeof fallbackUrl === 'string' && fallbackUrl.trim()) {
    const trimmed = fallbackUrl.trim();
    if (trimmed.startsWith('blob:')) {
      return '';
    }
    if (trimmed.startsWith('data:image/')) {
      return saveBase64Image(trimmed);
    }
    return trimmed;
  }
  return '';
};

// @desc    Parse Google Maps link to extract address, city, and coordinates using Google Geocoding API
// @route   POST /api/spaces/parse-maps-link
// @access  Public
router.post('/parse-maps-link', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    let targetUrl = url.trim().replace(/^['"`\s]+|['"`\s]+$/g, '');
    if (targetUrl.startsWith('//')) {
      targetUrl = 'https:' + targetUrl;
    } else if (targetUrl.startsWith('/')) {
      targetUrl = 'https:/' + targetUrl;
    } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      // Check if raw coordinates entered
      const rawMatch = targetUrl.match(/(-?\d{1,2}\.\d{4,8})\s*[,/ ]\s*(-?\d{1,3}\.\d{4,8})/);
      if (!rawMatch) {
        targetUrl = 'https://' + targetUrl;
      }
    }

    // 1. Robust extraction of coordinates directly from link or text
    let coords = await extractCoordsFromMapsInput(targetUrl);
    let lat = coords ? coords.lat : null;
    let lng = coords ? coords.lng : null;

    let address = coords?.formattedAddress || '';
    let city = 'Hyderabad';
    let pincode = '500097';
    let plotNo = '';
    let colonyArea = '';
    let landmark = '';

    // 2. If coordinates found, Reverse Geocode with Google Geocoding API
    if (lat && lng) {
      const gRev = await googleReverseGeocode(lat, lng);
      if (gRev) {
        address = gRev.address || address;
        city = gRev.city || city;
        pincode = gRev.pincode || pincode;
        plotNo = gRev.plotNo || '';
        colonyArea = gRev.colonyArea || '';
      }
    }

    // 3. If no coordinates yet, try to extract place name from URL and Forward Geocode with Google
    if (!lat || !lng) {
      let placeName = '';
      const placeMatch = targetUrl.match(/\/place\/([^/?#]+)/);
      if (placeMatch) {
        placeName = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ').trim();
      }
      if (!placeName) {
        const qMatch = targetUrl.match(/[?&]q=([^&]+)/);
        if (qMatch) {
          placeName = decodeURIComponent(qMatch[1]).replace(/\+/g, ' ').trim();
        }
      }

      if (placeName) {
        const gFwd = await googleForwardGeocode(placeName);
        if (gFwd && gFwd.lat && gFwd.lng) {
          lat = gFwd.lat;
          lng = gFwd.lng;
          address = gFwd.formattedAddress || placeName;
          city = gFwd.city || city;
          if (gFwd.pincode) pincode = gFwd.pincode;
        }
      }
    }

    // Extract plot number if not yet detected
    if (!plotNo && address) {
      const plotMatch = address.match(/(?:plot|h\.?no|door|flat|house)\s*(?:no\.?)?\s*([a-z0-9/A-Z-]+)/i);
      if (plotMatch) {
        plotNo = `Plot No. ${plotMatch[1]}`;
      }
    }

    // Extract colony area
    if (!colonyArea && address) {
      const addrParts = address.split(',').map((s) => s.trim()).filter(Boolean);
      if (addrParts.length > 1) {
        colonyArea = addrParts.slice(0, 2).join(', ');
      }
    }

    // Extract 6-digit Indian PIN code
    if (!pincode && address) {
      const pinMatch = address.match(/\b(5\d{5})\b/) || address.match(/\b(\d{6})\b/);
      if (pinMatch) pincode = pinMatch[1];
    }

    return res.json({
      address: address || targetUrl,
      city: city || 'Hyderabad',
      pincode: pincode || '500097',
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
router.post('/', protect, ownerOnly, upload.any(), async (req, res) => {
  if (!req.file && Array.isArray(req.files) && req.files.length > 0) {
    req.file = req.files.find((f) => f.fieldname === 'imageFile' || f.fieldname === 'image') || req.files[0];
  }
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
    monthlyStorageRate,
    spaceCategory,
    landAcres,
    securityFacilities,
    imageUrl,
    image,
    lat,
    lng,
    suitableVehicles,
  } = req.body;

  try {
    // Validate 1 Acre minimum requirement for Commercial Vehicle Storage
    const isCommercial = spaceCategory === 'commercial_vehicle_storage';
    const acres = landAcres ? Number(landAcres) : 0;
    if (isCommercial && acres < 1) {
      return res.status(400).json({
        message: 'Minimum 1.0 Acre of secure land is strictly required to list a Vehicle Storage Yard for Banks & Auto Finance companies.',
      });
    }

    // Parse multiple images if provided
    let finalImages = [];
    if (req.body.images) {
      let rawImages = req.body.images;
      if (typeof rawImages === 'string') {
        try {
          rawImages = JSON.parse(rawImages);
        } catch (e) {
          rawImages = rawImages.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(rawImages)) {
        finalImages = rawImages.map((img) => formatImageUrl(req, null, img)).filter(Boolean);
      }
    }

    if (Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((f) => {
        const u = `/uploads/${f.filename}`;
        if (!finalImages.includes(u)) {
          finalImages.push(u);
        }
      });
    }

    const finalImageUrl = formatImageUrl(req, req.file, image || imageUrl || (finalImages.length > 0 ? finalImages[0] : ''));
    if (finalImageUrl && !finalImages.includes(finalImageUrl)) {
      finalImages.unshift(finalImageUrl);
    }

    const finalTotalSlots = Number(totalSlots || totalSpots || (isCommercial ? 100 : 5));
    const finalRate = Number(pricePerHour || hourlyRate || 50);
    const finalAddress = address || location || 'Hyderabad';
    const finalLocation = location || address || 'Hyderabad';
    const finalCity = city || 'Hyderabad';
    const finalMapsLink = googleMapsLink || locationLink || `https://www.google.com/maps?q=${lat || 17.385044},${lng || 78.486671}`;

    // Auto-generate slots
    const slots = [];
    const prefix = isCommercial ? 'Yard-Bay-' : 'Slot-';
    for (let i = 1; i <= Math.min(finalTotalSlots, 500); i++) {
      slots.push({
        slotId: `${prefix}${i}`,
        name: isCommercial ? `Storage Bay #${i}` : `Slot #${i}`,
        isAvailable: true,
      });
    }

    // Parse suitable vehicles
    let suitableList = ['hatchback', 'sedan', 'suv'];
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

    let parsedSecurity = {
      hasCompoundWall: false,
      has24x7Guards: false,
      hasCctv: true,
      hasFloodLights: false,
      isGated: true,
    };
    if (securityFacilities) {
      if (typeof securityFacilities === 'string') {
        try {
          parsedSecurity = { ...parsedSecurity, ...JSON.parse(securityFacilities) };
        } catch (e) {}
      } else if (typeof securityFacilities === 'object') {
        parsedSecurity = { ...parsedSecurity, ...securityFacilities };
      }
    }

    // Robust coordinate resolution via Google Geocoding & Maps parsing
    let finalLat = lat ? parseFloat(lat) : null;
    let finalLng = lng ? parseFloat(lng) : null;

    if (!finalLat || !finalLng || isNaN(finalLat) || isNaN(finalLng) || (finalLat === 17.385044 && finalLng === 78.486671)) {
      if (finalMapsLink) {
        const linkCoords = await extractCoordsFromMapsInput(finalMapsLink);
        if (linkCoords && linkCoords.lat && linkCoords.lng) {
          finalLat = linkCoords.lat;
          finalLng = linkCoords.lng;
        }
      }
      if (!finalLat || !finalLng) {
        const geoCoords = await googleForwardGeocode(finalAddress);
        if (geoCoords && geoCoords.lat && geoCoords.lng) {
          finalLat = geoCoords.lat;
          finalLng = geoCoords.lng;
        }
      }
    }

    if (!finalLat || !finalLng || isNaN(finalLat) || isNaN(finalLng)) {
      finalLat = 17.313;
      finalLng = 78.545;
    }

    const space = new ParkingSpace({
      ownerId: req.user._id,
      title: title || (isCommercial ? `Secured ${acres} Acre Auto Stockyard` : finalAddress),
      address: finalAddress,
      location: finalLocation,
      city: finalCity,
      pincode: req.body.pincode || '',
      googleMapsLink: finalMapsLink,
      hasEvCharger: (hasEvCharger === true || hasEvCharger === 'true' || hasEvCharger === 1 || hasEvCharger === '1'),
      totalSlots: finalTotalSlots,
      pricePerHour: finalRate,
      pricePerDay: pricePerDay ? Number(pricePerDay) : finalRate * 8,
      pricePerWeek: pricePerWeek ? Number(pricePerWeek) : finalRate * 24 * 7,
      pricePerMonth: pricePerMonth ? Number(pricePerMonth) : finalRate * 24 * 30,
      monthlyStorageRate: monthlyStorageRate ? Number(monthlyStorageRate) : (isCommercial ? 1500 : 0),
      spaceCategory: isCommercial ? 'commercial_vehicle_storage' : 'standard',
      landAcres: acres,
      securityFacilities: parsedSecurity,
      image: finalImageUrl,
      images: finalImages,
      coordinates: {
        lat: finalLat,
        lng: finalLng,
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

  // Find all active bookings (allotted, paid, or checked_in) where end time is in the future
  const activeBookings = await Booking.find({
    spaceId: { $in: spaceIds },
    status: { $in: ['allotted', 'paid', 'checked_in', 'pending_approval'] },
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
    } else {
      spaceObj.slots = Array.from({ length: total }, (_, i) => {
        const slotId = `Slot-${i + 1}`;
        return {
          slotId,
          isAvailable: !bookedSet.has(slotId),
        };
      });
    }

    spaceObj.availableSlots = available;
    spaceObj.occupiedSlots = occupied;
    return spaceObj;
  });
};

// ─── GET /api/spaces/:id/available-slots-by-time ─────────────────────────────
router.get('/:id/available-slots-by-time', async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    const totalSlots = space.totalSlots || (space.slots ? space.slots.length : 5);
    let slots = space.slots && space.slots.length > 0
      ? space.slots.map(s => ({ slotId: s.slotId, isAvailable: true }))
      : Array.from({ length: totalSlots }, (_, i) => ({ slotId: `Slot-${i + 1}`, isAvailable: true }));

    const { startTime, hours } = req.query;
    const now = new Date();
    const start = startTime ? new Date(startTime) : now;
    const end = new Date(start.getTime() + (Number(hours) || 1) * 60 * 60 * 1000);

    const activeBookings = await Booking.find({
      spaceId: req.params.id,
      status: { $in: ['paid', 'checked_in'] },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    const bookedSlots = new Set(activeBookings.map(b => b.slotId).filter(Boolean));
    slots = slots.map(s => ({
      ...s,
      isAvailable: !bookedSlots.has(s.slotId)
    }));

    res.json(slots);
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/spaces  (Public / Seeker) ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { includeInactive, search, category } = req.query;
    const query = { status: 'approved' };

    if (category) {
      if (category === 'standard') {
        query.spaceCategory = { $in: ['standard', null] };
      } else {
        query.spaceCategory = category;
      }
    }

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

// ─── PUT /api/spaces/admin/toggle/:id  (Admin toggle active) ──────────────────
router.put('/admin/toggle/:id', protect, adminOnly, async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    space.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !space.isActive;
    await space.save();
    res.json({ message: `Space is now ${space.isActive ? 'active' : 'inactive'}`, space });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/spaces/:id/approve  (Admin alias) ──────────────────────────────
router.put('/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    space.status = req.body.status || 'approved';
    if (req.body.slotPrefix && space.slots) {
      const prefix = req.body.slotPrefix;
      space.slots = space.slots.map((s, idx) => ({
        ...s.toObject(),
        slotId: `${prefix}${idx + 1}`
      }));
    }
    await space.save();
    res.json({ message: `Space ${space.status} successfully`, space });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT & PATCH /api/spaces/:id/toggle  (Owner or Admin — toggle space active/inactive) ───
const toggleHandler = async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    if (req.user.role !== 'admin' && space.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to toggle this space' });
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
router.put('/:id/toggle', protect, toggleHandler);
router.patch('/:id/toggle', protect, toggleHandler);

// ─── GET /api/spaces/pending (Alias for Admin) ──────────────────────────────
router.get('/pending', protect, adminOnly, async (req, res) => {
  try {
    const spaces = await ParkingSpace.find({ status: 'pending' }).populate('ownerId', 'name email contact');
    res.json(spaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/spaces/:id  (Public / Seeker) ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'pending' || req.params.id === 'undefined' || req.params.id.length !== 24) {
      return res.status(404).json({ message: 'Invalid space ID' });
    }
    const space = await ParkingSpace.findById(req.params.id).populate('ownerId', 'name email contact');
    if (!space) return res.status(404).json({ message: 'Space not found' });
    const [enriched] = await enrichSpaceWithSlotAvailability([space]);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/spaces/:id  (Owner or Admin update — supports image file replace) ──
router.put('/:id', protect, upload.any(), async (req, res) => {
  try {
    if (!req.file && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files.find((f) => f.fieldname === 'imageFile' || f.fieldname === 'image') || req.files[0];
    }
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    if (req.user.role !== 'admin' && space.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this space' });
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
    } else if (req.body.image || req.body.imageUrl) {
      space.image = formatImageUrl(req, null, req.body.image || req.body.imageUrl);
    }

    if (req.body.images) {
      let rawImages = req.body.images;
      if (typeof rawImages === 'string') {
        try {
          rawImages = JSON.parse(rawImages);
        } catch (e) {
          rawImages = rawImages.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(rawImages)) {
        space.images = rawImages.map((img) => formatImageUrl(req, null, img)).filter(Boolean);
        if (space.images.length > 0 && !space.image) {
          space.image = space.images[0];
        }
      }
    }

    if (Array.isArray(req.files) && req.files.length > 0) {
      if (!Array.isArray(space.images)) space.images = [];
      req.files.forEach((f) => {
        const u = `/uploads/${f.filename}`;
        if (!space.images.includes(u)) {
          space.images.push(u);
        }
      });
      if (!space.image && space.images.length > 0) {
        space.image = space.images[0];
      }
    }

    // ── Other field updates ──────────────────────────────────────────────────
    if (req.body.title)        space.title       = req.body.title;
    if (req.body.address)      space.address     = req.body.address;
    if (req.body.city)         space.city        = req.body.city;
    if (req.body.location)     space.location    = req.body.location;
    if (req.body.locationLink) space.locationLink = req.body.locationLink;
    if (req.body.googleMapsLink) space.googleMapsLink = req.body.googleMapsLink;
    if (req.body.pincode)      space.pincode      = req.body.pincode;
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
    } else if (req.body.googleMapsLink || req.body.locationLink) {
      const linkCoords = await extractCoordsFromMapsInput(req.body.googleMapsLink || req.body.locationLink);
      if (linkCoords && linkCoords.lat && linkCoords.lng) {
        space.coordinates = { lat: linkCoords.lat, lng: linkCoords.lng };
      }
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

    if (req.body.monthlyStorageRate !== undefined) {
      space.monthlyStorageRate = Number(req.body.monthlyStorageRate);
    }

    if (req.body.landAcres !== undefined) {
      space.landAcres = Number(req.body.landAcres);
    }

    if (req.body.spaceCategory) {
      space.spaceCategory = req.body.spaceCategory;
    }

    if (req.body.securityFacilities) {
      let sec = req.body.securityFacilities;
      if (typeof sec === 'string') {
        try { sec = JSON.parse(sec); } catch (e) {}
      }
      if (typeof sec === 'object' && sec !== null) {
        space.securityFacilities = { ...space.securityFacilities, ...sec };
      }
    }

    const updated = await space.save();
    res.json({ message: 'Space updated successfully', space: updated });
  } catch (error) {
    console.error('Space update error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── DELETE /api/spaces/admin/:id  (Admin only) ──────────────────────────────
router.delete('/admin/:id', protect, adminOnly, async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    if (space.image && space.image.startsWith('/uploads/')) {
      const imgPath = path.join(__dirname, '..', space.image);
      if (fs.existsSync(imgPath)) {
        try { fs.unlinkSync(imgPath); } catch (e) { console.warn(e.message); }
      }
    }

    await space.deleteOne();
    res.json({ message: 'Parking space removed successfully by admin' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── DELETE /api/spaces/:id  (Owner or Admin) ────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    if (req.user.role !== 'admin' && space.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this space' });
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

// ─── POST /api/spaces/road-distances ──────────────────────────────────────────
// Batch calculate accurate driving road distance & ETA via Google Distance Matrix API
router.post('/road-distances', async (req, res) => {
  const { origin, destinations } = req.body;
  if (!origin || !origin.lat || !origin.lng || !Array.isArray(destinations) || destinations.length === 0) {
    return res.status(400).json({ message: 'origin {lat, lng} and destinations array are required' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDkSYnPhr-3QFIN8ynIL3uwoa-_bs1R_y0';

  try {
    const batch = destinations.slice(0, 25);
    const destCoords = batch.map((d) => `${d.lat},${d.lng}`).join('|');
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${encodeURIComponent(
      destCoords
    )}&mode=driving&key=${apiKey}`;

    const fetchRes = await fetch(url);
    const data = await fetchRes.json();

    if (data.status !== 'OK' || !data.rows || !data.rows[0]) {
      return res.status(400).json({
        message: data.error_message || `Distance Matrix returned status: ${data.status}`,
        details: data,
      });
    }

    const results = {};
    const elements = data.rows[0].elements || [];

    batch.forEach((dest, index) => {
      const el = elements[index];
      if (el && el.status === 'OK' && el.distance) {
        const roadDistanceKm = Math.round((el.distance.value / 1000) * 10) / 10;
        results[dest.id] = {
          roadDistanceKm,
          roadDistanceText: el.distance.text,
          roadDurationText: el.duration ? el.duration.text : '',
          durationSeconds: el.duration ? el.duration.value : 0,
        };
      }
    });

    res.json({ success: true, results });
  } catch (error) {
    console.error('Road distance calculation error:', error);
    res.status(500).json({ message: 'Failed to calculate road distances', error: error.message });
  }
});

module.exports = router;
