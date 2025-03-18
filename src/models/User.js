const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const i18next = require('../config/i18n');

const kycSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'submitted', 'verified', 'rejected'],
    default: 'pending'
  },
  documentType: {
    type: String,
    enum: ['passport', 'nationalId', 'drivingLicense'],
    required: function() { return this.status === 'submitted'; }
  },
  documentNumber: {
    type: String,
    required: function() { return this.status === 'submitted'; }
  },
  documentExpiry: {
    type: Date,
    required: function() { return this.status === 'submitted'; }
  },
  verificationDate: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  documentFront: String,
  documentBack: String,
  selfie: String
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'validation.email.invalid'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: [8, 'validation.password.minLength']
  },
  firstName: {
    type: String,
    required: [true, 'validation.firstName.required'],
    trim: true,
    maxlength: [50, 'validation.firstName.maxLength']
  },
  lastName: {
    type: String,
    required: [true, 'validation.lastName.required'],
    trim: true,
    maxlength: [50, 'validation.lastName.maxLength']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'validation.dateOfBirth.required']
  },
  phoneNumber: {
    type: String,
    required: [true, 'validation.phoneNumber.required'],
    validate: {
      validator: function(v) {
        return /^\+[1-9]\d{1,14}$/.test(v);
      },
      message: 'validation.phoneNumber.invalid'
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    index: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  lockUntil: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  kyc: kycSchema
}, {
  timestamps: true
});

// Index for KYC status queries
userSchema.index({ 'kyc.status': 1 });

// Password complexity validation
const validatePasswordComplexity = (password) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
};

// Hash password before saving and validate complexity
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Validate password complexity before hashing
  if (!validatePasswordComplexity(this.password)) {
    throw new Error('validation.password.complexity');
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update lastLogin timestamp
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  this.failedLoginAttempts = 0;
  this.accountLocked = false;
  this.lockUntil = null;
  await this.save();
};

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to handle failed login attempts
userSchema.methods.handleFailedLogin = async function() {
  this.failedLoginAttempts += 1;
  
  // Lock account after 5 failed attempts
  if (this.failedLoginAttempts >= 5) {
    this.accountLocked = true;
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
  }
  
  await this.save();
};

// Check if account is locked
userSchema.methods.isAccountLocked = function() {
  if (!this.accountLocked) return false;
  if (this.lockUntil && this.lockUntil < new Date()) {
    this.accountLocked = false;
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
    this.save();
    return false;
  }
  return true;
};

// Method to return user data without sensitive information
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.passwordResetToken;
  delete user.twoFactorSecret;
  return user;
};

// Add compound index for common queries
userSchema.index({ email: 1, isActive: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User; 