const express = require('express');
const router = express.Router();
const {
    createPermission,
    getAllPermissions,
    getPermissionById,
    getPermissionByKey,
    updatePermission,
    deletePermission,
    addSubPermission,
    removeSubPermission,
    updateSubPermission,
    getPermissionStats
} = require('../controllers/permissionController');

// Import middleware
const { protect } = require('../middleware/auth');
const { validatePermission, validatePermissionUpdate, validateSubPermission, validateSubPermissionUpdate } = require('../middleware/validation');

// Apply authentication middleware to all routes
router.use(protect);

// Permission CRUD routes
router.post('/', validatePermission, createPermission);
router.get('/', getAllPermissions);
router.get('/stats', getPermissionStats);
router.get('/key/:key', getPermissionByKey);
router.get('/:id', getPermissionById);
router.put('/:id', validatePermissionUpdate, updatePermission);
router.delete('/:id', deletePermission);

// Sub-permission routes
router.post('/:id/sub-permissions', validateSubPermission, addSubPermission);
router.put('/:id/sub-permissions/:subPermissionKey', validateSubPermissionUpdate, updateSubPermission);
router.delete('/:id/sub-permissions/:subPermissionKey', removeSubPermission);

module.exports = router;
