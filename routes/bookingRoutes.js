const express = require('express');
const { body } = require('express-validator');
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  getBookingByReference,
  updateBookingStatus,
  updateBooking,
  deleteBooking,
  getBookingStats,
} = require('../controllers/bookingController');
const { protect, restrictTo } = require('../middleware/auth');
const { syncDuffelOrders } = require('../controllers/duffelSyncController');

const router = express.Router();

// Validation middleware for creating booking
const validateCreateBooking = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone.dialingCode').notEmpty().withMessage('Dialing code is required'),
  body('phone.number').notEmpty().withMessage('Phone number is required'),
  body('passengers')
    .isArray({ min: 1 })
    .withMessage('At least one passenger is required'),
  body('passengers.*.title')
    .isIn(['Mr', 'Mrs', 'Ms'])
    .withMessage('Title must be Mr, Mrs, or Ms'),
  body('passengers.*.firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be between 1-50 characters'),
  body('passengers.*.lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be between 1-50 characters'),
  body('passengers.*.dateOfBirth.day')
    .isInt({ min: 1, max: 31 })
    .withMessage('Day of birth must be between 1-31'),
  body('passengers.*.dateOfBirth.month')
    .isInt({ min: 1, max: 12 })
    .withMessage('Month of birth must be between 1-12'),
  body('passengers.*.dateOfBirth.year')
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Year of birth must be valid'),
  body('passengers.*.countryOfResidence')
    .trim()
    .notEmpty()
    .withMessage('Country of residence is required'),
  body('passengers.*.passportNumber')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Passport number is required and must be between 1-20 characters'),
  body('passengers.*.passportExpiry.day')
    .isInt({ min: 1, max: 31 })
    .withMessage('Passport expiry day must be between 1-31'),
  body('passengers.*.passportExpiry.month')
    .isInt({ min: 1, max: 12 })
    .withMessage('Passport expiry month must be between 1-12'),
  body('passengers.*.passportExpiry.year')
    .isInt({ min: new Date().getFullYear() })
    .withMessage('Passport expiry year must not be in the past'),
  body('notes.type')
    .optional()
    .isString()
    .trim()
    .withMessage('Notes.type must be a string'),
  body('notes.text')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes.text cannot exceed 1000 characters'),
];

// Validation middleware for updating booking
const validateUpdateBooking = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone.dialingCode')
    .optional()
    .notEmpty()
    .withMessage('Dialing code is required'),
  body('phone.number')
    .optional()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('passengers')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one passenger is required'),
  body('notes.text')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

// Validation middleware for updating booking status
const validateUpdateStatus = [
  body('status')
    .isIn(['pending', 'confirmed', 'cancelled'])
    .withMessage('Status must be pending, confirmed, or cancelled'),
];

// Public routes (no authentication required)
router.post('/sync/duffel/public', syncDuffelOrders);

// Protected routes (authentication required)
router.use(protect);

// Admin-only routes
router.get('/stats/overview', restrictTo('admin'), getBookingStats);
router.get('/', restrictTo('admin'), getAllBookings);
router.post('/sync/duffel', restrictTo('admin'), syncDuffelOrders);

// User routes
router.get('/my-bookings', getMyBookings);
router.get('/reference/:reference', getBookingByReference);
router.get('/:id', getBookingById);
router.post('/', validateCreateBooking, createBooking);
router.put('/:id', validateUpdateBooking, updateBooking);
router.patch('/:id/status', validateUpdateStatus, updateBookingStatus);
router.delete('/:id', deleteBooking);

module.exports = router;
