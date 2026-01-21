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
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
    .toLowerCase(),

  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty if provided')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty if provided')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),

  handleValidationErrors
];

// Login validation rules
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
    .toLowerCase(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// Update user validation rules
const updateUserValidation = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),

  body('username')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Username cannot be empty')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .toLowerCase(),

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
    .custom((value) => {
      if (value === null || value === '') return true;
      return /^[\+]?[1-9][\d]{0,15}$/.test(value);
    })
    .withMessage('Please enter a valid phone number'),

  body('dateOfBirth')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true;
      const date = new Date(value);
      const now = new Date();
      const minAge = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return date < minAge && !isNaN(date.getTime());
    })
    .withMessage('Please enter a valid date of birth'),

  body('countryOfBirth')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country of birth cannot exceed 100 characters'),

  body('passportNumber')
    .optional()
    .trim()
    .custom((value) => {
      if (value === null || value === '') return true;
      return /^[A-Z0-9]*$/.test(value.toUpperCase());
    })
    .withMessage('Passport number can only contain letters and numbers')
    .isLength({ max: 20 })
    .withMessage('Passport number cannot exceed 20 characters'),

  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),

  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),

  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),

  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State/Province cannot exceed 100 characters'),

  body('address.country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters'),

  body('address.postalCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters'),

  body('role')
    .optional()
    .isMongoId()
    .withMessage('Role must be a valid MongoDB ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  handleValidationErrors
];

// Change password validation (only requires newPassword)
const changePasswordValidation = [
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),

  handleValidationErrors
];

// Set password validation (for users without existing password)
const setPasswordValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  handleValidationErrors
];

// Refresh token validation
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),

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
  setPasswordValidation,
  refreshTokenValidation,
  validatePermission,
  validatePermissionUpdate,
  validateSubPermission,
  validateSubPermissionUpdate,
  handleValidationErrors
};
