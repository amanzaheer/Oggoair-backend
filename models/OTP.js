const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    otp: {
        type: String,
        required: [true, 'OTP is required'],
        length: [4, 'OTP must be exactly 4 digits']
    },
    purpose: {
        type: String,
        enum: ['registration', 'login', 'booking', 'password_reset'],
        default: 'booking'
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 3 * 60 * 1000) // 3 minutes from now
    },
    userData: {
        type: mongoose.Schema.Types.Mixed,
        default: null // Store temporary user data during booking
    }
}, {
    timestamps: true
});

// Index for better query performance
otpSchema.index({ email: 1, purpose: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired OTPs

// Static method to generate 4-digit OTP
otpSchema.statics.generateOTP = function () {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

// Static method to create OTP record
otpSchema.statics.createOTP = async function (email, purpose = 'booking', userData = null) {
    // Delete any existing OTP for this email and purpose
    await this.deleteMany({ email, purpose });

    const otp = this.generateOTP();

    const otpRecord = await this.create({
        email,
        otp,
        purpose,
        userData
    });

    return otpRecord;
};

// Instance method to verify OTP
otpSchema.methods.verifyOTP = function (inputOTP) {
    // Check if OTP is expired
    if (this.expiresAt < new Date()) {
        return { valid: false, message: 'OTP has expired' };
    }

    // Check if OTP is already used
    if (this.isUsed) {
        return { valid: false, message: 'OTP has already been used' };
    }

    // Check if OTP matches
    if (this.otp !== inputOTP) {
        return { valid: false, message: 'Invalid OTP' };
    }

    // Mark OTP as used
    this.isUsed = true;
    this.save();

    return { valid: true, message: 'OTP verified successfully' };
};

// Static method to find valid OTP
otpSchema.statics.findValidOTP = function (email, purpose = 'booking') {
    return this.findOne({
        email,
        purpose,
        isUsed: false,
        expiresAt: { $gt: new Date() }
    });
};

module.exports = mongoose.model('OTP', otpSchema);

