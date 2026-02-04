const mongoose = require('mongoose');
const axios = require('axios');
const PassengerBooking = require('../models/PassengerBooking');
const OTP = require('../models/OTP');
const User = require('../models/User');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/emailService');
const { generateToken } = require('../utils/jwtUtils');
const { validatePassengerData } = require('../utils/validators');

// Supported currencies (same as transaction flow)
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP'];
const SUCCESS_PAYMENT_STATUSES = ['paid', 'completed', 'success'];
const IN_PROGRESS_PAYMENT_STATUSES = ['pending', 'created', 'initiated', 'authorized', 'authorised'];
const DEFAULT_PAYMENT_REDIRECT_BASE_URL = 'https://payment.oggotrip.com';
const FAILED_PAYMENT_STATUSES = ['failed', 'cancelled', 'canceled', 'void', 'declined', 'rejected'];

const isLocalhostHost = (host) => {
  if (!host) return false;
  const lower = host.toLowerCase();
  return lower === 'localhost' || lower === '127.0.0.1';
};

const sanitizeBaseUrl = (rawUrl) => {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (isLocalhostHost(parsed.hostname)) {
      return null;
    }
    return parsed.origin;
  } catch (e) {
    return null;
  }
};

const deriveRedirectBaseUrl = (req) => {
  const configuredBase =
    process.env.REVOLUT_REDIRECT_BASE_URL ||
    process.env.BOOKING_CONFIRMATION_BASE_URL ||
    process.env.FRONTEND_BASE_URL;

  const headerOrigin = sanitizeBaseUrl(req?.headers?.origin);

  let refererOrigin = null;
  if (req?.headers?.referer) {
    try {
      refererOrigin = sanitizeBaseUrl(new URL(req.headers.referer).origin);
    } catch (err) {
      refererOrigin = null;
    }
  }

  const forwardedHost = req?.headers?.['x-forwarded-host'];
  const forwardedProto = req?.headers?.['x-forwarded-proto'] || 'https';
  const forwardedOrigin = forwardedHost
    ? sanitizeBaseUrl(`${forwardedProto}://${forwardedHost}`)
    : null;

  const candidates = [
    sanitizeBaseUrl(configuredBase),
    headerOrigin,
    forwardedOrigin,
    refererOrigin
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  const fallback =
    sanitizeBaseUrl(process.env.REVOLUT_REDIRECT_FALLBACK_URL) ||
    DEFAULT_PAYMENT_REDIRECT_BASE_URL;

  return fallback;
};

const normalizeBookingStatusValue = (status) => {
  const normalized = String(status || '').toLowerCase().trim();
  if (normalized === 'confirmed') return 'confirmed';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  return 'pending';
};

const normalizePaymentStatusValue = (status) => {
  const normalized = String(status || '').toLowerCase().trim();
  if (SUCCESS_PAYMENT_STATUSES.includes(normalized)) return 'paid';
  if (FAILED_PAYMENT_STATUSES.includes(normalized)) return 'failed';
  if (IN_PROGRESS_PAYMENT_STATUSES.includes(normalized)) return 'pending';
  return normalized || 'pending';
};

const serializeBookingForClient = (booking) => {
  if (!booking) return booking;
  const plain =
    typeof booking.toObject === 'function' ? booking.toObject({ virtuals: true }) : { ...booking };

  plain.bookingStatus = normalizeBookingStatusValue(plain.bookingStatus);
  plain.paymentStatus = normalizePaymentStatusValue(plain.paymentStatus);

  return plain;
};

// Helper function to convert amount to minor currency units (cents/pence)
const convertToMinorUnits = (amount) => {
  return Math.round(amount * 100);
};

// Helper function to normalize Revolut state to our payment status enum values
const normalizeRevolutState = (state) => {
  if (!state) return 'pending';

  const stateLower = state.toLowerCase().trim();

  const stateMap = {
    pending: 'pending',
    created: 'created',
    initiated: 'initiated',
    authorised: 'authorized',
    authorized: 'authorized',
    completed: 'completed',
    paid: 'paid',
    success: 'success',
    failed: 'failed',
    cancelled: 'cancelled',
    canceled: 'canceled',
    void: 'void'
  };

  return stateMap[stateLower] || 'pending';
};

// Helper function to call Revolut API (copied pattern from transaction flow)
const createRevolutOrder = async (amount, currency, redirect_url) => {
  const revolutKey = process.env.REVOLUT_SECRET_KEY;

  if (!revolutKey) {
    throw new Error(
      'REVOLUT_SECRET_KEY is not configured. Please add it to your config.env file.'
    );
  }

  const isTestMode = process.env.REVOLUT_TEST_MODE === 'true';
  const revolutBaseUrl = isTestMode
    ? process.env.REVOLUT_BASE_URL_TEST || 'https://sandbox-merchant.revolut.com/api'
    : process.env.REVOLUT_BASE_URL_LIVE || 'https://merchant.revolut.com/api';

  const orderPayload = {
    amount: convertToMinorUnits(amount),
    currency: currency.toUpperCase().trim()
  };

  if (redirect_url) {
    orderPayload.redirect_url = redirect_url.trim();
  }

  try {
    const response = await axios.post(`${revolutBaseUrl}/orders`, orderPayload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${revolutKey}`,
        'Revolut-Api-Version': process.env.REVOLUT_API_VERSION || '2024-09-01'
      }
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;

      let message = 'Failed to create payment order with Revolut';
      if (statusCode === 401) {
        message = 'Revolut API authentication failed. Check your REVOLUT_SECRET_KEY.';
      } else if (statusCode === 400) {
        message = 'Invalid payment request. Check amount and currency values.';
      }

      const revolutError = new Error(message);
      revolutError.statusCode = statusCode;
      revolutError.data = errorData;
      throw revolutError;
    } else if (error.request) {
      const serviceError = new Error('Revolut payment service is unavailable');
      serviceError.statusCode = 503;
      throw serviceError;
    } else {
      throw error;
    }
  }
};

// Helper function to fetch Revolut order details (copied pattern from transaction flow)
const getRevolutOrder = async (revolutOrderId) => {
  const revolutKey = process.env.REVOLUT_SECRET_KEY;

  if (!revolutKey) {
    throw new Error(
      'REVOLUT_SECRET_KEY is not configured. Please add it to your config.env file.'
    );
  }

  const isTestMode = process.env.REVOLUT_TEST_MODE === 'true';
  const revolutBaseUrl = isTestMode
    ? process.env.REVOLUT_BASE_URL_TEST || 'https://sandbox-merchant.revolut.com/api'
    : process.env.REVOLUT_BASE_URL_LIVE || 'https://merchant.revolut.com/api';

  try {
    const response = await axios.get(`${revolutBaseUrl}/orders/${revolutOrderId}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${revolutKey}`,
        'Revolut-Api-Version': process.env.REVOLUT_API_VERSION || '2024-09-01'
      }
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;

      let message = 'Failed to fetch order details from Revolut';
      if (statusCode === 401) {
        message = 'Revolut API authentication failed. Check your REVOLUT_SECRET_KEY.';
      } else if (statusCode === 404) {
        message = 'Revolut order not found.';
      } else if (statusCode === 400) {
        message = 'Invalid Revolut order ID.';
      }

      const revolutError = new Error(message);
      revolutError.statusCode = statusCode;
      revolutError.data = errorData;
      throw revolutError;
    } else if (error.request) {
      const serviceError = new Error('Revolut payment service is unavailable');
      serviceError.statusCode = 503;
      throw serviceError;
    } else {
      throw error;
    }
  }
};

// Reusable helper to sync booking payment status with latest Revolut order state
const syncBookingPaymentStatus = async (bookingId) => {
  if (!bookingId) {
    throw new Error('bookingId is required to sync payment status');
  }

  // Fetch booking by Mongo _id or bookingReference
  let booking;
  if (mongoose.Types.ObjectId.isValid(bookingId) && String(bookingId).length === 24) {
    booking = await PassengerBooking.findById(bookingId);
  } else {
    booking = await PassengerBooking.findOne({
      bookingReference: String(bookingId).toUpperCase()
    });
  }

  if (!booking) {
    const notFoundError = new Error('Booking not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  if (!booking.revolutOrderId) {
    // Nothing to sync if there is no Revolut order
    return booking;
  }

  // Always fetch latest Revolut order details (source of truth)
  const latestRevolutData = await getRevolutOrder(booking.revolutOrderId);

  const updateData = {
    revolutData: latestRevolutData
  };

  if (latestRevolutData?.state) {
    updateData.paymentStatus = normalizeRevolutState(latestRevolutData.state);
  }

  if (latestRevolutData?.checkout_url) {
    updateData.checkoutUrl = latestRevolutData.checkout_url;
  }

  const updatedBooking = await PassengerBooking.findByIdAndUpdate(booking._id, updateData, {
    new: true,
    runValidators: true
  });

  return updatedBooking;
};

// Helper to check booking ownership
const checkBookingOwnership = (booking, user) => {
  if (user.type === 'admin') return true;
  return booking.user._id.toString() === user._id.toString();
};

// Helper to generate booking response
const buildBookingResponse = (booking) => ({
  _id: booking._id,
  ...booking.summary,
  email: booking.email,
  phone: booking.phone,
  notes: booking.notes ?? null,
  flightData: booking.flightData ?? null,
  extraServices: booking.extraServices ?? null,
  paymentStatus: booking.paymentStatus ?? 'pending',
  revolutOrderId: booking.revolutOrderId ?? null,
  checkoutUrl: booking.checkoutUrl ?? null,
  redirect_url: booking.redirect_url ?? null
});

// Create booking (DB-first) and create Revolut order
// Public endpoint intended for payment flow
const createBookingWithPayment = async (req, res) => {
  try {
    const { email, phone, passengers, notes, flightData, extraServices, amount, currency } =
      req.body;

    const normalizedEmail =
      typeof email === 'string' ? email.toLowerCase().trim() : email;

    // Validate passengers (same validator used elsewhere in booking flow)
    const passengerValidation = validatePassengerData(passengers);
    if (!passengerValidation.valid) {
      return res.status(400).json({
        status: 'error',
        message: passengerValidation.message
      });
    }

    // Validate amount/currency (match transaction-style validation expectations)
    if (amount === undefined || amount === null) {
      return res.status(400).json({ status: 'error', message: 'Amount is required' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount must be a positive number'
      });
    }
    if (!currency || typeof currency !== 'string' || !currency.trim()) {
      return res.status(400).json({ status: 'error', message: 'Currency is required' });
    }
    const currencyUpper = currency.toUpperCase().trim();
    if (!SUPPORTED_CURRENCIES.includes(currencyUpper)) {
      return res.status(400).json({
        status: 'error',
        message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`
      });
    }

    // Step 1: Store booking payload in DB first (payment status starts pending)
    const bookingPayload = {
      email: normalizedEmail,
      phone,
      passengers,
      notes,
      flightData,
      extraServices,
      bookingStatus: 'pending',
      paymentStatus: 'pending'
    };

    // If the user is authenticated, link the booking to their account
    if (req.user && req.user._id) {
      bookingPayload.user = req.user._id;
    }

    const booking = await PassengerBooking.create(bookingPayload);

    // Build redirect URL (where Revolut sends the user after checkout)
    // - In local dev: send back to local frontend
    // - In prod: send to payment domain (or env override)
    const redirectBase = deriveRedirectBaseUrl(req);
    const trimmedBase = redirectBase.endsWith('/')
      ? redirectBase.slice(0, -1)
      : redirectBase;
    const paymentRedirectUrl = `${trimmedBase}/flight/confirmation?booking_id=${booking._id}`;

    // Step 2: Call Revolut API
    let revolutData;
    try {
      revolutData = await createRevolutOrder(amount, currencyUpper, paymentRedirectUrl);
    } catch (revolutError) {
      console.error('Revolut API error:', revolutError);

      // Persist failure details so we have a record of the attempt
      await PassengerBooking.findByIdAndUpdate(
        booking._id,
        {
          revolutData: {
            error: revolutError.message,
            ...(revolutError.data && { data: revolutError.data })
          },
          redirect_url: paymentRedirectUrl
        },
        { new: true }
      );

      return res.status(revolutError.statusCode || 500).json({
        status: 'error',
        message: revolutError.message,
        ...(revolutError.data && { error: revolutError.data })
      });
    }

    // Validate Revolut response
    if (!revolutData?.id) {
      console.error('Invalid Revolut response - missing order ID:', revolutData);
      return res.status(500).json({
        status: 'error',
        message: 'Invalid response from payment service'
      });
    }

    if (!revolutData?.checkout_url) {
      console.error('Invalid Revolut response - missing checkout URL:', revolutData);
      return res.status(500).json({
        status: 'error',
        message: 'Payment service did not return a checkout URL'
      });
    }

    // Step 3: Update booking with Revolut data
    const updateData = {
      checkoutUrl: revolutData.checkout_url,
      revolutOrderId: revolutData.id,
      revolutData,
      redirect_url: paymentRedirectUrl
    };

    if (revolutData.state) {
      updateData.paymentStatus = normalizeRevolutState(revolutData.state);
    }

    const updatedBooking = await PassengerBooking.findByIdAndUpdate(booking._id, updateData, {
      new: true
    });

    res.status(201).json({
      status: 'success',
      message: 'Booking created successfully',
      data: {
        booking: buildBookingResponse(updatedBooking),
        passengers: updatedBooking.passengers,
        revolut: revolutData
      }
    });
  } catch (error) {
    console.error('Create booking with payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create booking',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// Booking payment confirmation/status sync API
// Called when confirmation page loads: always uses latest Revolut order detail as source of truth
const confirmBookingPayment = async (req, res) => {
  try {
    const bookingId = req.query.booking_id || req.body?.booking_id;

    if (!bookingId) {
      return res.status(400).json({
        status: 'error',
        message: 'booking_id is required'
      });
    }
    try {
      const updatedBooking = await syncBookingPaymentStatus(bookingId);

      return res.status(200).json({
        status: 'success',
        message: 'Booking payment status updated successfully',
        data: {
          booking: buildBookingResponse(updatedBooking),
          passengers: updatedBooking.passengers,
          revolut: updatedBooking.revolutData
        }
      });
    } catch (revolutError) {
      console.error('Failed to fetch Revolut order details:', revolutError);
      return res.status(revolutError.statusCode || 500).json({
        status: 'error',
        message:
          revolutError.message || 'Failed to fetch latest payment details from Revolut',
        ...(revolutError.data && { error: revolutError.data })
      });
    }
  } catch (error) {
    console.error('Confirm booking payment error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to confirm booking payment',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

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

// Get current user's bookings (includes linked bookings + guest bookings by same email)
const getMyBookings = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const userEmail = (req.user.email || '').toLowerCase().trim();
    const requestedStatus = req.query.status ? String(req.query.status).toLowerCase() : null;
    const allowedStatuses = ['pending', 'confirmed', 'cancelled'];

    if (requestedStatus && !allowedStatuses.includes(requestedStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`
      });
    }

    // Base filter: same PassengerBooking collection as getAllBookings.
    // Include: (1) bookings linked to user ID, (2) guest bookings (user null/absent) with matching email.
    const baseFilter = userEmail
      ? {
          $or: [
            { user: req.user._id },
            { $and: [{ $or: [{ user: null }, { user: { $exists: false } }] }, { email: userEmail }] }
          ]
        }
      : { user: req.user._id };

    // For confirmed/pending: DB paymentStatus can be stale. Must sync first, then filter.
    // Fetch recent bookings (up to 150), sync with Revolut, filter by payment, paginate.
    const needsSyncThenFilter = requestedStatus === 'confirmed' || requestedStatus === 'pending';
    const queryFilter = { ...baseFilter };
    if (requestedStatus === 'cancelled') {
      queryFilter.bookingStatus = 'cancelled';
    } else if (requestedStatus === 'confirmed' || requestedStatus === 'pending') {
      queryFilter.bookingStatus = { $ne: 'cancelled' };
    }

    // Only include bookings with non-failed / non-void payment statuses
    const allowedPaymentStatusesForMyBookings = [
      ...IN_PROGRESS_PAYMENT_STATUSES,
      ...SUCCESS_PAYMENT_STATUSES
    ];
    queryFilter.paymentStatus = { $in: allowedPaymentStatusesForMyBookings };

    const fetchLimit = needsSyncThenFilter ? 150 : limit;
    const fetchSkip = needsSyncThenFilter ? 0 : skip;

    const bookings = await PassengerBooking.find(queryFilter)
      .sort({ createdAt: -1 })
      .skip(fetchSkip)
      .limit(fetchLimit)
      .lean();

    // Dedupe by bookingReference: prefer record with revolutOrderId (canonical payment-linked record)
    const seenRefs = new Map();
    const deduped = [];
    for (const b of bookings) {
      const ref = (b.bookingReference || b._id?.toString() || '').toUpperCase();
      const existing = seenRefs.get(ref);
      const hasRevolut = !!(b.revolutOrderId);
      if (!existing || (hasRevolut && !existing.revolutOrderId)) {
        if (existing) deduped.splice(deduped.indexOf(existing), 1);
        seenRefs.set(ref, b);
        deduped.push(b);
      }
    }

    // Sync payment status with Revolut for each booking
    const syncedBookings = await Promise.all(
      deduped.map(async (b) => {
        if (b.revolutOrderId) {
          try {
            return await syncBookingPaymentStatus(b._id);
          } catch (err) {
            console.error(`Failed to sync payment status for booking ${b._id}:`, err.message);
            return b;
          }
        }
        return b;
      })
    );

    let resultBookings = syncedBookings;
    let total = syncedBookings.length;

    if (requestedStatus === 'confirmed') {
      // Confirmed: bookingStatus === 'confirmed' OR paymentStatus IN ('paid','completed','success')
      resultBookings = syncedBookings.filter((b) => {
        const bs = String(b.bookingStatus || '').toLowerCase();
        const ps = String(b.paymentStatus || '').toLowerCase();
        return bs === 'confirmed' || SUCCESS_PAYMENT_STATUSES.includes(ps);
      });
      total = resultBookings.length;
      resultBookings = resultBookings.slice(skip, skip + limit);
    } else if (requestedStatus === 'pending') {
      // Pending: paymentStatus === 'pending' only
      resultBookings = syncedBookings.filter((b) =>
        String(b.paymentStatus || '').toLowerCase() === 'pending'
      );
      total = resultBookings.length;
      resultBookings = resultBookings.slice(skip, skip + limit);
    } else {
      total = await PassengerBooking.countDocuments(queryFilter);
    }

    res.status(200).json({
      status: 'success',
      data: {
        bookings: resultBookings.map(serializeBookingForClient),
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit))
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
        bookings: bookings.map(serializeBookingForClient),
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
    const booking = await PassengerBooking.findById(req.params.id).populate(
      'user',
      'fullName username email'
    );

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

    // Keep payment status in sync for admin/dashboard booking detail views
    let syncedBooking = booking;
    try {
      syncedBooking = await syncBookingPaymentStatus(booking._id);
    } catch (syncError) {
      // If sync fails, log and fall back to existing booking data
      console.error('Failed to sync booking payment status for getBookingById:', syncError);
    }

    res.status(200).json({
      status: 'success',
      data: { booking: serializeBookingForClient(syncedBooking) }
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
    const booking = await PassengerBooking.findByReference(req.params.reference).populate(
      'user',
      'fullName username email'
    );

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

    let syncedBooking = booking;
    try {
      syncedBooking = await syncBookingPaymentStatus(booking._id);
    } catch (syncError) {
      console.error(
        'Failed to sync booking payment status for getBookingByReference:',
        syncError
      );
    }

    res.status(200).json({
      status: 'success',
      data: { booking: serializeBookingForClient(syncedBooking) }
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
  createBookingWithPayment,
  confirmBookingPayment,
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
