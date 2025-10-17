const mongoose = require('mongoose');

const duffelOrderSchema = new mongoose.Schema({
    duffelOrderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    bookingReference: {
        type: String,
        required: false,
        index: true
    },
    status: {
        type: String,
        required: false,
        index: true
    },
    passengerNames: {
        type: [String],
        default: []
    },
    totalAmount: {
        type: String,
        required: false
    },
    currency: {
        type: String,
        required: false
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    lastSyncedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

duffelOrderSchema.index({ bookingReference: 1 });
duffelOrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('DuffelOrder', duffelOrderSchema);


