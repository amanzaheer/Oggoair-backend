const Role = require('../models/Role');
const User = require('../models/User');

// Create a new role (without permissions)
const createRole = async (req, res) => {
    try {
        const { name } = req.body;

        // Check if role with same name already exists
        const existingRole = await Role.findByName(name);
        if (existingRole) {
            return res.status(400).json({
                status: 'error',
                message: 'Role with this name already exists'
            });
        }

        const roleData = {
            name,
            permissions: [] // Create role with empty permissions
        };

        const role = await Role.create(roleData);

        res.status(201).json({
            status: 'success',
            message: 'Role created successfully. You can now add permissions to this role.',
            data: {
                role
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

        // Search by name
        if (req.query.search) {
            filter.name = { $regex: req.query.search, $options: 'i' };
        }

        const roles = await Role.find(filter)
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
        const role = await Role.findById(req.params.id);

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
        const role = await Role.findByName(req.params.name);

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
        const { permissions } = req.body;
        const roleId = req.params.id;

        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Role not found'
            });
        }

        // Validate permissions if provided
        if (permissions && (!Array.isArray(permissions) || permissions.length === 0)) {
            return res.status(400).json({
                status: 'error',
                message: 'Role must have at least one permission'
            });
        }

        const updateData = {};

        if (permissions) updateData.permissions = permissions;

        const updatedRole = await Role.findByIdAndUpdate(
            roleId,
            updateData,
            { new: true, runValidators: true }
        );

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

        // Check if any users are assigned this role
        const usersWithRole = await User.countDocuments({ role: role._id });
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

        if (role.hasPermission(permission)) {
            return res.status(400).json({
                status: 'error',
                message: 'Permission already exists in this role'
            });
        }

        await role.addPermission(permission);

        res.status(200).json({
            status: 'success',
            message: 'Permission added to role successfully',
            data: {
                role
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

        res.status(200).json({
            status: 'success',
            message: 'Permission removed from role successfully',
            data: {
                role
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

        // Get roles with user counts
        const rolesWithUserCounts = await Role.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'role',
                    as: 'users'
                }
            },
            {
                $project: {
                    name: 1,
                    userCount: { $size: '$users' }
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
                    totalRoles
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

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Assign role to user
        user.role = roleId;
        await user.save();

        // Get updated user with populated role
        const updatedUser = await User.findById(userId)
            .populate('role', 'name permissions')
            .select('-password');

        res.status(200).json({
            status: 'success',
            message: `Role "${role.name}" assigned to user successfully`,
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

// Add permissions to role (menu_permission array)
const addRolePermissions = async (req, res) => {
    try {
        const { roleId, menu_permission } = req.body;

        // Validate roleId
        if (!roleId) {
            return res.status(400).json({
                status: 'error',
                message: 'Role ID is required'
            });
        }

        // Validate menu_permission array
        if (!menu_permission || !Array.isArray(menu_permission)) {
            return res.status(400).json({
                status: 'error',
                message: 'menu_permission must be an array'
            });
        }

        // Find role
        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Role not found'
            });
        }

        // Add permissions to role (remove duplicates)
        const uniquePermissions = [...new Set([...role.permissions, ...menu_permission])];
        role.permissions = uniquePermissions;
        await role.save();

        const message = menu_permission.length > 0
            ? `${menu_permission.length} permission(s) added to role successfully`
            : 'Role permissions updated successfully';

        res.status(200).json({
            status: 'success',
            message,
            data: {
                role
            }
        });
    } catch (error) {
        console.error('Add role permissions error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error adding permissions to role'
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
    assignUserRole,
    addRolePermissions
};
