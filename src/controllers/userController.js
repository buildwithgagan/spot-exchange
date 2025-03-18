const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
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
      return res.status(400).json({
        message: 'Validation error',
        error: errors.array()
      });
    }

    const { email, password, firstName, lastName, dateOfBirth, phoneNumber, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists',
        error: 'Email is already registered'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      phoneNumber,
      address
    });

    await user.save();
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation error',
        error: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(401).json({
        message: 'Account is locked due to too many failed attempts'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.handleFailedLogin();
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Account is deactivated'
      });
    }

    // Update last login timestamp
    await user.updateLastLogin();

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }
    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation error',
        error: errors.array()
      });
    }

    const updates = Object.keys(req.body);
    const allowedUpdates = ['firstName', 'lastName', 'phoneNumber', 'address'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        message: 'Invalid updates',
        error: 'Some fields cannot be updated'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    updates.forEach(update => {
      if (update === 'address' && typeof req.body[update] === 'object') {
        user[update] = { ...user[update], ...req.body[update] };
      } else {
        user[update] = req.body[update];
      }
    });

    await user.save();

    // Return the updated user data directly in the response
    const updatedUser = user.toJSON();
    res.json({
      ...updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Actually delete the user instead of just deactivating
    await User.findByIdAndDelete(req.user._id);
    
    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}; 