const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controller
const roleController = require('../controllers/roleController');

// Import middleware
const { protect, restrictTo } = require('../middleware/auth');

// Validation middleware for creating role (without permissions)
const validateCreateRole = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Role name must be between 2-50 characters')
];

// Validation middleware for updating role
const validateUpdateRole = [
    body('permissions')
        .optional()
        .isArray()
        .withMessage('Permissions must be an array')
];

// Validation middleware for permission operations
const validatePermissionOperation = [
    body('permission')
        .trim()
        .notEmpty()
        .withMessage('Permission is required')
];

// Validation middleware for user role assignment
const validateUserRoleAssignment = [
    body('userId')
        .isMongoId()
        .withMessage('Valid user ID is required'),
    body('roleId')
        .isMongoId()
        .withMessage('Valid role ID is required')
];

// Validation middleware for adding role permissions
const validateAddRolePermissions = [
    body('roleId')
        .isMongoId()
        .withMessage('Valid role ID is required'),
    body('menu_permission')
        .isArray()
        .withMessage('menu_permission must be an array')
];

// All routes require authentication
router.use(protect);

// Role CRUD routes (Admin only)
router.post('/', restrictTo('admin'), validateCreateRole, roleController.createRole);
router.get('/', restrictTo('admin'), roleController.getAllRoles);
router.get('/stats', restrictTo('admin'), roleController.getRoleStats);

// User role assignment route (Admin only) - Must be before parameterized routes
router.post('/assign-user-role', restrictTo('admin'), validateUserRoleAssignment, roleController.assignUserRole);

// Add permissions to role route (Admin only) - Must be before parameterized routes
router.post('/add-permissions', restrictTo('admin'), validateAddRolePermissions, roleController.addRolePermissions);

// Parameterized routes (Admin only)
router.get('/:id', roleController.getRoleById);
router.get('/name/:name', restrictTo('admin'), roleController.getRoleByName);
router.put('/:id', restrictTo('admin'), validateUpdateRole, roleController.updateRole);
router.delete('/:id', restrictTo('admin'), roleController.deleteRole);

// Permission management routes (Admin only)
router.post('/:id/permissions', restrictTo('admin'), validatePermissionOperation, roleController.addPermissionToRole);
router.delete('/:id/permissions', restrictTo('admin'), validatePermissionOperation, roleController.removePermissionFromRole);

module.exports = router;
