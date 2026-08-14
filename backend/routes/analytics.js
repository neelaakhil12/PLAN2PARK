const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ParkingSpace = require('../models/ParkingSpace');
const Booking = require('../models/Booking');
const Complaint = require('../models/Complaint');
const { protect, adminOnly, ownerOnly } = require('../middleware/auth');

// Helper to get date string for last N days
const getLastNDaysLabels = (n) => {
  const labels = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }));
  }
  return labels;
};

// @desc    Get Admin-wide analytics dashboard metrics
// @route   GET /api/analytics/admin
// @access  Private (Admin only)
router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    // 1. User counts
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const seekersCount = await User.countDocuments({ role: 'seeker' });
    const ownersCount = await User.countDocuments({ role: 'owner' });
    const pendingUsers = await User.countDocuments({ status: 'pending', role: { $ne: 'admin' } });

    // 2. Space counts
    const totalSpaces = await ParkingSpace.countDocuments();
    const approvedSpaces = await ParkingSpace.countDocuments({ status: 'approved' });
    const pendingSpaces = await ParkingSpace.countDocuments({ status: 'pending' });

    // 3. Booking counts
    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({ status: 'paid' });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });

    // 4. Complaints counts
    const activeComplaints = await Complaint.countDocuments({ status: { $ne: 'resolved' } });

    // 5. Financial totals
    const bookingsData = await Booking.find({ paymentStatus: 'paid' });
    const totalRevenue = bookingsData.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalCommission = bookingsData.reduce((sum, b) => sum + (b.adminCommission || 0), 0);
    const totalOwnerPayout = bookingsData.reduce((sum, b) => sum + (b.ownerEarnings || 0), 0);

    // Today's revenue calculation
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayBookings = await Booking.find({
      paymentStatus: 'paid',
      createdAt: { $gte: todayStart }
    });
    const todayRevenue = todayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    // 6. Recent Bookings (limit to 10 for detailed tables)
    const recentBookings = await Booking.find()
      .populate('seekerId', 'name email contact')
      .populate('spaceId', 'location address image pricePerHour')
      .sort({ createdAt: -1 })
      .limit(10);

    // 7. Dynamic Chart Data (Last 10 days of bookings and revenue)
    const chartLabels = getLastNDaysLabels(10);
    const chartBookings = Array(10).fill(0);
    const chartRevenue = Array(10).fill(0);

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    tenDaysAgo.setHours(0,0,0,0);

    const lastTenDaysBookings = await Booking.find({
      createdAt: { $gte: tenDaysAgo }
    });

    lastTenDaysBookings.forEach(b => {
      const bDateStr = new Date(b.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      const idx = chartLabels.indexOf(bDateStr);
      if (idx !== -1) {
        chartBookings[idx] += 1;
        if (b.paymentStatus === 'paid') {
          chartRevenue[idx] += b.totalAmount || 0;
        }
      }
    });

    // 8. Parking Status Distribution
    // We calculate slot occupancy status across all approved spaces
    const approvedSpacesList = await ParkingSpace.find({ status: 'approved' });
    let slotsAvailable = 0;
    let slotsBooked = 0;
    approvedSpacesList.forEach(space => {
      space.slots.forEach(slot => {
        if (slot.isAvailable) slotsAvailable++;
        else slotsBooked++;
      });
    });

    const parkingDistribution = {
      available: slotsAvailable,
      booked: slotsBooked,
      blocked: Math.round((slotsAvailable + slotsBooked) * 0.08), // mock blocked status (8% standard)
      inactive: Math.round((slotsAvailable + slotsBooked) * 0.04), // mock inactive (4% standard)
    };

    res.json({
      users: {
        total: totalUsers,
        seekers: seekersCount,
        owners: ownersCount,
        pending: pendingUsers,
      },
      spaces: {
        total: totalSpaces,
        approved: approvedSpaces,
        pending: pendingSpaces,
      },
      bookings: {
        total: totalBookings,
        active: activeBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      complaints: {
        active: activeComplaints,
      },
      finances: {
        totalRevenue,
        totalCommission,
        totalOwnerPayout,
        todayRevenue,
      },
      recentBookings,
      chartData: {
        labels: chartLabels,
        bookings: chartBookings,
        revenue: chartRevenue,
      },
      parkingDistribution,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get Owner-specific analytics dashboard metrics
// @route   GET /api/analytics/owner
// @access  Private (Owner only)
router.get('/owner', protect, ownerOnly, async (req, res) => {
  try {
    const ownerId = req.user._id;

    // 1. Get owner's spaces
    const spaces = await ParkingSpace.find({ ownerId });
    const spaceIds = spaces.map((s) => s._id);

    // 2. Count slots status (total slots, currently occupied)
    let totalSlotsCount = 0;
    let occupiedSlotsCount = 0;
    spaces.forEach((s) => {
      if (s.status === 'approved') {
        totalSlotsCount += s.slots.length;
        occupiedSlotsCount += s.slots.filter((slot) => !slot.isAvailable).length;
      }
    });

    // 3. Earnings (all paid bookings and retained cancellation earnings)
    const bookings = await Booking.find({
      spaceId: { $in: spaceIds },
      $or: [
        { paymentStatus: 'paid' },
        { ownerEarnings: { $gt: 0 } },
      ],
    });
    const totalEarnings = bookings.reduce((sum, b) => sum + (b.ownerEarnings || 0), 0);

    // 4. Booking counts
    const allBookings = await Booking.find({ spaceId: { $in: spaceIds } });
    const pendingApprovalCount = allBookings.filter((b) => b.status === 'pending_approval').length;
    const activeCount = allBookings.filter((b) => b.status === 'paid').length;
    const completedCount = allBookings.filter((b) => b.status === 'completed').length;

    // 5. Recent Bookings
    const recentBookings = await Booking.find({ spaceId: { $in: spaceIds } })
      .populate('seekerId', 'name contact email')
      .populate('spaceId', 'location address image')
      .sort({ createdAt: -1 })
      .limit(10);

    // 6. Earnings Chart Data (last 7 labels)
    const chartLabels = getLastNDaysLabels(7);
    const earningsByDay = Array(7).fill(0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const lastWeekBookings = await Booking.find({
      spaceId: { $in: spaceIds },
      paymentStatus: 'paid',
      createdAt: { $gte: sevenDaysAgo }
    });

    lastWeekBookings.forEach(b => {
      const bDateStr = new Date(b.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      const idx = chartLabels.indexOf(bDateStr);
      if (idx !== -1) {
        earningsByDay[idx] += b.ownerEarnings || 0;
      }
    });

    res.json({
      spacesCount: spaces.length,
      slots: {
        total: totalSlotsCount,
        occupied: occupiedSlotsCount,
        occupancyRate: totalSlotsCount > 0 ? Math.round((occupiedSlotsCount / totalSlotsCount) * 100) : 0,
      },
      earnings: totalEarnings,
      paidAmount: req.user.ownerPaidRevenue || 0,
      owedAmount: Math.max(0, totalEarnings - (req.user.ownerPaidRevenue || 0)),
      bookings: {
        total: allBookings.length,
        pendingApproval: pendingApprovalCount,
        active: activeCount,
        completed: completedCount,
      },
      recentBookings,
      chartData: {
        labels: chartLabels,
        earnings: earningsByDay,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get Seeker-specific analytics dashboard metrics
// @route   GET /api/analytics/seeker
// @access  Private
router.get('/seeker', protect, async (req, res) => {
  try {
    const seekerId = req.user._id;

    const bookings = await Booking.find({ seekerId })
      .populate('spaceId', 'address location pricePerHour image');
    const totalBookings = bookings.length;
    
    const paidBookings = bookings.filter((b) => b.paymentStatus === 'paid');
    const totalSpent = paidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const upcomingBookingsCount = bookings.filter((b) => b.status === 'paid').length;
    const completedBookings = bookings.filter((b) => b.status === 'completed').length;

    // Recent seeker bookings
    const recentBookings = await Booking.find({ seekerId })
      .populate('spaceId', 'address location image pricePerHour')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalBookings,
      totalSpent,
      upcomingBookings: upcomingBookingsCount,
      completedBookings,
      recentBookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
