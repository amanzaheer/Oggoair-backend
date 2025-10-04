const mongoose = require('mongoose');

const subPermissionSchema = new mongoose.Schema({
    permissionName: {
        type: String,
        required: [true, 'Sub-permission name is required'],
        trim: true,
        maxlength: [100, 'Sub-permission name cannot exceed 100 characters']
    },
    permissionKey: {
        type: String,
        required: [true, 'Sub-permission key is required'],
        trim: true,
        lowercase: true,
        maxlength: [50, 'Sub-permission key cannot exceed 50 characters'],
        match: [/^[a-z0-9_-]+$/, 'Sub-permission key can only contain lowercase letters, numbers, hyphens, and underscores']
    },
    permissionSequence: {
        type: Number,
        required: [true, 'Sub-permission sequence is required'],
        min: [1, 'Sub-permission sequence must be at least 1']
    }
}, { _id: true });

const permissionSchema = new mongoose.Schema({
    permissionName: {
        type: String,
        required: [true, 'Permission name is required'],
        trim: true,
        maxlength: [100, 'Permission name cannot exceed 100 characters']
    },
    permissionKey: {
        type: String,
        required: [true, 'Permission key is required'],
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: [50, 'Permission key cannot exceed 50 characters'],
        match: [/^[a-z0-9_-]+$/, 'Permission key can only contain lowercase letters, numbers, hyphens, and underscores']
    },
    permissionSequence: {
        type: Number,
        required: [true, 'Permission sequence is required'],
        min: [1, 'Permission sequence must be at least 1']
    },
    subPermissions: [subPermissionSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
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

// Virtual for permission summary
permissionSchema.virtual('summary').get(function () {
    return {
        id: this._id,
        permissionName: this.permissionName,
        permissionKey: this.permissionKey,
        permissionSequence: this.permissionSequence,
        subPermissions: this.subPermissions,
        isActive: this.isActive,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
});

// Pre-save middleware to validate sub-permissions
permissionSchema.pre('save', function (next) {
    // Validate sub-permission keys are unique within the permission
    if (this.subPermissions && this.subPermissions.length > 0) {
        const subPermissionKeys = this.subPermissions.map(sub => sub.permissionKey);
        const uniqueKeys = [...new Set(subPermissionKeys)];

        if (subPermissionKeys.length !== uniqueKeys.length) {
            return next(new Error('Sub-permission keys must be unique within a permission'));
        }

        // Validate sub-permission sequences are unique within the permission
        const subPermissionSequences = this.subPermissions.map(sub => sub.permissionSequence);
        const uniqueSequences = [...new Set(subPermissionSequences)];

        if (subPermissionSequences.length !== uniqueSequences.length) {
            return next(new Error('Sub-permission sequences must be unique within a permission'));
        }
    }

    next();
});

// Instance method to add sub-permission
permissionSchema.methods.addSubPermission = function (subPermissionData) {
    // Check if sub-permission key already exists
    const existingSubPermission = this.subPermissions.find(
        sub => sub.permissionKey === subPermissionData.permissionKey
    );

    if (existingSubPermission) {
        throw new Error('Sub-permission with this key already exists');
    }

    this.subPermissions.push(subPermissionData);
    return this.save();
};

// Instance method to remove sub-permission
permissionSchema.methods.removeSubPermission = function (subPermissionKey) {
    this.subPermissions = this.subPermissions.filter(
        sub => sub.permissionKey !== subPermissionKey
    );
    return this.save();
};

// Instance method to update sub-permission
permissionSchema.methods.updateSubPermission = function (subPermissionKey, updateData) {
    const subPermission = this.subPermissions.find(
        sub => sub.permissionKey === subPermissionKey
    );

    if (!subPermission) {
        throw new Error('Sub-permission not found');
    }

    // Update the sub-permission
    Object.assign(subPermission, updateData);
    return this.save();
};

// Static method to find permission by key
permissionSchema.statics.findByKey = function (key) {
    return this.findOne({ permissionKey: key.toLowerCase() });
};

// Static method to find active permissions
permissionSchema.statics.findActive = function () {
    return this.find({ isActive: true }).sort({ permissionSequence: 1 });
};

// Static method to find permissions with sub-permissions
permissionSchema.statics.findWithSubPermissions = function () {
    return this.find({
        $or: [
            { subPermissions: { $exists: true, $not: { $size: 0 } } },
            { subPermissions: { $exists: false } }
        ]
    }).sort({ permissionSequence: 1 });
};

// Indexes for better query performance
permissionSchema.index({ permissionKey: 1 });
permissionSchema.index({ permissionSequence: 1 });
permissionSchema.index({ isActive: 1 });
permissionSchema.index({ 'subPermissions.permissionKey': 1 });

module.exports = mongoose.model('Permission', permissionSchema);
