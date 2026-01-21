const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Get user's saved payment methods
const getPaymentMethods = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        paymentMethods: user.savedPaymentMethods.map(pm => ({
          id: pm._id,
          provider: pm.provider,
          type: pm.type,
          cardBrand: pm.cardBrand,
          last4: pm.last4,
          expiryMonth: pm.expiryMonth,
          expiryYear: pm.expiryYear,
          isDefault: pm.isDefault,
          nickname: pm.nickname,
          addedAt: pm.addedAt
        }))
      }
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching payment methods'
    });
  }
};

// Add new payment method
const addPaymentMethod = async (req, res) => {
  try {
    const {
      paymentMethodId,
      provider,
      type,
      cardBrand,
      last4,
      expiryMonth,
      expiryYear,
      nickname,
      isDefault
    } = req.body;

    // Validate required fields
    if (!paymentMethodId || !provider || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment method ID, provider, and type are required'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if payment method already exists
    const existingMethod = user.savedPaymentMethods.find(
      pm => pm.paymentMethodId === paymentMethodId
    );

    if (existingMethod) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment method already exists'
      });
    }

    // Add payment method
    await user.addPaymentMethod({
      paymentMethodId,
      provider,
      type,
      cardBrand,
      last4,
      expiryMonth,
      expiryYear,
      nickname,
      isDefault: isDefault || false
    });

    res.status(201).json({
      status: 'success',
      message: 'Payment method added successfully',
      data: {
        paymentMethods: user.savedPaymentMethods.map(pm => ({
          id: pm._id,
          provider: pm.provider,
          type: pm.type,
          cardBrand: pm.cardBrand,
          last4: pm.last4,
          expiryMonth: pm.expiryMonth,
          expiryYear: pm.expiryYear,
          isDefault: pm.isDefault,
          nickname: pm.nickname,
          addedAt: pm.addedAt
        }))
      }
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error adding payment method'
    });
  }
};

// Remove payment method
const removePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;

    if (!paymentMethodId) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment method ID is required'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    try {
      await user.removePaymentMethod(paymentMethodId);
    } catch (error) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Payment method removed successfully',
      data: {
        paymentMethods: user.savedPaymentMethods.map(pm => ({
          id: pm._id,
          provider: pm.provider,
          type: pm.type,
          cardBrand: pm.cardBrand,
          last4: pm.last4,
          expiryMonth: pm.expiryMonth,
          expiryYear: pm.expiryYear,
          isDefault: pm.isDefault,
          nickname: pm.nickname,
          addedAt: pm.addedAt
        }))
      }
    });
  } catch (error) {
    console.error('Remove payment method error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error removing payment method'
    });
  }
};

// Set default payment method
const setDefaultPaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;

    if (!paymentMethodId) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment method ID is required'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    try {
      await user.setDefaultPaymentMethod(paymentMethodId);
    } catch (error) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Default payment method updated successfully',
      data: {
        paymentMethods: user.savedPaymentMethods.map(pm => ({
          id: pm._id,
          provider: pm.provider,
          type: pm.type,
          cardBrand: pm.cardBrand,
          last4: pm.last4,
          expiryMonth: pm.expiryMonth,
          expiryYear: pm.expiryYear,
          isDefault: pm.isDefault,
          nickname: pm.nickname,
          addedAt: pm.addedAt
        }))
      }
    });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error setting default payment method'
    });
  }
};

// Get user's payment history (transactions)
const getPaymentHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        transactions: transactions.map(t => ({
          id: t._id,
          transaction_id: t.transaction_id,
          amount: t.amount,
          currency: t.currency,
          status: t.status,
          description: t.description,
          product: t.product,
          bookingRef: t.bookingRef,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching payment history'
    });
  }
};

module.exports = {
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  getPaymentHistory
};
