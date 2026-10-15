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

// Upload directories
const receiptsDir = path.join(__dirname, '../uploads/receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

const qrCodesDir = path.join(__dirname, '../uploads/qr_codes');
if (!fs.existsSync(qrCodesDir)) {
  fs.mkdirSync(qrCodesDir, { recursive: true });
}

// Multer storage for payment receipts & owner QR code screenshots
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'qrImage') {
      cb(null, qrCodesDir);
    } else {
      cb(null, receiptsDir);
    }
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const prefix = file.fieldname === 'qrImage' ? 'qr' : 'receipt';
    cb(null, `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// Helper: Get active commission rate (Default 15%)
const getCommissionRate = async () => {
  try {
    const setting = await SystemSetting.findOne({ key: 'platformCommissionRate' });
    if (setting && typeof setting.value === 'number') {
      return setting.value;
    }
    return 15; // Default 15% platform commission
  } catch (err) {
    return 15;
  }
};

// Helper: Get active minimum withdrawal amount (Default ₹2000)
const getMinWithdrawalAmount = async () => {
  try {
    const setting = await SystemSetting.findOne({ key: 'minWithdrawalAmount' });
    if (setting && typeof setting.value === 'number') {
      return setting.value;
    }
    return 2000; // Default ₹2000 minimum withdrawal
  } catch (err) {
    return 2000;
  }
};

// ─── 1. OWNER: GET WALLET DETAILS ─────────────────────────────────────────────
// @desc    Get owner wallet balance, summary metrics, transactions, and payout requests
// @route   GET /api/wallet/owner
// @access  Private (Owner)
router.get('/owner', protect, ownerOnly, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
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

    const availableBalance = Math.max(0, Number(((user.walletBalance || 0) - pendingWithdrawal).toFixed(2)));
    const totalGrossEarned = Number(((user.walletBalance || 0) + totalWithdrawn).toFixed(2));

    // Lookup map for decorating transactions with their latest payout request status
    const payoutMap = new Map();
    payoutRequests.forEach((pr) => {
      const fullId = pr._id.toString();
      const shortId = fullId.slice(-6).toUpperCase();
      payoutMap.set(fullId, pr);
      payoutMap.set(shortId, pr);
    });

    const transactions = (user.walletTransactions || []).map((t) => {
      const tx = t.toObject ? t.toObject() : { ...t };
      if (tx.payoutRequestId) {
        const pr = payoutMap.get(tx.payoutRequestId.toString());
        if (pr) tx.status = pr.status;
      } else if (tx.description && /withdrawal/i.test(tx.description)) {
        const match = tx.description.match(/#([A-Z0-9]{6})/i);
        if (match && match[1]) {
          const pr = payoutMap.get(match[1].toUpperCase());
          if (pr) tx.status = pr.status;
        }
      }
      return tx;
    }).reverse();

    const commissionRate = await getCommissionRate();
    const minWithdrawalAmount = await getMinWithdrawalAmount();

    res.json({
      walletBalance: Number((user.walletBalance || 0).toFixed(2)),
      availableBalance,
      pendingWithdrawal: Number(pendingWithdrawal.toFixed(2)),
      totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      totalGrossEarned,
      platformCommissionRate: commissionRate,
      minWithdrawalAmount,
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
// @desc    Request a payout/withdrawal from available wallet balance (with Bank/UPI and QR Code)
// @route   POST /api/wallet/withdraw
// @access  Private (Owner)
router.post('/withdraw', protect, ownerOnly, upload.single('qrImage'), async (req, res) => {
  try {
    const { amount, payoutMethod, upiId, accountName, accountNumber, ifscCode, bankName } = req.body;
    const withdrawAmount = Number(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ message: 'Please enter a valid withdrawal amount.' });
    }

    const minWithdrawalAmount = await getMinWithdrawalAmount();
    if (withdrawAmount < minWithdrawalAmount) {
      return res.status(400).json({
        message: `Minimum withdrawal amount is ₹${minWithdrawalAmount}. You cannot withdraw less than ₹${minWithdrawalAmount}.`,
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Calculate existing pending withdrawal amount
    const pendingRequests = await PayoutRequest.find({ ownerId: user._id, status: 'pending' });
    const pendingAmount = pendingRequests.reduce((sum, r) => sum + r.amount, 0);
    const availableBalance = Math.max(0, (user.walletBalance || 0) - pendingAmount);

    if (withdrawAmount > availableBalance) {
      return res.status(400).json({
        message: `Insufficient withdrawable balance. Your wallet balance is ₹${(user.walletBalance || 0).toFixed(2)}${
          pendingAmount > 0 ? ` (₹${pendingAmount.toFixed(2)} is pending in other requests)` : ''
        }. Available to withdraw: ₹${availableBalance.toFixed(2)}.`,
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

    // Owner QR screenshot
    let ownerQrCodeImage = '';
    if (req.file) {
      ownerQrCodeImage = `/uploads/qr_codes/${req.file.filename}`;
    } else if (req.body.ownerQrCodeImage) {
      ownerQrCodeImage = req.body.ownerQrCodeImage;
    }

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
      ownerQrCodeImage,
      status: 'pending',
      requestedAt: new Date(),
    });

    // NOTE: Money is NOT debited from user.walletBalance yet!
    // It remains in user.walletBalance until admin approves and transfers the payout.
    if (!user.walletTransactions) user.walletTransactions = [];

    user.walletTransactions.push({
      type: 'debit',
      status: 'pending',
      amount: withdrawAmount,
      description: `Withdrawal request #${payoutRequest._id.toString().slice(-6).toUpperCase()} (${(payoutMethod || 'UPI').toUpperCase()})`,
      payoutRequestId: payoutRequest._id,
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
      availableBalance: Math.max(0, (user.walletBalance || 0) - (pendingAmount + withdrawAmount)),
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
    const minWithdrawalAmount = await getMinWithdrawalAmount();

    res.json({
      requests,
      metrics: {
        pendingAmount: pendingTotal[0]?.total || 0,
        approvedAmount: approvedTotal[0]?.total || 0,
        totalRequests: requests.length,
      },
      platformCommissionRate: commissionRate,
      minWithdrawalAmount,
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

    // NOW debit funds from owner's walletBalance upon approval
    const owner = await User.findById(request.ownerId);
    if (owner) {
      owner.walletBalance = Math.max(0, Number(((owner.walletBalance || 0) - request.amount).toFixed(2)));
      owner.ownerPaidRevenue = (owner.ownerPaidRevenue || 0) + request.amount;

      // Update corresponding transaction in owner's wallet history to 'completed'
      const shortId = request._id.toString().slice(-6).toUpperCase();
      let foundTx = false;
      if (owner.walletTransactions && owner.walletTransactions.length > 0) {
        for (let i = owner.walletTransactions.length - 1; i >= 0; i--) {
          const t = owner.walletTransactions[i];
          const isMatch =
            (t.payoutRequestId && t.payoutRequestId.toString() === request._id.toString()) ||
            (t.description && t.description.includes(shortId));
          if (isMatch) {
            t.status = 'completed';
            foundTx = true;
            break;
          }
        }
      }

      if (!foundTx) {
        if (!owner.walletTransactions) owner.walletTransactions = [];
        owner.walletTransactions.push({
          type: 'debit',
          status: 'completed',
          amount: request.amount,
          description: `Withdrawal payout #${shortId} (${(request.payoutMethod || 'UPI').toUpperCase()})`,
          payoutRequestId: request._id,
          date: new Date(),
        });
      }

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

// ─── 5. ADMIN: REJECT PAYOUT REQUEST ──────────────────────────────────────────
// @desc    Reject payout request and update owner's transaction status
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

    const owner = await User.findById(request.ownerId);
    if (owner) {
      const shortId = request._id.toString().slice(-6).toUpperCase();
      let matchedTx = null;
      if (owner.walletTransactions && owner.walletTransactions.length > 0) {
        for (let i = owner.walletTransactions.length - 1; i >= 0; i--) {
          const t = owner.walletTransactions[i];
          const isMatch =
            (t.payoutRequestId && t.payoutRequestId.toString() === request._id.toString()) ||
            (t.description && t.description.includes(shortId));
          if (isMatch) {
            matchedTx = t;
            break;
          }
        }
      }

      // If the transaction was pending (under the new system, funds were not debited yet),
      // so we simply mark it rejected.
      // If it was already debited under the legacy system (status !== 'pending'), we refund it.
      if (matchedTx && matchedTx.status === 'pending') {
        matchedTx.status = 'rejected';
        matchedTx.description = `${matchedTx.description} [DECLINED: ${rejectReason}]`;
      } else {
        // Legacy fallback refund
        owner.walletBalance = Number(((owner.walletBalance || 0) + request.amount).toFixed(2));
        if (!owner.walletTransactions) owner.walletTransactions = [];
        owner.walletTransactions.push({
          type: 'credit',
          status: 'completed',
          amount: request.amount,
          description: `Refund for rejected withdrawal #${shortId} (${rejectReason})`,
          date: new Date(),
        });
      }

      await owner.save();

      // Notify Owner of Rejection
      try {
        await Notification.create({
          userId: owner._id,
          targetRole: 'owner',
          type: 'payout_rejected',
          title: '⚠️ Withdrawal Request Declined',
          message: `Your withdrawal of ₹${request.amount} was rejected: "${rejectReason}". Funds remain in your wallet balance.`,
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
      message: `Payout request rejected. Funds retained in owner wallet.`,
      payoutRequest: request,
    });
  } catch (error) {
    console.error('Payout rejection error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── 6. ADMIN: FINANCIAL CONFIGURATION (COMMISSION & MIN WITHDRAWAL) ──────────
// @desc    Get & Update platform commission rate and minimum withdrawal amount
// @route   GET & PUT /api/wallet/admin/commission
// @access  Private (Admin)
router.get('/admin/commission', protect, adminOnly, async (req, res) => {
  try {
    const rate = await getCommissionRate();
    const minWithdrawal = await getMinWithdrawalAmount();
    res.json({
      commissionPercentage: rate,
      minWithdrawalAmount: minWithdrawal,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/admin/commission', protect, adminOnly, async (req, res) => {
  try {
    const { commissionPercentage, minWithdrawalAmount } = req.body;

    let updatedRate;
    if (commissionPercentage !== undefined) {
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
      updatedRate = rate;
    }

    let updatedMin;
    if (minWithdrawalAmount !== undefined) {
      const minAmount = Number(minWithdrawalAmount);
      if (isNaN(minAmount) || minAmount < 0) {
        return res.status(400).json({ message: 'Minimum withdrawal amount must be a positive number.' });
      }
      await SystemSetting.findOneAndUpdate(
        { key: 'minWithdrawalAmount' },
        {
          key: 'minWithdrawalAmount',
          value: minAmount,
          description: 'Minimum withdrawal amount required for owners to request payouts.',
        },
        { upsert: true, new: true }
      );
      updatedMin = minAmount;
    }

    const currentRate = updatedRate !== undefined ? updatedRate : await getCommissionRate();
    const currentMin = updatedMin !== undefined ? updatedMin : await getMinWithdrawalAmount();

    res.json({
      message: 'Financial settings updated successfully!',
      commissionPercentage: currentRate,
      minWithdrawalAmount: currentMin,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = {
  router,
  getCommissionRate,
  getMinWithdrawalAmount,
};
