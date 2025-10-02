const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controller
const roleController = require('../controllers/roleController');

// Import middleware
const { protect, restrictTo } = require('../middleware/auth');

// Validation middleware for creating role
const validateCreateRole = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Role name must be between 2-50 characters')
        .matches(/^[a-z0-9_-]+$/)
        .withMessage('Role name can only contain lowercase letters, numbers, hyphens, and underscores'),
    body('displayName')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Display name must be between 1-100 characters'),
    body('description')
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Description must be between 1-500 characters'),
    body('permissions')
        .isArray({ min: 1 })
        .withMessage('Role must have at least one permission'),
    body('permissions.*')
        .matches(/^[a-z]+\.[a-z]+(\.[a-z]+)?$/)
        .withMessage('Each permission must be in format: resource.action or resource.action.scope'),
    body('isSystemRole')
        .optional()
        .isBoolean()
        .withMessage('isSystemRole must be a boolean value')
];

// Validation middleware for updating role
const validateUpdateRole = [
    body('displayName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Display name must be between 1-100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Description must be between 1-500 characters'),
    body('permissions')
        .optional()
        .isArray({ min: 1 })
        .withMessage('Role must have at least one permission'),
    body('permissions.*')
        .optional()
        .matches(/^[a-z]+\.[a-z]+(\.[a-z]+)?$/)
        .withMessage('Each permission must be in format: resource.action or resource.action.scope'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value')
];

// Validation middleware for permission operations
const validatePermissionOperation = [
    body('permission')
        .trim()
        .matches(/^[a-z]+\.[a-z]+(\.[a-z]+)?$/)
        .withMessage('Permission must be in format: resource.action or resource.action.scope')
];

// All routes require authentication
router.use(protect);

// Role CRUD routes (Admin only)
router.post('/', restrictTo('admin'), validateCreateRole, roleController.createRole);
router.get('/', restrictTo('admin'), roleController.getAllRoles);
router.get('/stats', restrictTo('admin'), roleController.getRoleStats);
router.get('/:id', restrictTo('admin'), roleController.getRoleById);
router.get('/name/:name', restrictTo('admin'), roleController.getRoleByName);
router.put('/:id', restrictTo('admin'), validateUpdateRole, roleController.updateRole);
router.delete('/:id', restrictTo('admin'), roleController.deleteRole);

// Permission management routes (Admin only)
router.post('/:id/permissions', restrictTo('admin'), validatePermissionOperation, roleController.addPermissionToRole);
router.delete('/:id/permissions', restrictTo('admin'), validatePermissionOperation, roleController.removePermissionFromRole);

module.exports = router;
