const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Role name is required'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [2, 'Role name must be at least 2 characters'],
        maxlength: [50, 'Role name cannot exceed 50 characters'],
        match: [/^[a-z0-9_-]+$/, 'Role name can only contain lowercase letters, numbers, hyphens, and underscores']
    },
    displayName: {
        type: String,
        required: [true, 'Display name is required'],
        trim: true,
        maxlength: [100, 'Display name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Role description is required'],
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    permissions: [{
        type: String,
        required: true,
        trim: true,
        match: [/^[a-z]+\.[a-z]+(\.[a-z]+)?$/, 'Permission must be in format: resource.action or resource.action.scope']
    }],
    isSystemRole: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Can be null for system roles
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for role summary
roleSchema.virtual('summary').get(function () {
    return {
        id: this._id,
        name: this.name,
        displayName: this.displayName,
        description: this.description,
        permissionCount: this.permissions.length,
        isSystemRole: this.isSystemRole,
        isActive: this.isActive,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
});

// Virtual for users with this role
roleSchema.virtual('userCount', {
    ref: 'User',
    localField: '_id',
    foreignField: 'roles',
    count: true
});

// Pre-save middleware to validate permissions
roleSchema.pre('save', function (next) {
    // Remove duplicate permissions
    this.permissions = [...new Set(this.permissions)];

    // Validate that permissions are not empty
    if (this.permissions.length === 0) {
        return next(new Error('Role must have at least one permission'));
    }

    next();
});

// Instance method to check if role has specific permission
roleSchema.methods.hasPermission = function (permission) {
    return this.permissions.includes(permission);
};

// Instance method to add permission
roleSchema.methods.addPermission = function (permission) {
    if (!this.permissions.includes(permission)) {
        this.permissions.push(permission);
    }
    return this.save();
};

// Instance method to remove permission
roleSchema.methods.removePermission = function (permission) {
    this.permissions = this.permissions.filter(p => p !== permission);
    return this.save();
};

// Instance method to check if role can be deleted
roleSchema.methods.canBeDeleted = function () {
    return !this.isSystemRole;
};

// Static method to find role by name
roleSchema.statics.findByName = function (name) {
    return this.findOne({ name: name.toLowerCase() });
};

// Static method to find active roles
roleSchema.statics.findActive = function () {
    return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to find system roles
roleSchema.statics.findSystemRoles = function () {
    return this.find({ isSystemRole: true });
};

// Static method to find custom roles
roleSchema.statics.findCustomRoles = function () {
    return this.find({ isSystemRole: false });
};

// Indexes for better query performance
roleSchema.index({ name: 1 });
roleSchema.index({ isActive: 1 });
roleSchema.index({ isSystemRole: 1 });
roleSchema.index({ permissions: 1 });

module.exports = mongoose.model('Role', roleSchema);
