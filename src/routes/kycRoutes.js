const express = require('express');
const { body } = require('express-validator');
const kycController = require('../controllers/kycController');
const { auth, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const kycValidation = [
  body('documentType')
    .isIn(['passport', 'nationalId', 'drivingLicense'])
    .withMessage((value, { req }) => req.t('validation.kyc.documentType')),
  body('documentNumber')
    .notEmpty()
    .withMessage((value, { req }) => req.t('validation.kyc.documentNumber')),
  body('documentExpiry')
    .isISO8601()
    .withMessage((value, { req }) => req.t('validation.kyc.documentExpiry'))
    .custom((value, { req }) => {
      const expiryDate = new Date(value);
      if (expiryDate <= new Date()) {
        throw new Error(req.t('validation.kyc.documentExpired'));
      }
      return true;
    }),
  body('documentFront')
    .notEmpty()
    .withMessage((value, { req }) => req.t('validation.kyc.documentFront')),
  body('documentBack')
    .notEmpty()
    .withMessage((value, { req }) => req.t('validation.kyc.documentBack')),
  body('selfie')
    .notEmpty()
    .withMessage((value, { req }) => req.t('validation.kyc.selfie'))
];

const verificationValidation = [
  body('userId')
    .notEmpty()
    .withMessage((value, { req }) => req.t('validation.kyc.userId')),
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage((value, { req }) => req.t('validation.kyc.action')),
  body('rejectionReason')
    .if(body('action').equals('reject'))
    .notEmpty()
    .withMessage((value, { req }) => req.t('validation.kyc.rejectionReason'))
];

/**
 * @swagger
 * /api/kyc/submit:
 *   post:
 *     tags: [KYC]
 *     summary: Submit KYC documents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentType
 *               - documentNumber
 *               - documentExpiry
 *               - documentFront
 *               - documentBack
 *               - selfie
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: [passport, nationalId, drivingLicense]
 *               documentNumber:
 *                 type: string
 *               documentExpiry:
 *                 type: string
 *                 format: date
 *               documentFront:
 *                 type: string
 *               documentBack:
 *                 type: string
 *               selfie:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC documents submitted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/submit', auth, kycValidation, kycController.submitKYC);

/**
 * @swagger
 * /api/kyc/status:
 *   get:
 *     tags: [KYC]
 *     summary: Get KYC verification status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/status', auth, kycController.getKYCStatus);

/**
 * @swagger
 * /api/kyc/verify:
 *   post:
 *     tags: [KYC]
 *     summary: Verify user's KYC documents (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - action
 *             properties:
 *               userId:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC verification completed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/verify', auth, isAdmin, verificationValidation, kycController.verifyKYC);

module.exports = router; 