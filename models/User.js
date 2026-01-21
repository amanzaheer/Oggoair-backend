const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: function () {
      return !this.fullName; // Only required if fullName doesn't exist (for new users)
    },
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: function () {
      return !this.fullName; // Only required if fullName doesn't exist (for new users)
    },
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  // Keep fullName for backward compatibility with existing data
  fullName: {
    type: String,
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
  dateOfBirth: {
    type: Date,
    required: false,
    default: null,
    validate: {
      validator: function(value) {
        if (!value) return true; // Optional field
        // Must be in the past and person must be at least 1 year old
        const now = new Date();
        const minAge = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        return value < minAge;
      },
      message: 'Invalid date of birth'
    }
  },
  countryOfBirth: {
    type: String,
    required: false,
    default: null,
    trim: true,
    maxlength: [100, 'Country of birth cannot exceed 100 characters']
  },
  passportNumber: {
    type: String,
    required: false,
    default: null,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Passport number cannot exceed 20 characters'],
    match: [/^[A-Z0-9]*$/, 'Passport number can only contain letters and numbers']
  },
  address: {
    street: {
      type: String,
      trim: true,
      default: null,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    city: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, 'City cannot exceed 100 characters']
    },
    state: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, 'State/Province cannot exceed 100 characters']
    },
    country: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, 'Country cannot exceed 100 characters']
    },
    postalCode: {
      type: String,
      trim: true,
      default: null,
      maxlength: [20, 'Postal code cannot exceed 20 characters']
    }
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
  },
  savedPaymentMethods: [{
    paymentMethodId: {
      type: String,
      required: true
    },
    provider: {
      type: String,
      required: true,
      enum: ['revolut', 'stripe', 'paypal'],
      default: 'revolut'
    },
    type: {
      type: String,
      required: true,
      enum: ['card', 'bank_account', 'wallet'],
      default: 'card'
    },
    cardBrand: {
      type: String, // visa, mastercard, amex, etc.
      trim: true
    },
    last4: {
      type: String,
      maxlength: 4,
      trim: true
    },
    expiryMonth: {
      type: String,
      maxlength: 2
    },
    expiryYear: {
      type: String,
      maxlength: 4
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: [50, 'Nickname cannot exceed 50 characters']
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for user's full profile (excluding password)
userSchema.virtual('profile').get(function () {
  // Handle both old (fullName) and new (firstName/lastName) data formats
  let firstName, lastName;

  if (this.firstName && this.lastName) {
    // New format: firstName and lastName exist
    firstName = this.firstName;
    lastName = this.lastName;
  } else if (this.fullName) {
    // Old format: split fullName into firstName and lastName
    const nameParts = this.fullName.trim().split(' ');
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ') || '';
  } else {
    // Fallback: empty strings
    firstName = '';
    lastName = '';
  }

  return {
    id: this._id,
    firstName,
    lastName,
    username: this.username,
    email: this.email,
    phone: this.phone,
    dateOfBirth: this.dateOfBirth,
    countryOfBirth: this.countryOfBirth,
    passportNumber: this.passportNumber,
    address: this.address,
    type: this.type,
    // Return full role object if populated, otherwise return just the ID
    role: this.role && this.role._id ? {
      id: this.role._id,
      name: this.role.name,
      permissions: this.role.permissions
    } : this.role,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    savedPaymentMethods: this.savedPaymentMethods.map(pm => ({
      id: pm._id,
      provider: pm.provider,
      type: pm.type,
      cardBrand: pm.cardBrand,
      last4: pm.last4,
      expiryMonth: pm.expiryMonth,
      expiryYear: pm.expiryYear,
      isDefault: pm.isDefault,
      nickname: pm.nickname,
      addedAt: pm.addedAt
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

// Migrate fullName to firstName and lastName before saving
userSchema.pre('save', async function (next) {
  // If fullName exists but firstName/lastName don't, split fullName
  if (this.fullName && (!this.firstName || !this.lastName)) {
    const nameParts = this.fullName.trim().split(' ');
    this.firstName = nameParts[0] || '';
    this.lastName = nameParts.slice(1).join(' ') || '';
  }
  next();
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

// Instance method to add payment method
userSchema.methods.addPaymentMethod = function (paymentMethodData) {
  // If this is set as default, unset all other defaults
  if (paymentMethodData.isDefault) {
    this.savedPaymentMethods.forEach(pm => {
      pm.isDefault = false;
    });
  }
  
  // If this is the first payment method, make it default
  if (this.savedPaymentMethods.length === 0) {
    paymentMethodData.isDefault = true;
  }
  
  this.savedPaymentMethods.push(paymentMethodData);
  return this.save();
};

// Instance method to remove payment method
userSchema.methods.removePaymentMethod = function (paymentMethodId) {
  const index = this.savedPaymentMethods.findIndex(
    pm => pm._id.toString() === paymentMethodId.toString()
  );
  
  if (index === -1) {
    throw new Error('Payment method not found');
  }
  
  const wasDefault = this.savedPaymentMethods[index].isDefault;
  this.savedPaymentMethods.splice(index, 1);
  
  // If removed method was default and there are other methods, set first one as default
  if (wasDefault && this.savedPaymentMethods.length > 0) {
    this.savedPaymentMethods[0].isDefault = true;
  }
  
  return this.save();
};

// Instance method to set default payment method
userSchema.methods.setDefaultPaymentMethod = function (paymentMethodId) {
  let found = false;
  
  this.savedPaymentMethods.forEach(pm => {
    if (pm._id.toString() === paymentMethodId.toString()) {
      pm.isDefault = true;
      found = true;
    } else {
      pm.isDefault = false;
    }
  });
  
  if (!found) {
    throw new Error('Payment method not found');
  }
  
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
// Ensure passport number is unique when provided (sparse index allows null values)
userSchema.index(
  { passportNumber: 1 },
  { unique: true, sparse: true }
);
userSchema.index({ type: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
