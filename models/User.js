const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  username: {
    type: String,
    required: function () {
      return this.type === 'admin';
    },
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: false,
    default: null,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: function () {
      return this.type === 'admin';
    },
    default: null,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  type: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null,
    required: function () {
      return this.type === 'admin';
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  refreshToken: {
    type: String,
    default: null,
    select: false // Don't include refresh token in queries by default
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for user's full profile (excluding password)
userSchema.virtual('profile').get(function () {
  return {
    id: this._id,
    fullName: this.fullName,
    username: this.username,
    email: this.email,
    phone: this.phone,
    type: this.type,
    // Return full role object if populated, otherwise return just the ID
    role: this.role && this.role._id ? {
      id: this.role._id,
      name: this.role.name,
      permissions: this.role.permissions
    } : this.role,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check if password is correct
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save();
};

// Instance method to update refresh token
userSchema.methods.updateRefreshToken = function (refreshToken) {
  this.refreshToken = refreshToken;
  return this.save();
};

// Instance method to clear refresh token
userSchema.methods.clearRefreshToken = function () {
  this.refreshToken = null;
  return this.save();
};

// Static method to find user by username or email
userSchema.statics.findByUsernameOrEmail = function (identifier) {
  return this.findOne({
    $or: [
      { username: identifier.toLowerCase() },
      { email: identifier.toLowerCase() }
    ]
  }).select('+password');
};

// Indexes
// Ensure username is unique only for admin users, allowing customers without username
userSchema.index(
  { username: 1 },
  { unique: true, partialFilterExpression: { type: 'admin' } }
);
userSchema.index({ type: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
