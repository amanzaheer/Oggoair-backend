const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    heading: {
        type: String,
        required: [true, 'Heading is required'],
        trim: true,
        maxlength: [100, 'Heading cannot exceed 100 characters']
    },
    subHeading: {
        type: String,
        required: [true, 'Sub-heading is required'],
        trim: true,
        maxlength: [200, 'Sub-heading cannot exceed 200 characters']
    },
    image: {
        type: String,
        required: [true, 'Image is required']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
promotionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Create indexes for better performance
promotionSchema.index({ heading: 1 });
promotionSchema.index({ isActive: 1 });
promotionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Promotion', promotionSchema);
