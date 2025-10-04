const Permission = require('../models/Permission');

// Create a new permission
const createPermission = async (req, res) => {
    try {
        const { permissionName, permissionKey, permissionSequence, subPermissions } = req.body;

        // Check if permission with same key already exists
        const existingPermission = await Permission.findByKey(permissionKey);
        if (existingPermission) {
            return res.status(400).json({
                success: false,
                message: 'Permission with this key already exists',
                statusCode: 400
            });
        }

        const permissionData = {
            permissionName,
            permissionKey,
            permissionSequence,
            subPermissions: subPermissions || [],
            createdBy: req.user?._id
        };

        const permission = await Permission.create(permissionData);

        res.status(201).json({
            success: true,
            message: 'Permission created successfully',
            data: permission,
            statusCode: 201
        });
    } catch (error) {
        console.error('Create permission error:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors,
                statusCode: 400
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating permission',
            statusCode: 500
        });
    }
};

// Get all permissions
const getAllPermissions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {};

        // Filter by active status
        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === 'true';
        }

        // Search by permission name or key
        if (req.query.search) {
            filter.$or = [
                { permissionName: { $regex: req.query.search, $options: 'i' } },
                { permissionKey: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const permissions = await Permission.find(filter)
            .populate('createdBy', 'fullName username email')
            .populate('updatedBy', 'fullName username email')
            .sort({ permissionSequence: 1 })
            .skip(skip)
            .limit(limit);

        const total = await Permission.countDocuments(filter);

        res.status(200).json({
            success: true,
            message: 'Permissions fetched successfully',
            data: permissions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            statusCode: 200
        });
    } catch (error) {
        console.error('Get all permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching permissions',
            statusCode: 500
        });
    }
};

// Get permission by ID
const getPermissionById = async (req, res) => {
    try {
        const permission = await Permission.findById(req.params.id)
            .populate('createdBy', 'fullName username email')
            .populate('updatedBy', 'fullName username email');

        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Permission not found',
                statusCode: 404
            });
        }

        res.status(200).json({
            success: true,
            message: 'Permission fetched successfully',
            data: permission,
            statusCode: 200
        });
    } catch (error) {
        console.error('Get permission by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching permission',
            statusCode: 500
        });
    }
};

// Get permission by key
const getPermissionByKey = async (req, res) => {
    try {
        const permission = await Permission.findByKey(req.params.key)
            .populate('createdBy', 'fullName username email')
            .populate('updatedBy', 'fullName username email');

        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Permission not found',
                statusCode: 404
            });
        }

        res.status(200).json({
            success: true,
            message: 'Permission fetched successfully',
            data: permission,
            statusCode: 200
        });
    } catch (error) {
        console.error('Get permission by key error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching permission',
            statusCode: 500
        });
    }
};

// Update permission
const updatePermission = async (req, res) => {
    try {
        const { permissionName, permissionKey, permissionSequence, subPermissions, isActive } = req.body;
        const permissionId = req.params.id;

        const permission = await Permission.findById(permissionId);
        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Permission not found',
                statusCode: 404
            });
        }

        // Check if new permission key already exists (if being changed)
        if (permissionKey && permissionKey !== permission.permissionKey) {
            const existingPermission = await Permission.findByKey(permissionKey);
            if (existingPermission) {
                return res.status(400).json({
                    success: false,
                    message: 'Permission with this key already exists',
                    statusCode: 400
                });
            }
        }

        const updateData = {
            updatedBy: req.user?._id
        };

        if (permissionName) updateData.permissionName = permissionName;
        if (permissionKey) updateData.permissionKey = permissionKey;
        if (permissionSequence) updateData.permissionSequence = permissionSequence;
        if (subPermissions) updateData.subPermissions = subPermissions;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedPermission = await Permission.findByIdAndUpdate(
            permissionId,
            updateData,
            { new: true, runValidators: true }
        ).populate('createdBy', 'fullName username email')
            .populate('updatedBy', 'fullName username email');

        res.status(200).json({
            success: true,
            message: 'Permission updated successfully',
            data: updatedPermission,
            statusCode: 200
        });
    } catch (error) {
        console.error('Update permission error:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors,
                statusCode: 400
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating permission',
            statusCode: 500
        });
    }
};

// Delete permission
const deletePermission = async (req, res) => {
    try {
        const permission = await Permission.findById(req.params.id);

        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Permission not found',
                statusCode: 404
            });
        }

        await Permission.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Permission deleted successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('Delete permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting permission',
            statusCode: 500
        });
    }
};

// Add sub-permission to permission
const addSubPermission = async (req, res) => {
    try {
        const { permissionName, permissionKey, permissionSequence } = req.body;
        const permissionId = req.params.id;

        const permission = await Permission.findById(permissionId);
        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Permission not found',
                statusCode: 404
            });
        }

        const subPermissionData = {
            permissionName,
            permissionKey,
            permissionSequence
        };

        await permission.addSubPermission(subPermissionData);
        permission.updatedBy = req.user?._id;
        await permission.save();

        res.status(200).json({
            success: true,
            message: 'Sub-permission added successfully',
            data: permission,
            statusCode: 200
        });
    } catch (error) {
        console.error('Add sub-permission error:', error);

        if (error.message === 'Sub-permission with this key already exists') {
            return res.status(400).json({
                success: false,
                message: error.message,
                statusCode: 400
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error adding sub-permission',
            statusCode: 500
        });
    }
};

// Remove sub-permission from permission
const removeSubPermission = async (req, res) => {
    try {
        const { subPermissionKey } = req.params;
        const permissionId = req.params.id;

        const permission = await Permission.findById(permissionId);
        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Permission not found',
                statusCode: 404
            });
        }

        await permission.removeSubPermission(subPermissionKey);
        permission.updatedBy = req.user?._id;
        await permission.save();

        res.status(200).json({
            success: true,
            message: 'Sub-permission removed successfully',
            data: permission,
            statusCode: 200
        });
    } catch (error) {
        console.error('Remove sub-permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing sub-permission',
            statusCode: 500
        });
    }
};

// Update sub-permission
const updateSubPermission = async (req, res) => {
    try {
        const { subPermissionKey } = req.params;
        const { permissionName, permissionKey, permissionSequence } = req.body;
        const permissionId = req.params.id;

        const permission = await Permission.findById(permissionId);
        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Permission not found',
                statusCode: 404
            });
        }

        const updateData = {};
        if (permissionName) updateData.permissionName = permissionName;
        if (permissionKey) updateData.permissionKey = permissionKey;
        if (permissionSequence) updateData.permissionSequence = permissionSequence;

        await permission.updateSubPermission(subPermissionKey, updateData);
        permission.updatedBy = req.user?._id;
        await permission.save();

        res.status(200).json({
            success: true,
            message: 'Sub-permission updated successfully',
            data: permission,
            statusCode: 200
        });
    } catch (error) {
        console.error('Update sub-permission error:', error);

        if (error.message === 'Sub-permission not found') {
            return res.status(404).json({
                success: false,
                message: error.message,
                statusCode: 404
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating sub-permission',
            statusCode: 500
        });
    }
};

// Get permission statistics
const getPermissionStats = async (req, res) => {
    try {
        const totalPermissions = await Permission.countDocuments();
        const activePermissions = await Permission.countDocuments({ isActive: true });
        const permissionsWithSubPermissions = await Permission.countDocuments({
            'subPermissions.0': { $exists: true }
        });

        // Get permissions with sub-permission counts
        const permissionsWithSubPermissionCounts = await Permission.aggregate([
            {
                $project: {
                    permissionName: 1,
                    permissionKey: 1,
                    subPermissionCount: { $size: { $ifNull: ['$subPermissions', []] } },
                    isActive: 1
                }
            },
            {
                $sort: { subPermissionCount: -1 }
            }
        ]);

        res.status(200).json({
            success: true,
            message: 'Permission statistics fetched successfully',
            data: {
                stats: {
                    totalPermissions,
                    activePermissions,
                    permissionsWithSubPermissions
                },
                permissionsWithSubPermissionCounts
            },
            statusCode: 200
        });
    } catch (error) {
        console.error('Get permission stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching permission statistics',
            statusCode: 500
        });
    }
};

module.exports = {
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
};
