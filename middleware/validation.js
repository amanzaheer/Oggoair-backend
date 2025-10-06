const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Signup validation rules
const signupValidation = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters'),

  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .toLowerCase(),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
    .toLowerCase(),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),

  handleValidationErrors
];

// Login validation rules
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .toLowerCase(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// Update user validation rules
const updateUserValidation = [
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters'),

  body('email')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Email cannot be empty')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
    .toLowerCase(),

  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number'),

  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  handleValidationErrors
];

// Change password validation
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),

  handleValidationErrors
];

// Permission validation rules for CREATE
const validatePermission = [
  body('permissionName')
    .trim()
    .notEmpty()
    .withMessage('Permission name is required')
    .isLength({ max: 100 })
    .withMessage('Permission name cannot exceed 100 characters'),

  body('permissionKey')
    .trim()
    .notEmpty()
    .withMessage('Permission key is required')
    .isLength({ max: 50 })
    .withMessage('Permission key cannot exceed 50 characters')
    .matches(/^[a-z0-9._-]+$/)
    .withMessage('Permission key can only contain lowercase letters, numbers, dots, hyphens, and underscores')
    .toLowerCase(),

  body('permissionSequence')
    .isInt({ min: 1 })
    .withMessage('Permission sequence must be a positive integer'),

  body('subPermissions')
    .optional()
    .isArray()
    .withMessage('Sub-permissions must be an array'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  handleValidationErrors
];

// Permission validation rules for UPDATE
const validatePermissionUpdate = [
  body('permissionName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Permission name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Permission name cannot exceed 100 characters'),

  body('permissionKey')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Permission key cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Permission key cannot exceed 50 characters')
    .matches(/^[a-z0-9._-]+$/)
    .withMessage('Permission key can only contain lowercase letters, numbers, dots, hyphens, and underscores')
    .toLowerCase(),

  body('permissionSequence')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Permission sequence must be a positive integer'),

  body('subPermissions')
    .optional()
    .isArray()
    .withMessage('Sub-permissions must be an array'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  handleValidationErrors
];

// Sub-permission validation rules for CREATE
const validateSubPermission = [
  body('permissionName')
    .trim()
    .notEmpty()
    .withMessage('Sub-permission name is required')
    .isLength({ max: 100 })
    .withMessage('Sub-permission name cannot exceed 100 characters'),

  body('permissionKey')
    .trim()
    .notEmpty()
    .withMessage('Sub-permission key is required')
    .isLength({ max: 50 })
    .withMessage('Sub-permission key cannot exceed 50 characters')
    .matches(/^[a-z0-9._-]+$/)
    .withMessage('Sub-permission key can only contain lowercase letters, numbers, dots, hyphens, and underscores')
    .toLowerCase(),

  body('permissionSequence')
    .isInt({ min: 1 })
    .withMessage('Sub-permission sequence must be a positive integer'),

  handleValidationErrors
];

// Sub-permission validation rules for UPDATE
const validateSubPermissionUpdate = [
  body('permissionName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Sub-permission name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Sub-permission name cannot exceed 100 characters'),

  body('permissionKey')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Sub-permission key cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Sub-permission key cannot exceed 50 characters')
    .matches(/^[a-z0-9._-]+$/)
    .withMessage('Sub-permission key can only contain lowercase letters, numbers, dots, hyphens, and underscores')
    .toLowerCase(),

  body('permissionSequence')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sub-permission sequence must be a positive integer'),

  handleValidationErrors
];

module.exports = {
  signupValidation,
  loginValidation,
  updateUserValidation,
  changePasswordValidation,
  validatePermission,
  validatePermissionUpdate,
  validateSubPermission,
  validateSubPermissionUpdate,
  handleValidationErrors
};
