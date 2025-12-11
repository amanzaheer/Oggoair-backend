const mongoose = require('mongoose');

// Passenger schema for individual passenger details
const passengerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    enum: ['Mr', 'Mrs', 'Ms'],
    trim: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  dateOfBirth: {
    day: {
      type: Number,
      required: [true, 'Day of birth is required'],
      min: [1, 'Day must be between 1 and 31'],
      max: [31, 'Day must be between 1 and 31']
    },
    month: {
      type: Number,
      required: [true, 'Month of birth is required'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12']
    },
    year: {
      type: Number,
      required: [true, 'Year of birth is required'],
      min: [1900, 'Year must be after 1900'],
      max: [new Date().getFullYear(), 'Year cannot be in the future']
    }
  },
  countryOfResidence: {
    type: String,
    required: [true, 'Country of residence is required'],
    trim: true
  },
  passportNumber: {
    type: String,
    required: [true, 'Passport number is required'],
    trim: true,
    maxlength: [20, 'Passport number cannot exceed 20 characters']
  },
  passportExpiry: {
    day: {
      type: Number,
      required: [true, 'Passport expiry day is required'],
      min: [1, 'Day must be between 1 and 31'],
      max: [31, 'Day must be between 1 and 31']
    },
    month: {
      type: Number,
      required: [true, 'Passport expiry month is required'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12']
    },
    year: {
      type: Number,
      required: [true, 'Passport expiry year is required'],
      min: [new Date().getFullYear(), 'Passport must not be expired']
    }
  },
  age: {
    type: Number,
    min: [0, 'Age cannot be negative']
  },
  passengerType: {
    type: String,
    required: true,
    enum: ['Adult', 'Child', 'Infant'],
    default: 'Adult'
  },
  saveToProfile: {
    type: Boolean,
    default: true
  }
}, { _id: false });

// Virtual for full passenger name
passengerSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Main passenger booking schema
const passengerBookingSchema = new mongoose.Schema({
  bookingReference: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    validate: {
      validator: function (val) {
        if (val === 'N/A' || val === 'n/a') return true;
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(val);
      },
      message: 'Please enter a valid email'
    }
  },
  phone: {
    dialingCode: {
      type: String,
      required: [true, 'Dialing code is required'],
      trim: true
    },
    number: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    }
  },
  passengers: [passengerSchema],
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: {
      type: String,
      trim: true
    },
    text: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
  },
  flightData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  extraServices: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
passengerBookingSchema.virtual('fullPhone').get(function () {
  return `${this.phone.dialingCode}${this.phone.number}`;
});

passengerBookingSchema.virtual('summary').get(function () {
  return {
    bookingReference: this.bookingReference,
    user: this.user,
    passengerCount: this.passengers.length,
    status: this.bookingStatus,
    createdAt: this.createdAt
  };
});

// Pre-save middleware to generate booking reference
passengerBookingSchema.pre('save', async function (next) {
  if (this.isNew && !this.bookingReference) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.bookingReference = `PAS${timestamp}${random}`;
  }
  next();
});

// Pre-save middleware to calculate passenger ages and types
passengerBookingSchema.pre('save', function (next) {
  this.passengers.forEach(passenger => {
    const today = new Date();
    const birthDate = new Date(
      passenger.dateOfBirth.year,
      passenger.dateOfBirth.month - 1,
      passenger.dateOfBirth.day
    );
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    passenger.age = age;

    // Determine passenger type based on age
    if (age < 2) {
      passenger.passengerType = 'Infant';
    } else if (age < 12) {
      passenger.passengerType = 'Child';
    } else {
      passenger.passengerType = 'Adult';
    }
  });
  next();
});

// Static methods
passengerBookingSchema.statics.findByUser = function (userId) {
  return this.find({ user: userId }).sort({ createdAt: -1 });
};

passengerBookingSchema.statics.findByReference = function (reference) {
  return this.findOne({ bookingReference: reference.toUpperCase() });
};

// Instance methods
passengerBookingSchema.methods.getPassengerCountByType = function () {
  const counts = { Adult: 0, Child: 0, Infant: 0 };
  this.passengers.forEach(passenger => {
    counts[passenger.passengerType]++;
  });
  return counts;
};

passengerBookingSchema.methods.canBeCancelled = function () {
  return this.bookingStatus !== 'cancelled';
};

// Indexes
passengerBookingSchema.index({ bookingReference: 1 });
passengerBookingSchema.index({ user: 1 });
passengerBookingSchema.index({ bookingStatus: 1 });
passengerBookingSchema.index({ createdAt: -1 });
passengerBookingSchema.index({ email: 1 });

module.exports = mongoose.model('PassengerBooking', passengerBookingSchema);
