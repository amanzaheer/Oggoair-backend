const Transaction = require('../models/Transaction');
const axios = require('axios');

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP'];

// Helper function to convert amount to minor currency units (cents/pence)
// USD, EUR, and GBP all use 2 decimal places (100:1 ratio)
const convertToMinorUnits = (amount) => {
  return Math.round(amount * 100);
};

// Helper function to build transaction data object
const buildTransactionData = (reqBody, revolutData = {}) => {
  const { customerName, email, phone, description, bookingRef, amount, currency, product, redirect_url } = reqBody;
  
  const transactionData = {
    customerName: customerName.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    amount,
    currency: currency.toUpperCase().trim()
  };

  // Add optional fields if provided
  if (description) transactionData.description = description.trim();
  if (bookingRef) transactionData.bookingRef = bookingRef.trim();
  if (product) transactionData.product = product.trim();
  if (redirect_url) transactionData.redirect_url = redirect_url.trim();
  
  // Add Revolut data if creating after payment order
  if (revolutData.checkout_url) transactionData.checkoutUrl = revolutData.checkout_url;
  if (revolutData.id) transactionData.revolutOrderId = revolutData.id;
  
  // Store complete Revolut response object
  if (revolutData && Object.keys(revolutData).length > 0) {
    transactionData.revolutData = revolutData;
  }
  
  return transactionData;
};

// Helper function to call Revolut API
const createRevolutOrder = async (amount, currency, redirect_url) => {
  const revolutKey = process.env.REVOLUT_SECRET_KEY;
  
  if (!revolutKey) {
    throw new Error('REVOLUT_SECRET_KEY is not configured. Please add it to your config.env file.');
  }

  // Determine environment (sandbox or live)
  const isTestMode = process.env.REVOLUT_TEST_MODE === 'true';
  const revolutBaseUrl = isTestMode
    ? (process.env.REVOLUT_BASE_URL_TEST || 'https://sandbox-merchant.revolut.com/api')
    : (process.env.REVOLUT_BASE_URL_LIVE || 'https://merchant.revolut.com/api');

  // Build order payload
  const orderPayload = {
    amount: convertToMinorUnits(amount),
    currency: currency.toUpperCase().trim()
  };

  if (redirect_url) {
    orderPayload.redirect_url = redirect_url.trim();
  }

  try {
    const response = await axios.post(
      `${revolutBaseUrl}/orders`,
      orderPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${revolutKey}`,
          'Revolut-Api-Version': process.env.REVOLUT_API_VERSION || '2024-09-01'
        }
      }
    );

    return response.data;
  } catch (error) {
    // Re-throw with more context
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      let message = 'Failed to create payment order with Revolut';
      if (statusCode === 401) {
        message = 'Revolut API authentication failed. Check your REVOLUT_SECRET_KEY.';
      } else if (statusCode === 400) {
        message = 'Invalid payment request. Check amount and currency values.';
      }
      
      const revolutError = new Error(message);
      revolutError.statusCode = statusCode;
      revolutError.data = errorData;
      throw revolutError;
    } else if (error.request) {
      const serviceError = new Error('Revolut payment service is unavailable');
      serviceError.statusCode = 503;
      throw serviceError;
    } else {
      throw error;
    }
  }
};

// Validate required transaction fields
const validateTransactionInput = (body) => {
  const { customerName, email, phone, amount, currency } = body;
  
  if (!customerName?.trim()) {
    return 'Customer name is required';
  }
  
  if (!email?.trim()) {
    return 'Email is required';
  }
  
  if (!phone?.trim()) {
    return 'Phone is required';
  }
  
  if (amount === undefined || amount === null) {
    return 'Amount is required';
  }
  
  if (typeof amount !== 'number' || amount <= 0) {
    return 'Amount must be a positive number';
  }
  
  if (!currency?.trim()) {
    return 'Currency is required';
  }
  
  const currencyUpper = currency.toUpperCase().trim();
  if (!SUPPORTED_CURRENCIES.includes(currencyUpper)) {
    return `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`;
  }
  
  return null;
};

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

    const transactions = await Transaction.find(filter).sort({ createdAt: -1 });

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
      message: 'Failed to fetch transactions'
    });
  }
};

// Get single transaction by ID
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Transaction ID is required'
      });
    }

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    // Build response with transaction and Revolut data
    const responseData = {
      transaction: {
        _id: transaction._id,
        customerName: transaction.customerName,
        email: transaction.email,
        phone: transaction.phone,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        bookingRef: transaction.bookingRef,
        product: transaction.product,
        redirect_url: transaction.redirect_url,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      }
    };

    // Include complete Revolut data if available
    if (transaction.revolutData) {
      responseData.revolut = transaction.revolutData;
    }

    res.status(200).json({
      status: 'success',
      data: responseData
    });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    
    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid transaction ID format'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transaction'
    });
  }
};

// Create a transaction with Revolut payment
const createTransaction = async (req, res) => {
  try {
    // Validate input
    const validationError = validateTransactionInput(req.body);
    if (validationError) {
      return res.status(400).json({
        status: 'error',
        message: validationError
      });
    }

    const { amount, currency, redirect_url } = req.body;

    // Create Revolut payment order
    let revolutData;
    try {
      revolutData = await createRevolutOrder(amount, currency, redirect_url);
    } catch (revolutError) {
      console.error('Revolut API error:', revolutError);
      
      return res.status(revolutError.statusCode || 500).json({
        status: 'error',
        message: revolutError.message,
        ...(revolutError.data && { error: revolutError.data })
      });
    }

    // Validate Revolut response
    if (!revolutData?.id) {
      console.error('Invalid Revolut response - missing order ID:', revolutData);
      return res.status(500).json({
        status: 'error',
        message: 'Invalid response from payment service'
      });
    }

    if (!revolutData?.checkout_url) {
      console.error('Invalid Revolut response - missing checkout URL:', revolutData);
      return res.status(500).json({
        status: 'error',
        message: 'Payment service did not return a checkout URL'
      });
    }

    // Create transaction record in database
    const transactionData = buildTransactionData(req.body, revolutData);
    const transaction = await Transaction.create(transactionData);

    // Return success response
    res.status(201).json({
      status: 'success',
      message: 'Transaction created successfully',
      data: {
        transaction: {
          _id: transaction._id,
          customerName: transaction.customerName,
          email: transaction.email,
          phone: transaction.phone,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          bookingRef: transaction.bookingRef,
          product: transaction.product,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        },
        payment: {
          orderId: revolutData.id,
          checkoutUrl: revolutData.checkout_url,
          state: revolutData.state,
          currency: revolutData.currency,
          amount: revolutData.amount
        }
      }
    });
  } catch (error) {
    console.error('Create transaction error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Transaction already exists'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create transaction',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// Update a transaction
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Transaction ID is required'
      });
    }

    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    const { customerName, email, phone, description, bookingRef, amount, currency, product, redirect_url } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (customerName) updateData.customerName = customerName.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (phone) updateData.phone = phone.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (bookingRef !== undefined) updateData.bookingRef = bookingRef?.trim();
    if (product !== undefined) updateData.product = product?.trim();
    if (redirect_url !== undefined) updateData.redirect_url = redirect_url?.trim();
    
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Amount must be a positive number'
        });
      }
      updateData.amount = amount;
    }
    
    if (currency) {
      const currencyUpper = currency.toUpperCase().trim();
      if (!SUPPORTED_CURRENCIES.includes(currencyUpper)) {
        return res.status(400).json({
          status: 'error',
          message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`
        });
      }
      updateData.currency = currencyUpper;
    }

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
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update transaction',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// Delete a transaction
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Transaction ID is required'
      });
    }

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
      message: 'Failed to delete transaction'
    });
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction
};
