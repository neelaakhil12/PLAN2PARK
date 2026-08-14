const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const ParkingSpace = require('../models/ParkingSpace');
const { protect, adminOnly, ownerOnly, seekerOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// @desc    Create a parking booking request (Seeker)
// @route   POST /api/bookings
// @access  Private (Seeker only)
router.post('/', protect, seekerOnly, upload.single('driverImageFile'), async (req, res) => {
  const { spaceId, slotId, vehicleNumber, seekerName, seekerContact, hours, startTime, bookingType = 'hourly' } = req.body;
  let finalDriverImage = req.body.driverImage || '';

  if (req.file) {
    if (isCloudinaryConfigured) {
      finalDriverImage = req.file.path;
    } else {
      finalDriverImage = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }
  }

  try {
    const space = await ParkingSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    if (space.status !== 'approved') {
      return res.status(400).json({ message: 'This parking space is not active or approved' });
    }

    if (!slotId) {
      return res.status(400).json({ message: 'A slot selection is required.' });
    }

    // Verify slotId exists
    const slotExists = (space.slots || []).some(s => s.slotId === slotId);
    if (!slotExists) {
      return res.status(400).json({ message: 'The requested slot does not exist.' });
    }

    const start = new Date(startTime);
    let actualHours = Number(hours) || 1;
    let endTime = new Date(start.getTime() + actualHours * 60 * 60 * 1000);
    let totalAmount = actualHours * space.pricePerHour;

    if (bookingType === 'daily') {
      actualHours = 24;
      endTime = new Date(start.getTime() + actualHours * 60 * 60 * 1000);
      totalAmount = space.pricePerDay;
    } else if (bookingType === 'weekly') {
      if (!space.pricePerWeek) {
        return res.status(400).json({ message: 'The owner has not set a weekly price for this space.' });
      }
      actualHours = 7 * 24;
      endTime = new Date(start.getTime() + actualHours * 60 * 60 * 1000);
      totalAmount = space.pricePerWeek;
    } else if (bookingType === 'monthly') {
      if (!space.pricePerMonth) {
        return res.status(400).json({ message: 'The owner has not set a monthly price for this space.' });
      }
      actualHours = 30 * 24;
      endTime = new Date(start.getTime() + actualHours * 60 * 60 * 1000);
      totalAmount = space.pricePerMonth;
    }

    // Verify no overlap on the exact slotId for active bookings
    const overlapping = await Booking.find({
      spaceId,
      slotId,
      status: { $in: ['allotted', 'paid'] },
      startTime: { $lt: endTime },
      endTime: { $gt: start }
    });

    if (overlapping.length > 0) {
      return res.status(400).json({ message: 'This slot is already booked for the selected time window. Please choose another slot.' });
    }

    // Calculate total amount was handled above

    const booking = await Booking.create({
      seekerId: req.user._id,
      spaceId,
      slotId,
      vehicleNumber,
      seekerName,
      seekerContact,
      hours: actualHours,
      bookingType,
      startTime: start,
      endTime: endTime,
      totalAmount,
      driverImage: finalDriverImage,
      status: 'allotted', // Directly allotted because seeker chose slot
      paymentStatus: 'unpaid',
    });

    res.status(201).json({
      message: 'Booking created successfully with your selected slot! Proceed to pay.',
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get seeker's bookings
// @route   GET /api/bookings/my-bookings
// @access  Private (Seeker only)
router.get('/my-bookings', protect, seekerOnly, async (req, res) => {
  try {
    const bookings = await Booking.find({ seekerId: req.user._id })
      .populate({
        path: 'spaceId',
        populate: { path: 'ownerId', select: 'name contact email' },
      })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get owner's bookings (requests and active ones)
// @route   GET /api/bookings/owner-bookings
// @access  Private (Owner only)
router.get('/owner-bookings', protect, ownerOnly, async (req, res) => {
  try {
    // Find all spaces owned by this owner
    const spaces = await ParkingSpace.find({ ownerId: req.user._id });
    const spaceIds = spaces.map((space) => space._id);

    // Find bookings for these spaces
    const bookings = await Booking.find({ spaceId: { $in: spaceIds } })
      .populate('spaceId')
      .populate('seekerId', 'name email contact')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all bookings (Admin only)
// @route   GET /api/bookings/admin-bookings
// @access  Private (Admin only)
router.get('/admin-bookings', protect, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('spaceId')
      .populate('seekerId', 'name email contact profileImage driverLicenseImage')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// @desc    Owner allots a slot and confirms booking
// @route   PUT /api/bookings/:id/allot
// @access  Private (Owner only)
router.put('/:id/allot', protect, ownerOnly, async (req, res) => {
  const { slotId } = req.body; // Selected slotId from frontend

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const space = await ParkingSpace.findById(booking.spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    // Verify owner ownership
    if (space.ownerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to manage this booking' });
    }

    // Check if slot is available
    const slot = space.slots.find((s) => s.slotId === slotId);
    if (!slot) {
      return res.status(400).json({ message: 'Slot does not exist in this space' });
    }

    if (!slot.isAvailable) {
      return res.status(400).json({ message: 'Slot is already occupied' });
    }

    // Occupy the slot
    slot.isAvailable = false;
    await space.save();

    // Update booking
    booking.slotId = slotId;
    booking.status = 'allotted';
    await booking.save();

    res.json({ message: 'Slot allotted. Seeker needs to complete payment.', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Pay for booking (Seeker)
// @route   PUT /api/bookings/:id/pay
// @access  Private (Seeker only)
router.put('/:id/pay', protect, seekerOnly, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.seekerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to pay for this booking' });
    }

    if (booking.status !== 'allotted') {
      return res.status(400).json({ message: 'Booking is not in allotted state. Wait for owner approval.' });
    }

    // Calculate commission: 10% to admin, 90% to owner
    const adminCommission = Number((booking.totalAmount * 0.1).toFixed(2));
    const ownerEarnings = Number((booking.totalAmount * 0.9).toFixed(2));

    booking.paymentStatus = 'paid';
    booking.status = 'paid';
    booking.adminCommission = adminCommission;
    booking.ownerEarnings = ownerEarnings;
    
    // Generate Invoice
    booking.invoiceId = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    booking.paidAt = new Date();

    await booking.save();

    res.json({ message: 'Payment successful. Parking confirmed!', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get booking details for invoice
// @route   GET /api/bookings/:id/invoice
// @access  Private
router.get('/:id/invoice', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'spaceId',
        populate: { path: 'ownerId', select: 'name email contact' }
      })
      .populate('seekerId', 'name email contact');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Complete booking (releases slot) (Owner or Seeker)
// @route   PUT /api/bookings/:id/complete
// @access  Private
router.put('/:id/complete', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const space = await ParkingSpace.findById(booking.spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    // Verify authorized user (either seeker of this booking or owner of this space)
    const isSeeker = booking.seekerId.toString() === req.user._id.toString();
    const isOwner = space.ownerId.toString() === req.user._id.toString();

    if (!isSeeker && !isOwner) {
      return res.status(401).json({ message: 'Not authorized to complete this booking' });
    }

    // Release the slot if allotted/paid
    if (booking.slotId) {
      const slot = space.slots.find((s) => s.slotId === booking.slotId);
      if (slot) {
        slot.isAvailable = true;
        await space.save();
      }
    }

    booking.status = 'completed';
    await booking.save();

    res.json({ message: 'Booking completed and slot released', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Cancel booking (releases slot)
// @route   PUT /api/bookings/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const space = await ParkingSpace.findById(booking.spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    const isSeeker = booking.seekerId.toString() === req.user._id.toString();
    const isOwner = space.ownerId.toString() === req.user._id.toString();

    if (!isSeeker && !isOwner) {
      return res.status(401).json({ message: 'Not authorized to cancel this booking' });
    }

    // Release the slot if it was already allotted
    if (booking.slotId) {
      const slot = space.slots.find((s) => s.slotId === booking.slotId);
      if (slot) {
        slot.isAvailable = true;
        await space.save();
      }
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── RAZORPAY INTEGRATION & FINANCIAL MANAGEMENT ROUTES ───────────────────
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');

// Helper to determine if we are in mock mode
const isRazorpayMock = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  return !keyId || keyId.startsWith('rzp_test_mockkey') || keyId === 'mockkey';
};

// @desc    Generate Razorpay Order for a booking
// @route   POST /api/bookings/:id/razorpay-order
// @access  Private (Seeker only)
router.post('/:id/razorpay-order', protect, seekerOnly, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.seekerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to pay for this booking' });
    }

    if (booking.status !== 'allotted') {
      return res.status(400).json({ message: 'Booking is not approved or allotted' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mocksecret';

    if (isRazorpayMock()) {
      // Mock mode
      const mockOrderId = 'order_mock_' + crypto.randomBytes(8).toString('hex');
      return res.json({
        orderId: mockOrderId,
        amount: booking.totalAmount * 100, // in paise
        currency: 'INR',
        keyId,
        isMock: true,
      });
    }

    // Real Razorpay Mode
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: Math.round(booking.totalAmount * 100), // in paise
      currency: 'INR',
      receipt: `receipt_${booking._id}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      isMock: false,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Verify Razorpay payment signature & credit to admin ledger
// @route   POST /api/bookings/:id/verify-payment
// @access  Private (Seeker only)
router.post('/:id/verify-payment', protect, seekerOnly, async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, isMock } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.seekerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to verify this booking' });
    }

    // Verify signature
    if (isMock || isRazorpayMock()) {
      // Direct mock verification
      booking.paymentStatus = 'paid';
      booking.status = 'paid';
      booking.transactionReference = razorpay_payment_id || 'pay_mock_' + crypto.randomBytes(8).toString('hex');
      booking.adminCommission = Number((booking.totalAmount * 0.1).toFixed(2));
      booking.ownerEarnings = Number((booking.totalAmount * 0.9).toFixed(2));
      await booking.save();

      return res.json({ message: 'Mock payment verified successfully!', booking });
    }

    // Real verification
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
    }

    // Update booking status
    booking.paymentStatus = 'paid';
    booking.status = 'paid';
    booking.transactionReference = razorpay_payment_id;
    booking.adminCommission = Number((booking.totalAmount * 0.1).toFixed(2));
    booking.ownerEarnings = Number((booking.totalAmount * 0.9).toFixed(2));
    await booking.save();

    res.json({ message: 'Payment verified and captured successfully!', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get Admin Revenue Report with Date range filters
// @route   GET /api/bookings/revenue-report
// @access  Private (Admin only)
router.get('/revenue-report', protect, adminOnly, async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const matchQuery = { paymentStatus: 'paid' };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // include the end date fully
        matchQuery.createdAt.$lte = end;
      }
    }

    const bookings = await Booking.find(matchQuery)
      .populate('spaceId')
      .populate('seekerId', 'name email')
      .sort({ createdAt: -1 });

    // Calculate aggregated totals
    let totalRevenue = 0;
    let totalCommission = 0;
    let totalOwnerEarnings = 0;

    bookings.forEach((b) => {
      totalRevenue += b.totalAmount || 0;
      totalCommission += b.adminCommission || 0;
      totalOwnerEarnings += b.ownerEarnings || 0;
    });

    res.json({
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        adminCommission: Number(totalCommission.toFixed(2)),
        ownerEarnings: Number(totalOwnerEarnings.toFixed(2)),
        count: bookings.length,
      },
      records: bookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get Owner Revenue summaries (amount generated, paid, and owed)
// @route   GET /api/bookings/owner-revenue-summary
// @access  Private (Admin only)
router.get('/owner-revenue-summary', protect, adminOnly, async (req, res) => {
  try {
    // 1. Get all owners/hosts
    const owners = await User.find({ role: 'owner' }).select('name email contact ownerPaidRevenue bankAccountDetails');

    // 2. Fetch all paid bookings populate spaceId
    const paidBookings = await Booking.find({ paymentStatus: 'paid' }).populate('spaceId');

    // 3. Aggregate owner earnings
    const summaries = owners.map((owner) => {
      // Find all bookings matching this owner's spaceId
      const ownerBookings = paidBookings.filter(
        (b) => b.spaceId && b.spaceId.ownerId && b.spaceId.ownerId.toString() === owner._id.toString()
      );

      const totalEarnings = ownerBookings.reduce((sum, b) => sum + (b.ownerEarnings || 0), 0);
      const paid = owner.ownerPaidRevenue || 0;
      const owed = Math.max(0, totalEarnings - paid);

      return {
        ownerId: owner._id,
        name: owner.name,
        email: owner.email,
        contact: owner.contact,
        bankAccountDetails: owner.bankAccountDetails,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        paidAmount: Number(paid.toFixed(2)),
        owedAmount: Number(owed.toFixed(2)),
      };
    });

    res.json(summaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Record an Admin payout to an owner/host
// @route   POST /api/bookings/payout-owner
// @access  Private (Admin only)
router.post('/payout-owner', protect, adminOnly, async (req, res) => {
  const { ownerId, amount } = req.body;

  try {
    const owner = await User.findById(ownerId);
    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const payoutVal = Number(amount);
    if (isNaN(payoutVal) || payoutVal <= 0) {
      return res.status(400).json({ message: 'Invalid payout amount' });
    }

    // Increment ownerPaidRevenue
    owner.ownerPaidRevenue = (owner.ownerPaidRevenue || 0) + payoutVal;
    await owner.save();

    res.json({
      message: `Successfully recorded payout of ₹${payoutVal} to host ${owner.name}.`,
      ownerPaidRevenue: owner.ownerPaidRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get available slots for a booking's duration
// @route   GET /api/bookings/:id/available-slots
// @access  Private
router.get('/:id/available-slots', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const space = await ParkingSpace.findById(booking.spaceId);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    const startTime = new Date(booking.startTime);
    const endTime = new Date(startTime.getTime() + booking.hours * 60 * 60 * 1000);

    // Find all bookings for the same space that overlap in time and are active
    const overlappingBookings = await Booking.find({
      spaceId: booking.spaceId,
      status: { $in: ['allotted', 'paid'] },
      _id: { $ne: booking._id },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    });

    const occupiedSlotIds = overlappingBookings.map(b => b.slotId).filter(Boolean);

    // Filter slots to find the ones that are not in occupiedSlotIds
    const availableSlots = (space.slots || []).map(s => {
      const isOccupied = occupiedSlotIds.includes(s.slotId);
      return {
        slotId: s.slotId,
        name: s.name,
        isAvailable: !isOccupied
      };
    });

    res.json(availableSlots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Extend a booking duration (Seeker)
// @route   POST /api/bookings/:id/extend
// @access  Private (Seeker only)
router.post('/:id/extend', protect, seekerOnly, async (req, res) => {
  const { extendHours } = req.body;
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (!booking.slotId || !['allotted', 'paid'].includes(booking.status)) {
      return res.status(400).json({ message: 'Extension is only allowed for active bookings with allotted slots.' });
    }

    const space = await ParkingSpace.findById(booking.spaceId);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    const currentEndTime = new Date(booking.endTime || new Date(booking.startTime.getTime() + booking.hours * 60 * 60 * 1000));
    const extensionEndTime = new Date(currentEndTime.getTime() + Number(extendHours) * 60 * 60 * 1000);

    // Check overlap for the exact same slot
    const overlappingBookings = await Booking.find({
      spaceId: booking.spaceId,
      slotId: booking.slotId,
      status: { $in: ['allotted', 'paid'] },
      _id: { $ne: booking._id },
      startTime: { $lt: extensionEndTime },
      endTime: { $gt: currentEndTime }
    });

    if (overlappingBookings.length > 0) {
      return res.status(400).json({
        message: `Extension not possible: Slot ${booking.slotId} is already booked by another commuter for the requested extension duration.`
      });
    }

    // Update booking duration and amount
    const additionalAmount = Number(extendHours) * space.pricePerHour;
    booking.totalAmount += additionalAmount;
    booking.hours += Number(extendHours);
    booking.endTime = extensionEndTime;

    // Recalculate commission if already paid
    if (booking.paymentStatus === 'paid') {
      booking.adminCommission = Number((booking.totalAmount * 0.1).toFixed(2));
      booking.ownerEarnings = Number((booking.totalAmount * 0.9).toFixed(2));
    }

    await booking.save();
    res.json({ message: 'Booking extended successfully!', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
