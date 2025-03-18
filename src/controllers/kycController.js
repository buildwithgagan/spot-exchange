const User = require('../models/User');
const { validationResult } = require('express-validator');

// Submit KYC documents
exports.submitKYC = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: req.t('error.validationError'),
        errors: errors.array()
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
        message: req.t('error.userNotFound')
      });
    }

    // Update KYC information
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
      message: req.t('kyc.submitted'),
      kyc: user.kyc
    });
  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(500).json({
      message: req.t('error.server')
    });
  }
};

// Get KYC status
exports.getKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: req.t('error.userNotFound')
      });
    }

    res.status(200).json({
      status: user.kyc.status,
      documentType: user.kyc.documentType,
      verificationDate: user.kyc.verificationDate,
      rejectionReason: user.kyc.rejectionReason
    });
  } catch (error) {
    console.error('KYC status check error:', error);
    res.status(500).json({
      message: req.t('error.server')
    });
  }
};

// Admin: Verify KYC
exports.verifyKYC = async (req, res) => {
  try {
    const { userId, action, rejectionReason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: req.t('error.userNotFound')
      });
    }

    if (user.kyc.status !== 'submitted') {
      return res.status(400).json({
        message: req.t('kyc.notSubmitted')
      });
    }

    user.kyc.status = action === 'approve' ? 'verified' : 'rejected';
    user.kyc.verificationDate = new Date();
    if (action === 'reject') {
      user.kyc.rejectionReason = rejectionReason;
    }

    await user.save();

    res.status(200).json({
      message: req.t(`kyc.${action}Success`),
      kyc: user.kyc
    });
  } catch (error) {
    console.error('KYC verification error:', error);
    res.status(500).json({
      message: req.t('error.server')
    });
  }
}; 