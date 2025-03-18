const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRATION,
      algorithm: 'HS256' // Explicitly specify the algorithm
    }
  );
};

// Create error response
const createErrorResponse = (req, res, statusCode, messageKey, error = null) => {
  const response = { message: req.t(messageKey) };
  if (error && process.env.NODE_ENV === 'development') {
    response.error = error;
  }
  return res.status(statusCode).json(response);
};

// Register new user
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return createErrorResponse(req, res, 400, 'error.validationError', errors.array());
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists using lean() for better performance
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return createErrorResponse(req, res, 400, 'user.exists');
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName
    });

    await user.save();
    const token = generateToken(user._id);

    res.status(201).json({
      message: req.t('auth.registerSuccess'),
      user: user.toJSON(),
      token
    });
  } catch (error) {
    createErrorResponse(req, res, 500, 'error.server', error.message);
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with necessary fields only
    const user = await User.findOne({ email })
      .select('+password +isActive')
      .exec();

    if (!user) {
      return createErrorResponse(req, res, 401, 'auth.invalidCredentials');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return createErrorResponse(req, res, 401, 'auth.invalidCredentials');
    }

    // Check if user is active
    if (!user.isActive) {
      return createErrorResponse(req, res, 401, 'auth.accountDeactivated');
    }

    // Update last login timestamp
    await user.updateLastLogin();

    const token = generateToken(user._id);

    res.json({
      message: req.t('auth.loginSuccess'),
      user: user.toJSON(),
      token
    });
  } catch (error) {
    createErrorResponse(req, res, 500, 'error.server', error.message);
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // Use lean() for better performance since we don't need a Mongoose document
    const user = await User.findById(req.user._id)
      .select('-password')
      .lean();
    
    res.json(user);
  } catch (error) {
    createErrorResponse(req, res, 500, 'error.server', error.message);
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['firstName', 'lastName', 'email', 'password'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return createErrorResponse(req, res, 400, 'error.invalidUpdates');
    }

    // If email is being updated, check for duplicates
    if (updates.includes('email')) {
      const existingUser = await User.findOne({ 
        email: req.body.email,
        _id: { $ne: req.user._id }
      }).lean();
      
      if (existingUser) {
        return createErrorResponse(req, res, 400, 'user.emailInUse');
      }
    }

    updates.forEach(update => req.user[update] = req.body[update]);
    await req.user.save();

    res.json({
      message: req.t('user.profileUpdateSuccess'),
      user: req.user
    });
  } catch (error) {
    createErrorResponse(req, res, 500, 'error.server', error.message);
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    req.user.isActive = false;
    await req.user.save();
    
    // Invalidate all existing sessions (optional)
    // This would require additional session management implementation
    
    res.json({ message: req.t('user.accountDeactivateSuccess') });
  } catch (error) {
    createErrorResponse(req, res, 500, 'error.server', error.message);
  }
}; 