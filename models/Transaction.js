const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for better performance
transactionSchema.index({ bookingRef: 1 });
transactionSchema.index({ email: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
