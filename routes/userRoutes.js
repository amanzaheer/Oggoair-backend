const express = require('express');
const router = express.Router();

// Import controller
const userController = require('../controllers/userController');

// Import middleware
const { protect, restrictTo } = require('../middleware/auth');
const {
  signupValidation,
  loginValidation,
  updateUserValidation,
  changePasswordValidation,
  refreshTokenValidation
} = require('../middleware/validation');

// Public routes
// Check if email exists
router.post('/auth/check-email', userController.checkEmail);

// Verify OTP and complete signup (MUST BE BEFORE /signup route)
router.post('/signup/verify-otp', userController.verifySignupOTP);

// Signup - sends OTP to email
router.post('/signup', signupValidation, userController.signup);

// Login and token management
router.post('/login', loginValidation, userController.login);
router.post('/refresh-token', refreshTokenValidation, userController.refreshToken);

// Protected routes
router.use(protect); // All routes below this require authentication

// User profile routes
router.get('/me', userController.getMe);
router.put('/change-password', changePasswordValidation, userController.changePassword);
router.post('/logout', userController.logout);

// User management routes (Admin only)
router.get('/', restrictTo('admin'), userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', updateUserValidation, userController.updateUser);
router.delete('/:id', restrictTo('admin'), userController.deleteUser);

module.exports = router;
