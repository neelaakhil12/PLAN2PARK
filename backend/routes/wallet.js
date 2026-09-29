const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const User = require('../models/User');
const Booking = require('../models/Booking');
const PayoutRequest = require('../models/PayoutRequest');
const SystemSetting = require('../models/SystemSetting');
const Notification = require('../models/Notification');
const { protect, adminOnly, ownerOnly } = require('../middleware/auth');

// Receipts upload directory
const receiptsDir = path.join(__dirname, '../uploads/receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

// Multer storage for payment proof screenshots
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, receiptsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `receipt-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed as payment receipt proofs!'));
    }
  },
});

// Helper: Get active commission rate
const getCommissionRate = async () => {
  try {
    const setting = await SystemSetting.findOne({ key: 'platformCommissionRate' });
    if (setting && typeof setting.value === 'number') {
      return setting.value;
    }
    return 10; // Default 10%
  } catch (err) {
    return 10;
  }
};

// ─── 1. OWNER: GET WALLET DETAILS ─────────────────────────────────────────────
// @desc    Get owner wallet balance, summary metrics, transactions, and payout requests
// @route   GET /api/wallet/owner
// @access  Private (Owner)
router.get('/owner', protect, ownerOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const payoutRequests = await PayoutRequest.find({ ownerId: req.user._id }).sort({ createdAt: -1 });

    const pendingWithdrawal = payoutRequests
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalWithdrawn = payoutRequests
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + r.amount, 0);

    const transactions = (user.walletTransactions || []).slice().reverse();

    const commissionRate = await getCommissionRate();

    res.json({
      walletBalance: Number((user.walletBalance || 0).toFixed(2)),
      pendingWithdrawal: Number(pendingWithdrawal.toFixed(2)),
      totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      totalGrossEarned: Number(((user.walletBalance || 0) + totalWithdrawn + pendingWithdrawal).toFixed(2)),
      platformCommissionRate: commissionRate,
      bankAccountDetails: user.bankAccountDetails || {},
      transactions,
      payoutRequests,
    });
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── 2. OWNER: SUBMIT WITHDRAWAL REQUEST ──────────────────────────────────────
// @desc    Request a payout/withdrawal from available wallet balance
// @route   POST /api/wallet/withdraw
// @access  Private (Owner)
router.post('/withdraw', protect, ownerOnly, async (req, res) => {
  try {
    const { amount, payoutMethod, upiId, accountName, accountNumber, ifscCode, bankName } = req.body;
    const withdrawAmount = Number(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ message: 'Please enter a valid withdrawal amount.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const currentBalance = user.walletBalance || 0;
    if (withdrawAmount > currentBalance) {
      return res.status(400).json({
        message: `Insufficient funds. Your available balance is ₹${currentBalance.toFixed(2)}.`,
      });
    }

    if (payoutMethod === 'upi') {
      if (!upiId || !upiId.trim()) {
        return res.status(400).json({ message: 'Please provide a valid UPI ID (e.g., name@okhdfcbank).' });
      }
    } else {
      if (!accountNumber || !ifscCode || !accountName) {
        return res.status(400).json({ message: 'Please provide complete bank details (Account Name, Number & IFSC).' });
      }
    }

    // Save/update bank details on owner profile for next time
    if (!user.bankAccountDetails) user.bankAccountDetails = {};
    if (upiId) user.bankAccountDetails.upiId = upiId.trim();
    if (accountName) user.bankAccountDetails.accountName = accountName.trim();
    if (accountNumber) user.bankAccountDetails.accountNumber = accountNumber.trim();
    if (ifscCode) user.bankAccountDetails.ifscCode = ifscCode.trim().toUpperCase();
    if (bankName) user.bankAccountDetails.bankName = bankName.trim();

    // Deduct from wallet balance
    user.walletBalance = Number((currentBalance - withdrawAmount).toFixed(2));
    if (!user.walletTransactions) user.walletTransactions = [];

    const payoutDetails = {
      upiId: upiId ? upiId.trim() : (user.bankAccountDetails?.upiId || ''),
      accountName: accountName ? accountName.trim() : (user.bankAccountDetails?.accountName || ''),
      accountNumber: accountNumber ? accountNumber.trim() : (user.bankAccountDetails?.accountNumber || ''),
      ifscCode: ifscCode ? ifscCode.trim().toUpperCase() : (user.bankAccountDetails?.ifscCode || ''),
      bankName: bankName ? bankName.trim() : (user.bankAccountDetails?.bankName || ''),
    };

    const payoutRequest = await PayoutRequest.create({
      ownerId: user._id,
      amount: withdrawAmount,
      payoutMethod: payoutMethod || 'upi',
      payoutDetails,
      status: 'pending',
      requestedAt: new Date(),
    });

    user.walletTransactions.push({
      type: 'debit',
      amount: withdrawAmount,
      description: `Withdrawal request #${payoutRequest._id.toString().slice(-6).toUpperCase()} (${(payoutMethod || 'UPI').toUpperCase()})`,
      date: new Date(),
    });

    await user.save();

    // Notify System Admin of new payout request
    try {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          targetRole: 'admin',
          type: 'payout_request',
          title: '💸 New Withdrawal Request',
          message: `${user.name} requested a withdrawal of ₹${withdrawAmount} via ${(payoutMethod || 'upi').toUpperCase()}.`,
          data: {
            payoutRequestId: payoutRequest._id,
            ownerId: user._id,
            amount: withdrawAmount,
          },
        });
      }
    } catch (notifErr) {
      console.warn('Admin notification error:', notifErr.message);
    }

    res.status(201).json({
      message: `Withdrawal request for ₹${withdrawAmount} submitted successfully. Admin will process and send receipt proof.`,
      payoutRequest,
      newBalance: user.walletBalance,
    });
  } catch (error) {
    console.error('Withdrawal submission error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── 3. ADMIN: GET ALL PAYOUT REQUESTS ────────────────────────────────────────
// @desc    Get all owner payout requests with optional filter
// @route   GET /api/wallet/admin/requests
// @access  Private (Admin)
router.get('/admin/requests', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const requests = await PayoutRequest.find(filter)
      .populate('ownerId', 'name email contact uniqueId role organizationName profileImage')
      .sort({ createdAt: -1 });

    const pendingTotal = await PayoutRequest.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const approvedTotal = await PayoutRequest.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const commissionRate = await getCommissionRate();

    res.json({
      requests,
      metrics: {
        pendingAmount: pendingTotal[0]?.total || 0,
        approvedAmount: approvedTotal[0]?.total || 0,
        totalRequests: requests.length,
      },
      platformCommissionRate: commissionRate,
    });
  } catch (error) {
    console.error('Admin payout list error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── 4. ADMIN: APPROVE PAYOUT REQUEST & ATTACH SCREENSHOT ─────────────────────
// @desc    Approve payout request, upload transfer receipt screenshot, and mark paid
// @route   POST /api/wallet/admin/approve/:id
// @access  Private (Admin)
router.post('/admin/approve/:id', protect, adminOnly, upload.single('receiptImage'), async (req, res) => {
  try {
    const request = await PayoutRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Payout request not found.' });

    if (request.status === 'approved') {
      return res.status(400).json({ message: 'This payout request has already been approved.' });
    }

    const { transactionReference, adminNotes } = req.body;

    let receiptUrl = '';
    if (req.file) {
      receiptUrl = `/uploads/receipts/${req.file.filename}`;
    } else if (req.body.receiptUrl) {
      receiptUrl = req.body.receiptUrl;
    }

    request.status = 'approved';
    request.processedAt = new Date();
    if (transactionReference) request.transactionReference = transactionReference.trim();
    if (adminNotes) request.adminNotes = adminNotes.trim();
    if (receiptUrl) request.adminReceiptImage = receiptUrl;

    await request.save();

    // Increment owner paid revenue metric
    const owner = await User.findById(request.ownerId);
    if (owner) {
      owner.ownerPaidRevenue = (owner.ownerPaidRevenue || 0) + request.amount;
      await owner.save();

      // Send Real-Time Notification with Payment Proof to Owner
      try {
        await Notification.create({
          userId: owner._id,
          targetRole: 'owner',
          type: 'payout_approved',
          title: '🎉 Payout Transferred & Verified!',
          message: `Your withdrawal of ₹${request.amount} has been paid via ${(request.payoutMethod || 'UPI').toUpperCase()}. ${
            transactionReference ? `Ref/UTR: ${transactionReference}.` : ''
          } Payment receipt screenshot attached.`,
          data: {
            payoutRequestId: request._id,
            amount: request.amount,
            receiptImage: receiptUrl,
            transactionReference: transactionReference || '',
          },
        });
      } catch (notifErr) {
        console.warn('Owner notification error:', notifErr.message);
      }
    }

    res.json({
      message: `Payout request for ₹${request.amount} approved and marked completed!`,
      payoutRequest: request,
    });
  } catch (error) {
    console.error('Payout approval error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── 5. ADMIN: REJECT PAYOUT REQUEST & REFUND WALLET ──────────────────────────
// @desc    Reject payout request and refund amount to owner's wallet
// @route   POST /api/wallet/admin/reject/:id
// @access  Private (Admin)
router.post('/admin/reject/:id', protect, adminOnly, async (req, res) => {
  try {
    const request = await PayoutRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Payout request not found.' });

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Cannot reject request with status '${request.status}'.` });
    }

    const { reason } = req.body;
    const rejectReason = reason ? reason.trim() : 'Bank / UPI details could not be verified.';

    request.status = 'rejected';
    request.adminNotes = rejectReason;
    request.processedAt = new Date();
    await request.save();

    // Refund funds back to owner wallet
    const owner = await User.findById(request.ownerId);
    if (owner) {
      owner.walletBalance = Number(((owner.walletBalance || 0) + request.amount).toFixed(2));
      if (!owner.walletTransactions) owner.walletTransactions = [];
      owner.walletTransactions.push({
        type: 'credit',
        amount: request.amount,
        description: `Refund for rejected withdrawal #${request._id.toString().slice(-6).toUpperCase()} (${rejectReason})`,
        date: new Date(),
      });
      await owner.save();

      // Notify Owner of Rejection & Refund
      try {
        await Notification.create({
          userId: owner._id,
          targetRole: 'owner',
          type: 'payout_rejected',
          title: '⚠️ Withdrawal Request Declined',
          message: `Your withdrawal of ₹${request.amount} was rejected: "${rejectReason}". The funds have been refunded to your wallet balance.`,
          data: {
            payoutRequestId: request._id,
            amount: request.amount,
            reason: rejectReason,
          },
        });
      } catch (notifErr) {
        console.warn('Owner notification error:', notifErr.message);
      }
    }

    res.json({
      message: `Payout request rejected and ₹${request.amount} refunded back to owner wallet.`,
      payoutRequest: request,
    });
  } catch (error) {
    console.error('Payout rejection error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── 6. ADMIN: COMMISSION CONFIGURATION ───────────────────────────────────────
// @desc    Get & Update platform commission rate
// @route   GET & PUT /api/wallet/admin/commission
// @access  Private (Admin)
router.get('/admin/commission', protect, adminOnly, async (req, res) => {
  try {
    const rate = await getCommissionRate();
    res.json({ commissionPercentage: rate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/admin/commission', protect, adminOnly, async (req, res) => {
  try {
    const { commissionPercentage } = req.body;
    const rate = Number(commissionPercentage);

    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ message: 'Commission rate must be between 0 and 100 percent.' });
    }

    await SystemSetting.findOneAndUpdate(
      { key: 'platformCommissionRate' },
      {
        key: 'platformCommissionRate',
        value: rate,
        description: 'Platform commission percentage charged on booking payments before owner wallet credit.',
      },
      { upsert: true, new: true }
    );

    res.json({ message: `Platform commission rate updated to ${rate}%!`, commissionPercentage: rate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = {
  router,
  getCommissionRate,
};
