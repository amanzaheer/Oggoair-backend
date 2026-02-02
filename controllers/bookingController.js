const mongoose = require('mongoose');
const PassengerBooking = require('../models/PassengerBooking');
const OTP = require('../models/OTP');
const User = require('../models/User');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/emailService');
const { generateToken } = require('../utils/jwtUtils');
const { validatePassengerData } = require('../utils/validators');

// Helper to check booking ownership
const checkBookingOwnership = (booking, user) => {
  if (user.type === 'admin') return true;
  return booking.user._id.toString() === user._id.toString();
};

// Helper to generate booking response
const buildBookingResponse = (booking) => ({
  ...booking.summary,
  email: booking.email,
  phone: booking.phone,
  notes: booking.notes ?? null,
  flightData: booking.flightData ?? null,
  extraServices: booking.extraServices ?? null
});

// Request booking and send OTP
const requestBookingWithOTP = async (req, res) => {
  try {
    const { email, fullName, phone, passengers, notes, flightData, extraServices } = req.body;

    // Validate required fields
    if (!email || !fullName) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and full name are required'
      });
    }

    // Validate passengers
    const passengerValidation = validatePassengerData(passengers);
    if (!passengerValidation.valid) {
      return res.status(400).json({
        status: 'error',
        message: passengerValidation.message
      });
    }

    // Store booking data with OTP
    const bookingData = {
      email: email.toLowerCase(),
      fullName,
      phone,
      passengers,
      notes,
      flightData,
      extraServices
    };

    const otpRecord = await OTP.createOTP(email.toLowerCase(), 'booking', bookingData);
    const emailResult = await sendOTPEmail(email, otpRecord.otp);

    if (!emailResult.success) {
      await OTP.findByIdAndDelete(otpRecord._id);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to your email. Please verify to complete booking.',
      data: {
        email,
        expiresAt: otpRecord.expiresAt
      }
    });
  } catch (error) {
    console.error('Request booking with OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error processing booking request'
    });
  }
};

// Verify OTP and create booking
const verifyBookingOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and OTP are required'
      });
    }

    // Find and verify OTP
    const otpRecord = await OTP.findValidOTP(email.toLowerCase(), 'booking');
    if (!otpRecord) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP. Please request a new one.'
      });
    }

    const verification = otpRecord.verifyOTP(otp);
    if (!verification.valid) {
      return res.status(400).json({
        status: 'error',
        message: verification.message
      });
    }

    const bookingData = otpRecord.userData;
    if (!bookingData) {
      return res.status(400).json({
        status: 'error',
        message: 'Booking data not found. Please start the booking process again.'
      });
    }

    // Check if user exists, create if not
    let user = await User.findOne({ email: bookingData.email });
    let isNewUser = false;
    let generatedPassword = null;

    if (!user) {
      const baseUsername = bookingData.email.split('@')[0];
      const username = baseUsername + Math.floor(Math.random() * 1000);
      generatedPassword = 'Pass@' + Math.floor(100000 + Math.random() * 900000);

      user = await User.create({
        fullName: bookingData.fullName,
        username: username.toLowerCase(),
        email: bookingData.email,
        phone: bookingData.phone.dialingCode + bookingData.phone.number,
        password: generatedPassword,
        type: 'customer'
      });

      isNewUser = true;
      await sendWelcomeEmail(user.email, user.fullName, user.username, generatedPassword);
    }

    // Create booking
    const booking = await PassengerBooking.create({
      user: user._id,
      email: bookingData.email,
      phone: bookingData.phone,
      passengers: bookingData.passengers,
      notes: bookingData.notes,
      flightData: bookingData.flightData,
      extraServices: bookingData.extraServices
    });

    await user.updateLastLogin();
    const token = generateToken(user._id);

    const userWithRole = await User.findById(user._id)
      .populate('role', 'name permissions')
      .select('-password -refreshToken');

    await OTP.findByIdAndDelete(otpRecord._id);

    res.status(201).json({
      status: 'success',
      message: isNewUser
        ? 'Booking created! Account automatically created. Check your email for login credentials.'
        : 'Booking created successfully!',
      data: {
        booking: buildBookingResponse(booking),
        passengers: booking.passengers,
        user: userWithRole.profile,
        token,
        isNewUser
      }
    });
  } catch (error) {
    console.error('Verify booking OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error completing booking',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// Create a new booking (authenticated)
const createBooking = async (req, res) => {
  try {
    const { email, phone, passengers, notes, flightData, extraServices } = req.body;

    // Validate passengers
    const passengerValidation = validatePassengerData(passengers);
    if (!passengerValidation.valid) {
      return res.status(400).json({
        status: 'error',
        message: passengerValidation.message
      });
    }

    const booking = await PassengerBooking.create({
      user: req.user._id,
      email,
      phone,
      passengers,
      notes,
      flightData,
      extraServices
    });

    res.status(201).json({
      status: 'success',
      message: 'Booking created successfully',
      data: {
        booking: buildBookingResponse(booking),
        passengers: booking.passengers
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating booking'
    });
  }
};

// Get current user's bookings
const getMyBookings = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (req.query.status) {
      const allowedStatuses = ['pending', 'confirmed', 'cancelled'];
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`
        });
      }
      filter.bookingStatus = req.query.status;
    }

    const [bookings, total] = await Promise.all([
      PassengerBooking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PassengerBooking.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching bookings'
    });
  }
};

// Get all bookings (admin only)
const getAllBookings = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      const allowedStatuses = ['pending', 'confirmed', 'cancelled'];
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`
        });
      }
      filter.bookingStatus = req.query.status;
    }
    if (req.query.user) {
      if (!mongoose.Types.ObjectId.isValid(req.query.user)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid user id'
        });
      }
      filter.user = req.query.user;
    }
    
    if (req.query.search) {
      filter.$or = [
        { bookingReference: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { 'passengers.firstName': { $regex: req.query.search, $options: 'i' } },
        { 'passengers.lastName': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const [bookings, total] = await Promise.all([
      PassengerBooking.find(filter)
        .populate('user', 'fullName username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PassengerBooking.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching bookings'
    });
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const booking = await PassengerBooking.findById(req.params.id)
      .populate('user', 'fullName username email');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (!checkBookingOwnership(booking, req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { booking }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching booking'
    });
  }
};

// Get booking by reference
const getBookingByReference = async (req, res) => {
  try {
    const booking = await PassengerBooking.findByReference(req.params.reference)
      .populate('user', 'fullName username email');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (!checkBookingOwnership(booking, req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { booking }
    });
  } catch (error) {
    console.error('Get booking by reference error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching booking'
    });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await PassengerBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (!checkBookingOwnership(booking, req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Regular users can only cancel
    if (req.user.type !== 'admin' && status !== 'cancelled') {
      return res.status(403).json({
        status: 'error',
        message: 'You can only cancel your bookings'
      });
    }

    if (status === 'cancelled' && !booking.canBeCancelled()) {
      return res.status(400).json({
        status: 'error',
        message: 'This booking cannot be cancelled'
      });
    }

    booking.bookingStatus = status;
    await booking.save();

    res.status(200).json({
      status: 'success',
      message: 'Booking status updated successfully',
      data: { booking: booking.summary }
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating booking status'
    });
  }
};

// Update booking details
const updateBooking = async (req, res) => {
  try {
    const { email, phone, passengers, notes, flightData, extraServices } = req.body;
    const booking = await PassengerBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (!checkBookingOwnership(booking, req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot update cancelled booking'
      });
    }

    // Update fields
    if (email) booking.email = email;
    if (phone) booking.phone = phone;
    if (passengers) booking.passengers = passengers;
    if (notes !== undefined) booking.notes = notes;
    if (flightData !== undefined) booking.flightData = flightData;
    if (extraServices !== undefined) booking.extraServices = extraServices;

    await booking.save();

    res.status(200).json({
      status: 'success',
      message: 'Booking updated successfully',
      data: {
        booking: buildBookingResponse(booking),
        passengers: booking.passengers
      }
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating booking'
    });
  }
};

// Delete booking
const deleteBooking = async (req, res) => {
  try {
    const booking = await PassengerBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (!checkBookingOwnership(booking, req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    if (booking.bookingStatus === 'confirmed') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete confirmed booking. Please cancel it first.'
      });
    }

    await PassengerBooking.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting booking'
    });
  }
};

// Update specific passenger details
const updatePassenger = async (req, res) => {
  try {
    const { bookingId, passengerIndex } = req.params;
    const passengerData = req.body;

    const booking = await PassengerBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (!checkBookingOwnership(booking, req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot update cancelled booking'
      });
    }

    const index = parseInt(passengerIndex);
    if (isNaN(index) || index < 0 || index >= booking.passengers.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid passenger index'
      });
    }

    // Update passenger fields
    const passenger = booking.passengers[index];
    
    if (passengerData.title) passenger.title = passengerData.title;
    if (passengerData.firstName) passenger.firstName = passengerData.firstName;
    if (passengerData.lastName) passenger.lastName = passengerData.lastName;
    if (passengerData.dateOfBirth) passenger.dateOfBirth = passengerData.dateOfBirth;
    if (passengerData.countryOfBirth !== undefined) passenger.countryOfBirth = passengerData.countryOfBirth;
    if (passengerData.countryOfResidence !== undefined) passenger.countryOfResidence = passengerData.countryOfResidence;
    if (passengerData.passportNumber) passenger.passportNumber = passengerData.passportNumber;
    if (passengerData.passportExpiry) passenger.passportExpiry = passengerData.passportExpiry;
    
    // Update address if provided
    if (passengerData.address) {
      if (!passenger.address) passenger.address = {};
      passenger.address = {
        ...passenger.address,
        ...passengerData.address
      };
    }

    await booking.save();

    res.status(200).json({
      status: 'success',
      message: 'Passenger details updated successfully',
      data: {
        booking: buildBookingResponse(booking),
        passenger: booking.passengers[index]
      }
    });
  } catch (error) {
    console.error('Update passenger error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating passenger details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's booking statistics (for dashboard)
const getMyBookingStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [stats, passengerTypeStats, recentBookings] = await Promise.all([
      PassengerBooking.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            pendingBookings: {
              $sum: { $cond: [{ $eq: ['$bookingStatus', 'pending'] }, 1, 0] }
            },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ['$bookingStatus', 'confirmed'] }, 1, 0] }
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ['$bookingStatus', 'cancelled'] }, 1, 0] }
            },
            totalPassengers: { $sum: { $size: '$passengers' } }
          }
        }
      ]),
      PassengerBooking.aggregate([
        { $match: { user: userId } },
        { $unwind: '$passengers' },
        {
          $group: {
            _id: '$passengers.passengerType',
            count: { $sum: 1 }
          }
        }
      ]),
      PassengerBooking.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('bookingReference bookingStatus createdAt passengers')
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview: stats[0] || {
          totalBookings: 0,
          pendingBookings: 0,
          confirmedBookings: 0,
          cancelledBookings: 0,
          totalPassengers: 0
        },
        passengerTypes: passengerTypeStats,
        recentBookings: recentBookings.map(booking => ({
          bookingReference: booking.bookingReference,
          status: booking.bookingStatus,
          passengerCount: booking.passengers.length,
          createdAt: booking.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get my booking stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching booking statistics'
    });
  }
};

// Get booking statistics (admin only)
const getBookingStats = async (req, res) => {
  try {
    const [stats, passengerTypeStats] = await Promise.all([
      PassengerBooking.aggregate([
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            pendingBookings: {
              $sum: { $cond: [{ $eq: ['$bookingStatus', 'pending'] }, 1, 0] }
            },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ['$bookingStatus', 'confirmed'] }, 1, 0] }
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ['$bookingStatus', 'cancelled'] }, 1, 0] }
            },
            totalPassengers: { $sum: { $size: '$passengers' } }
          }
        }
      ]),
      PassengerBooking.aggregate([
        { $unwind: '$passengers' },
        {
          $group: {
            _id: '$passengers.passengerType',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview: stats[0] || {
          totalBookings: 0,
          pendingBookings: 0,
          confirmedBookings: 0,
          cancelledBookings: 0,
          totalPassengers: 0
        },
        passengerTypes: passengerTypeStats
      }
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching booking statistics'
    });
  }
};

module.exports = {
  createBooking,
  requestBookingWithOTP,
  verifyBookingOTP,
  getMyBookings,
  getMyBookingStats,
  getAllBookings,
  getBookingById,
  getBookingByReference,
  updateBookingStatus,
  updateBooking,
  updatePassenger,
  deleteBooking,
  getBookingStats
};
