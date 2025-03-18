const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const i18next = require('../config/i18n');

const router = express.Router();

// Create validation middleware with i18n support
const createValidation = (field, rules) => {
  return rules.map(rule => {
    const validator = body(field);
    switch (rule) {
      case 'required':
        return validator
          .notEmpty()
          .withMessage((value, { req }) => req.t(`validation.${field}.required`));
      case 'email':
        return validator
          .isEmail()
          .normalizeEmail()
          .withMessage((value, { req }) => req.t('validation.email.invalid', { value }));
      case 'password':
        return validator
          .isLength({ min: 8 })
          .withMessage((value, { req }) => req.t('validation.password.minLength'))
          .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
          .withMessage((value, { req }) => req.t('validation.password.complexity'));
      case 'name':
        return validator
          .trim()
          .notEmpty()
          .withMessage((value, { req }) => req.t(`validation.${field}.required`))
          .isLength({ max: 50 })
          .withMessage((value, { req }) => req.t(`validation.${field}.maxLength`));
      case 'dateOfBirth':
        return validator
          .notEmpty()
          .withMessage((value, { req }) => req.t('validation.dateOfBirth.required'))
          .isISO8601()
          .toDate();
      case 'phoneNumber':
        return validator
          .notEmpty()
          .withMessage((value, { req }) => req.t('validation.phoneNumber.required'))
          .matches(/^\+[1-9]\d{1,14}$/)
          .withMessage((value, { req }) => req.t('validation.phoneNumber.invalid'));
      default:
        return validator;
    }
  });
};

// Validation middleware
const registerValidation = [
  ...createValidation('email', ['required', 'email']),
  ...createValidation('password', ['required', 'password']),
  ...createValidation('firstName', ['name']),
  ...createValidation('lastName', ['name']),
  ...createValidation('dateOfBirth', ['dateOfBirth']),
  ...createValidation('phoneNumber', ['phoneNumber'])
];

const loginValidation = [
  ...createValidation('email', ['required', 'email']),
  ...createValidation('password', ['required'])
];

const updateProfileValidation = [
  body('firstName').optional().isString().trim().isLength({ max: 50 })
    .withMessage((value, { req }) => req.t('validation.firstName.maxLength')),
  body('lastName').optional().isString().trim().isLength({ max: 50 })
    .withMessage((value, { req }) => req.t('validation.lastName.maxLength')),
  body('phoneNumber').optional()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage((value, { req }) => req.t('validation.phoneNumber.invalid')),
  body('address.street').optional().isString().trim(),
  body('address.city').optional().isString().trim(),
  body('address.state').optional().isString().trim(),
  body('address.country').optional().isString().trim(),
  body('address.postalCode').optional().isString().trim()
];

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *         - dateOfBirth
 *         - phoneNumber
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           description: Password with at least one uppercase, lowercase, number, and special character
 *         firstName:
 *           type: string
 *           maxLength: 50
 *           description: User's first name
 *         lastName:
 *           type: string
 *           maxLength: 50
 *           description: User's last name
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: User's date of birth in ISO 8601 format
 *         phoneNumber:
 *           type: string
 *           pattern: ^\+[1-9]\d{1,14}$
 *           description: International phone number format
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             country:
 *               type: string
 *             postalCode:
 *               type: string
 *         isActive:
 *           type: boolean
 *           default: true
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           default: user
 *         lastLogin:
 *           type: string
 *           format: date-time
 *         emailVerified:
 *           type: boolean
 *           default: false
 *         twoFactorEnabled:
 *           type: boolean
 *           default: false
 *         kyc:
 *           $ref: '#/components/schemas/KYC'
 *     KYC:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, submitted, verified, rejected]
 *           default: pending
 *         documentType:
 *           type: string
 *           enum: [passport, nationalId, drivingLicense]
 *         documentNumber:
 *           type: string
 *         documentExpiry:
 *           type: string
 *           format: date
 *         verificationDate:
 *           type: string
 *           format: date-time
 *         rejectionReason:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Create a new user account with complete profile information
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - dateOfBirth
 *               - phoneNumber
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               phoneNumber:
 *                 type: string
 *                 pattern: ^\+[1-9]\d{1,14}$
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', registerValidation, userController.register);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     description: Authenticate user with email and password, handles account locking after failed attempts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials or account locked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginValidation, userController.login);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [User]
 *     summary: Get user profile
 *     description: Retrieve the authenticated user's complete profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', auth, userController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   patch:
 *     tags: [User]
 *     summary: Update user profile
 *     description: Update the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *               phoneNumber:
 *                 type: string
 *                 pattern: ^\+[1-9]\d{1,14}$
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/profile', auth, updateProfileValidation, userController.updateProfile);

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     tags: [User]
 *     summary: Delete user account
 *     description: Permanently delete the authenticated user's account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/account', auth, userController.deleteAccount);

module.exports = router; 