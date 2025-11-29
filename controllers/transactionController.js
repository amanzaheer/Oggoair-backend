const Transaction = require('../models/Transaction');
const axios = require('axios');

// Get all transactions
const getAllTransactions = async (req, res) => {
  try {
    const filter = {};

    // Filter by booking reference
    if (req.query.bookingRef) {
      filter.bookingRef = req.query.bookingRef;
    }

    // Filter by email
    if (req.query.email) {
      filter.email = req.query.email.toLowerCase();
    }

    // Search functionality
    if (req.query.search) {
      filter.$or = [
        { customerName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { bookingRef: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        transactions,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching transactions'
    });
  }
};

// Create a transaction
const createTransaction = async (req, res) => {
  try {
    const { customerName, email, phone, description, bookingRef, amount, currency } = req.body;

    // Validate required fields
    if (!customerName || !email || !phone || !bookingRef || amount === undefined || !currency) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: customerName, email, phone, bookingRef, amount, and currency are required'
      });
    }

    // Validate amount is a number and positive
    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount must be a positive number'
      });
    }

    // Check if REVOLUT_SECRET_KEY is configured
    const isRevolutKeyMissing = !process.env.REVOLUT_SECRET_KEY || 
                                 process.env.REVOLUT_SECRET_KEY === 'your_revolut_secret_key_here';
    const useTestMode = process.env.REVOLUT_TEST_MODE === 'true' || 
                        process.env.REVOLUT_TEST_MODE === '1' ||
                        isRevolutKeyMissing;

    // Test/Mock Mode - Skip Revolut API call when test mode is enabled
    if (useTestMode) {
      console.log('⚠️  ===== TEST MODE ACTIVE =====');
      console.log('⚠️  Running in TEST MODE - Revolut API call skipped');
      console.log('REVOLUT_TEST_MODE env:', process.env.REVOLUT_TEST_MODE);
      console.log('isRevolutKeyMissing:', isRevolutKeyMissing);
      console.log('useTestMode:', useTestMode);
      
      // Generate mock Revolut response
      const mockCheckoutUrl = `https://merchant.revolut.com/checkout/order/test_${Date.now()}`;
      const mockRevolutOrderId = `ord_test_${Date.now()}`;

      // Create transaction with mock data
      const transaction = await Transaction.create({
        customerName: customerName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        description: description?.trim(),
        bookingRef: bookingRef.trim(),
        amount,
        currency: currency.toUpperCase().trim(),
        checkoutUrl: mockCheckoutUrl,
        revolutOrderId: mockRevolutOrderId
      });

      return res.status(201).json({
        message: 'Transaction created successfully (TEST MODE - Mock Revolut Response)',
        transaction,
        testMode: true,
        warning: 'This is a test transaction. Revolut API was not called.'
      });
    }

    if (isRevolutKeyMissing) {
      console.error('REVOLUT_SECRET_KEY is not configured in environment variables');
      return res.status(500).json({
        status: 'error',
        message: 'Payment service configuration error',
        details: 'REVOLUT_SECRET_KEY is missing or not set. Please add your Revolut API key to config.env file, or set REVOLUT_TEST_MODE=true for development testing.'
      });
    }

    // Call Revolut Orders API
    let revolutResponse;
    try {
      revolutResponse = await axios.post(
        'https://merchant.revolut.com/api/orders',
        {
          amount: amount,
          currency: currency.toUpperCase().trim()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env.REVOLUT_SECRET_KEY}`
          }
        }
      );
    } catch (revolutError) {
      console.error('Revolut API error:', revolutError.response?.data || revolutError.message);
      
      // Handle Revolut API errors
      if (revolutError.response) {
        // Revolut API returned an error response
        const statusCode = revolutError.response.status || 500;
        const errorData = revolutError.response.data || {};
        
        // Provide more helpful error messages
        let errorMessage = 'Failed to create payment order';
        if (statusCode === 401) {
          errorMessage = 'Revolut API authentication failed. Please check your REVOLUT_SECRET_KEY in config.env';
        } else if (statusCode === 400) {
          errorMessage = 'Invalid request to Revolut API. Please check amount and currency values.';
        }
        
        return res.status(statusCode).json({
          status: 'error',
          message: errorMessage,
          error: errorData,
          details: statusCode === 401 ? 'Your Revolut API key may be invalid, expired, or not set correctly.' : undefined
        });
      } else if (revolutError.request) {
        // Request was made but no response received
        return res.status(503).json({
          status: 'error',
          message: 'Payment service unavailable'
        });
      } else {
        // Error in setting up the request
        return res.status(500).json({
          status: 'error',
          message: 'Error calling payment service'
        });
      }
    }

    // Extract checkout_url and id from Revolut response
    const checkoutUrl = revolutResponse.data?.checkout_url;
    const revolutOrderId = revolutResponse.data?.id;

    if (!checkoutUrl || !revolutOrderId) {
      console.error('Invalid Revolut response:', revolutResponse.data);
      return res.status(500).json({
        status: 'error',
        message: 'Invalid response from payment service',
        error: 'Missing checkout_url or id in response'
      });
    }

    // Create transaction with Revolut data
    const transaction = await Transaction.create({
      customerName: customerName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      description: description?.trim(),
      bookingRef: bookingRef.trim(),
      amount,
      currency: currency.toUpperCase().trim(),
      checkoutUrl,
      revolutOrderId
    });

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Transaction with this booking reference already exists'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Error creating transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update a transaction
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, email, phone, description, bookingRef, amount, currency } = req.body;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (customerName !== undefined) updateData.customerName = customerName.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (bookingRef !== undefined) updateData.bookingRef = bookingRef.trim();
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Amount must be a positive number'
        });
      }
      updateData.amount = amount;
    }
    if (currency !== undefined) updateData.currency = currency.toUpperCase().trim();

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Transaction updated successfully',
      data: {
        transaction: updatedTransaction
      }
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    
    // Handle validation errors
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
      message: 'Error updating transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete a transaction
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    await Transaction.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting transaction'
    });
  }
};

module.exports = {
  getAllTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction
};

