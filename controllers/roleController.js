const Role = require('../models/Role');
const User = require('../models/User');

// Create a new role
const createRole = async (req, res) => {
    try {
        const { name, displayName, description, permissions, isSystemRole } = req.body;

        // Check if role with same name already exists
        const existingRole = await Role.findByName(name);
        if (existingRole) {
            return res.status(400).json({
                status: 'error',
                message: 'Role with this name already exists'
            });
        }

        // Validate permissions array
        if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Role must have at least one permission'
            });
        }

        const roleData = {
            name,
            displayName,
            description,
            permissions,
            isSystemRole: isSystemRole || false,
            createdBy: req.user._id
        };

        const role = await Role.create(roleData);

        res.status(201).json({
            status: 'success',
            message: 'Role created successfully',
            data: {
                role: role.summary
            }
        });
    } catch (error) {
        console.error('Create role error:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                status: 'error',
                message: 'Validation error',
                errors
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error creating role'
        });
    }
};

// Get all roles
const getAllRoles = async (req, res) => {
    try {
        const filter = {};

        // Filter by active status
        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === 'true';
        }

        // Filter by system role
        if (req.query.isSystemRole !== undefined) {
            filter.isSystemRole = req.query.isSystemRole === 'true';
        }

        // Search by name or display name
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { displayName: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const roles = await Role.find(filter)
            .populate('createdBy', 'fullName username email')
            .populate('updatedBy', 'fullName username email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            data: {
                roles
            }
        });
    } catch (error) {
        console.error('Get all roles error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching roles'
        });
    }
};

// Get role by ID
const getRoleById = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id)
            .populate('createdBy', 'fullName username email')
            .populate('updatedBy', 'fullName username email');

        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Role not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                role
            }
        });
    } catch (error) {
        console.error('Get role by ID error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching role'
        });
    }
};

// Get role by name
const getRoleByName = async (req, res) => {
    try {
        const role = await Role.findByName(req.params.name)
            .populate('createdBy', 'fullName username email')
            .populate('updatedBy', 'fullName username email');

        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Role not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                role
            }
        });
    } catch (error) {
        console.error('Get role by name error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching role'
        });
    }
};

// Update role
const updateRole = async (req, res) => {
    try {
        const { displayName, description, permissions, isActive } = req.body;
        const roleId = req.params.id;

        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Role not found'
            });
        }

        // Prevent updating system roles (except isActive)
        if (role.isSystemRole && (displayName || description || permissions)) {
            return res.status(403).json({
                status: 'error',
                message: 'Cannot modify system role properties. Only active status can be changed.'
            });
        }

        // Validate permissions if provided
        if (permissions && (!Array.isArray(permissions) || permissions.length === 0)) {
            return res.status(400).json({
                status: 'error',
                message: 'Role must have at least one permission'
            });
        }

        const updateData = {
            updatedBy: req.user._id
        };

        if (displayName) updateData.displayName = displayName;
        if (description) updateData.description = description;
        if (permissions) updateData.permissions = permissions;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedRole = await Role.findByIdAndUpdate(
            roleId,
            updateData,
            { new: true, runValidators: true }
        ).populate('createdBy', 'fullName username email')
            .populate('updatedBy', 'fullName username email');

        res.status(200).json({
            status: 'success',
            message: 'Role updated successfully',
            data: {
                role: updatedRole
            }
        });
    } catch (error) {
        console.error('Update role error:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                status: 'error',
                message: 'Validation error',
                errors
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error updating role'
        });
    }
};

// Delete role
const deleteRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Role not found'
            });
        }

        // Check if role can be deleted
        if (!role.canBeDeleted()) {
            return res.status(403).json({
                status: 'error',
                message: 'System roles cannot be deleted'
            });
        }

        // Check if any users are assigned this role
        // Users store single assignedRole, not array "roles"
        const usersWithRole = await User.countDocuments({ assignedRole: role._id });
        if (usersWithRole > 0) {
            return res.status(400).json({
                status: 'error',
                message: `Cannot delete role. ${usersWithRole} user(s) are assigned this role. Please reassign users first.`
            });
        }

        await Role.findByIdAndDelete(req.params.id);

        res.status(200).json({
            status: 'success',
            message: 'Role deleted successfully'
        });
    } catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error deleting role'
        });
    }
};

// Add permission to role
const addPermissionToRole = async (req, res) => {
    try {
        const { permission } = req.body;
        const roleId = req.params.id;

        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Role not found'
            });
        }

        if (role.isSystemRole) {
            return res.status(403).json({
                status: 'error',
                message: 'Cannot modify permissions of system roles'
            });
        }

        if (role.hasPermission(permission)) {
            return res.status(400).json({
                status: 'error',
                message: 'Permission already exists in this role'
            });
        }

        await role.addPermission(permission);
        role.updatedBy = req.user._id;
        await role.save();

        res.status(200).json({
            status: 'success',
            message: 'Permission added to role successfully',
            data: {
                role: role.summary
            }
        });
    } catch (error) {
        console.error('Add permission to role error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error adding permission to role'
        });
    }
};

// Remove permission from role
const removePermissionFromRole = async (req, res) => {
    try {
        const { permission } = req.body;
        const roleId = req.params.id;

        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Role not found'
            });
        }

        if (role.isSystemRole) {
            return res.status(403).json({
                status: 'error',
                message: 'Cannot modify permissions of system roles'
            });
        }

        if (!role.hasPermission(permission)) {
            return res.status(400).json({
                status: 'error',
                message: 'Permission does not exist in this role'
            });
        }

        // Check if removing this permission would leave the role with no permissions
        if (role.permissions.length === 1) {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot remove the last permission from a role'
            });
        }

        await role.removePermission(permission);
        role.updatedBy = req.user._id;
        await role.save();

        res.status(200).json({
            status: 'success',
            message: 'Permission removed from role successfully',
            data: {
                role: role.summary
            }
        });
    } catch (error) {
        console.error('Remove permission from role error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error removing permission from role'
        });
    }
};

// Get role statistics
const getRoleStats = async (req, res) => {
    try {
        const totalRoles = await Role.countDocuments();
        const activeRoles = await Role.countDocuments({ isActive: true });
        const systemRoles = await Role.countDocuments({ isSystemRole: true });
        const customRoles = await Role.countDocuments({ isSystemRole: false });

        // Get roles with user counts
        const rolesWithUserCounts = await Role.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'assignedRole',
                    as: 'users'
                }
            },
            {
                $project: {
                    name: 1,
                    displayName: 1,
                    userCount: { $size: '$users' },
                    isActive: 1,
                    isSystemRole: 1
                }
            },
            {
                $sort: { userCount: -1 }
            }
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                stats: {
                    totalRoles,
                    activeRoles,
                    systemRoles,
                    customRoles
                },
                rolesWithUserCounts
            }
        });
    } catch (error) {
        console.error('Get role stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching role statistics'
        });
    }
};

// Assign role to user
const assignUserRole = async (req, res) => {
    try {
        const { userId, roleId } = req.body;

        // Check if role exists
        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Role not found'
            });
        }

        // Check if role is active
        if (!role.isActive) {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot assign inactive role to user'
            });
        }

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Assign role to user and update role field with role name
        user.assignedRole = roleId;
        user.role = role.name;  // ✅ Update role field to match assignedRole name
        await user.save();

        // Get updated user with populated role
        const updatedUser = await User.findById(userId)
            .populate('assignedRole', 'name displayName description permissions isActive isSystemRole')
            .select('-password');

        res.status(200).json({
            status: 'success',
            message: `Role "${role.displayName}" assigned to user successfully`,
            data: {
                user: updatedUser.profile
            }
        });
    } catch (error) {
        console.error('Assign user role error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error assigning role to user'
        });
    }
};

module.exports = {
    createRole,
    getAllRoles,
    getRoleById,
    getRoleByName,
    updateRole,
    deleteRole,
    addPermissionToRole,
    removePermissionFromRole,
    getRoleStats,
    assignUserRole
};
