const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transaction_id: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      maxlength: [100, "Customer name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    bookingRef: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      trim: true,
      uppercase: true,
      enum: {
        values: ["USD", "EUR", "GBP"],
        message: "Currency must be USD, EUR, or GBP",
      },
    },
    product: {
      type: String,
      trim: true,
      maxlength: [100, "Product cannot exceed 100 characters"],
    },
    checkoutUrl: {
      type: String,
      trim: true,
    },
    revolutOrderId: {
      type: String,
      trim: true,
    },
    redirect_url: {
      type: String,
      trim: true,
    },
    revolutData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      trim: true,
      default: 'pending',
      enum: {
        values: ['pending', 'created', 'initiated', 'authorized', 'completed', 'paid', 'success', 'failed', 'canceled', 'cancelled', 'void'],
        message: 'Invalid transaction status'
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Helper function to generate unique transaction ID
const generateTransactionId = () => {
  // Use last 6 characters of timestamp for shorter ID
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  const random1 = Math.random().toString(36).substr(2, 2).toUpperCase();
  const random2 = Math.random().toString(36).substr(2, 2).toUpperCase();
  return `OGGOTRIP-${timestamp}${random1}${random2}`;
};

// Pre-save middleware to generate transaction ID with collision handling
transactionSchema.pre('save', async function (next) {
  if (this.isNew && !this.transaction_id) {
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const newId = generateTransactionId();
      
      // Check if this ID already exists
      const existing = await this.constructor.findOne({ transaction_id: newId });
      
      if (!existing) {
        this.transaction_id = newId;
        isUnique = true;
      } else {
        attempts++;
        // Add small delay to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    if (!isUnique) {
      return next(new Error('Failed to generate unique transaction ID after multiple attempts'));
    }
  }
  next();
});

// Create indexes for better performance
transactionSchema.index({ transaction_id: 1 });
transactionSchema.index({ bookingRef: 1 });
transactionSchema.index({ email: 1 });
transactionSchema.index({ revolutOrderId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
