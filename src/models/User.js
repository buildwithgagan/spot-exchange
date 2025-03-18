const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const i18next = require('../config/i18n');

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
    minlength: [8, 'validation.password.minLength'],
    validate: {
      validator: function(v) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v);
      },
      message: 'validation.password.complexity'
    }
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
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
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
  await this.save();
};

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to return user data without sensitive information
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Add compound index for common queries
userSchema.index({ email: 1, isActive: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User; 