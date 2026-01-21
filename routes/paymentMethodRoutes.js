const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// Import controller
const {
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  getPaymentHistory
} = require('../controllers/paymentMethodController');

// Import middleware
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Validation middleware for adding payment method
const validateAddPaymentMethod = [
  body('paymentMethodId')
    .trim()
    .notEmpty()
    .withMessage('Payment method ID is required'),
  
  body('provider')
    .trim()
    .notEmpty()
    .withMessage('Provider is required')
    .isIn(['revolut', 'stripe', 'paypal'])
    .withMessage('Provider must be revolut, stripe, or paypal'),
  
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['card', 'bank_account', 'wallet'])
    .withMessage('Type must be card, bank_account, or wallet'),
  
  body('cardBrand')
    .optional()
    .trim(),
  
  body('last4')
    .optional()
    .trim()
    .isLength({ min: 4, max: 4 })
    .withMessage('Last 4 digits must be exactly 4 characters'),
  
  body('expiryMonth')
    .optional()
    .trim()
    .matches(/^(0[1-9]|1[0-2])$/)
    .withMessage('Expiry month must be 01-12'),
  
  body('expiryYear')
    .optional()
    .trim()
    .isLength({ min: 4, max: 4 })
    .withMessage('Expiry year must be 4 digits'),
  
  body('nickname')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Nickname cannot exceed 50 characters'),
  
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean'),
  
  handleValidationErrors
];

// All routes require authentication
router.use(protect);

// Payment methods routes
router.get('/methods', getPaymentMethods);
router.post('/methods', validateAddPaymentMethod, addPaymentMethod);
router.delete('/methods/:paymentMethodId', removePaymentMethod);
router.patch('/methods/:paymentMethodId/default', setDefaultPaymentMethod);

// Payment history route
router.get('/history', getPaymentHistory);

module.exports = router;
