const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Role name is required'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [2, 'Role name must be at least 2 characters'],
        maxlength: [50, 'Role name cannot exceed 50 characters']
    },
    permissions: [{
        type: String,
        required: true,
        trim: true
    }]
}, {
    timestamps: true
});

// Pre-save middleware to validate permissions
roleSchema.pre('save', function (next) {
    // Remove duplicate permissions
    this.permissions = [...new Set(this.permissions)];

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

// Static method to find role by name
roleSchema.statics.findByName = function (name) {
    return this.findOne({ name: name.toLowerCase() });
};

// Indexes for better query performance
roleSchema.index({ name: 1 });
roleSchema.index({ permissions: 1 });

module.exports = mongoose.model('Role', roleSchema);
