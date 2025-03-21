const User = require('../models/User');
const { validationResult } = require('express-validator');

// Submit KYC documents
exports.submitKYC = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        message: firstError.msg
      });
    }

    const {
      documentType,
      documentNumber,
      documentExpiry,
      documentFront,
      documentBack,
      selfie
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: 'error.userNotFound'
      });
    }

    // Check if KYC is already submitted
    if (user.kyc && user.kyc.status === 'submitted') {
      return res.status(400).json({
        message: 'kyc.alreadySubmitted'
      });
    }

    // Initialize or update KYC information
    user.kyc = {
      status: 'submitted',
      documentType,
      documentNumber,
      documentExpiry: new Date(documentExpiry),
      documentFront,
      documentBack,
      selfie,
      verificationDate: null,
      rejectionReason: null
    };

    await user.save();

    res.status(200).json({
      message: 'kyc.submitted',
      kyc: user.kyc
    });
  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(500).json({
      message: 'error.server',
      error: error.message
    });
  }
};

// Get KYC status
exports.getKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: 'error.userNotFound'
      });
    }

    // Initialize KYC if it doesn't exist
    if (!user.kyc) {
      user.kyc = {
        status: 'pending',
        documentType: null,
        documentNumber: null,
        documentExpiry: null,
        verificationDate: null,
        rejectionReason: null
      };
      await user.save();
    }

    res.status(200).json({
      status: user.kyc.status || 'pending',
      documentType: user.kyc.documentType,
      verificationDate: user.kyc.verificationDate,
      rejectionReason: user.kyc.rejectionReason
    });
  } catch (error) {
    console.error('KYC status check error:', error);
    res.status(500).json({
      message: 'error.server',
      error: error.message
    });
  }
};

// Admin: Verify KYC
exports.verifyKYC = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        message: firstError.msg
      });
    }

    const { userId, action, rejectionReason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'error.userNotFound'
      });
    }

    // Initialize KYC if it doesn't exist
    if (!user.kyc) {
      return res.status(400).json({
        message: 'kyc.notSubmitted'
      });
    }

    if (user.kyc.status !== 'submitted') {
      return res.status(400).json({
        message: 'kyc.invalidStatus'
      });
    }

    user.kyc.status = action === 'approve' ? 'verified' : 'rejected';
    user.kyc.verificationDate = new Date();
    if (action === 'reject') {
      user.kyc.rejectionReason = rejectionReason;
    } else {
      user.kyc.rejectionReason = null;
    }

    await user.save();

    res.status(200).json({
      message: `kyc.${action}Success`,
      kyc: user.kyc
    });
  } catch (error) {
    console.error('KYC verification error:', error);
    res.status(500).json({
      message: 'error.server',
      error: error.message
    });
  }
}; 