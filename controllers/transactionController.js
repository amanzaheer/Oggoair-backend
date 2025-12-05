const Transaction = require('../models/Transaction');
const axios = require('axios');

// Helper function to convert amount to minor currency units (cents/pence)
// Revolut API expects amounts in minor units (e.g., 50000 cents for $500.00)
// Most currencies: 100 minor units = 1 major unit (USD, EUR, GBP, etc.)
// Some currencies: 1 minor unit = 1 major unit (JPY, KRW, etc.)
// Some currencies: 1000 minor units = 1 major unit (BHD, JOD, etc.)
const convertToMinorUnits = (amount, currency) => {
  const currencyUpper = currency.toUpperCase().trim();

  // Currencies with 0 decimal places (1:1 ratio)
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'UGX', 'VUV', 'XAF', 'XOF', 'XPF'];
  if (zeroDecimalCurrencies.includes(currencyUpper)) {
    return Math.round(amount);
  }

  // Currencies with 3 decimal places (1000:1 ratio)
  const threeDecimalCurrencies = ['BHD', 'JOD', 'KWD', 'OMR', 'TND'];
  if (threeDecimalCurrencies.includes(currencyUpper)) {
    return Math.round(amount * 1000);
  }

  // Default: 2 decimal places (100:1 ratio) - USD, EUR, GBP, etc.
  return Math.round(amount * 100);
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
    const { customerName, email, phone, description, bookingRef, amount, currency, product } = req.body;

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

    // Decide which Revolut environment to use:
    // - Prefer REVOLUT_TEST_MODE env
    // - Allow overriding via query param: /transactions?test=true
    const isTestMode =
      process.env.REVOLUT_TEST_MODE === 'true' ||
      process.env.REVOLUT_TEST_MODE === '1' ||
      req.query.test === 'true' ||
      req.query.mode === 'test';

    // Allow overriding base URLs via env, but provide sensible defaults
    // Sandbox: https://sandbox-merchant.revolut.com/api
    // Live: https://merchant.revolut.com/api
    const revolutBaseUrl = isTestMode
      ? (process.env.REVOLUT_BASE_URL_TEST || 'https://sandbox-merchant.revolut.com/api')
      : (process.env.REVOLUT_BASE_URL_LIVE || 'https://merchant.revolut.com/api');

    const revolutKey = process.env.REVOLUT_SECRET_KEY;

    // If key is missing
    const isKeyMissing = !revolutKey;

    if (isKeyMissing) {
      if (isTestMode) {
        // In test mode we allow missing key and generate a mock payment/checkout URL
        // Note: This is a placeholder URL for testing. It will not work as a real checkout page.
        // In production, use a real Revolut API key to get actual checkout URLs.
        const mockId = `test_${Date.now().toString(16)}`;
        const mockToken = `mock_${Date.now().toString(16)}`;
        // Use Revolut's actual checkout URL format for consistency (but it won't work with mock IDs)
        const checkoutUrl = `https://checkout.revolut.com/payment-link/${mockToken}`;

        const transactionData = {
          customerName: customerName.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          description: description?.trim(),
          bookingRef: bookingRef.trim(),
          amount,
          currency: currency.toUpperCase().trim(),
          checkoutUrl,
          revolutOrderId: mockId
        };

        // Include product if provided in request (even if empty string)
        if (product !== undefined) {
          transactionData.product = typeof product === 'string' ? product.trim() : product;
        }

        const transaction = await Transaction.create(transactionData);

        // Create mock Revolut response object matching real API structure
        const mockRevolutResponse = {
          id: mockId,
          token: mockToken,
          type: 'payment',
          state: 'PENDING',
          amount: amount,
          currency: currency.toUpperCase().trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          checkout_url: checkoutUrl,
          // Note: This is a mock URL for testing. Real checkout URLs come from Revolut API.
          _note: 'Test mode: This checkout URL is a placeholder and will not work. Use a real Revolut API key for functional checkout URLs.'
        };

        // Remove checkoutUrl and revolutOrderId from transaction object to avoid duplication
        const { checkoutUrl: _, revolutOrderId: __, ...transactionWithoutDuplicates } = transaction.toObject();

        return res.status(201).json({
          message: 'Transaction created successfully (mock Revolut payment in test mode)',
          transaction: transactionWithoutDuplicates,
          revolut: mockRevolutResponse
        });
      }

      // In live mode we require a valid key
      console.error('REVOLUT_SECRET_KEY is not configured in environment variables');
      return res.status(500).json({
        status: 'error',
        message: 'Payment service configuration error',
        details: 'REVOLUT_SECRET_KEY is missing or not set. Please add your Revolut API key to config.env file, or set REVOLUT_TEST_MODE=true for development testing.'
      });
    }


    // Convert amount to minor currency units (cents/pence) as required by Revolut API
    // Example: $500.00 → 50000 cents, €100.00 → 10000 cents
    const amountInMinorUnits = convertToMinorUnits(amount, currency);

    let revolutResponse;
    try {
      revolutResponse = await axios.post(
        // Endpoint: https://merchant.revolut.com/api/orders
        // Or: https://sandbox-merchant.revolut.com/api/orders for sandbox
        `${revolutBaseUrl}/orders`,
        {
          amount: amountInMinorUnits,
          currency: currency.toUpperCase().trim(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env.REVOLUT_SECRET_KEY}`,

            'Revolut-Api-Version': process.env.REVOLUT_API_VERSION || '2023-09-01'
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

    // Revolut API response includes: id, token, checkout_url, amount, currency, state, etc.
    // The checkout_url is provided by Revolut in format: https://checkout.revolut.com/payment-link/{token}
    const revolutData = revolutResponse.data || {};
    const revolutPaymentId = revolutData.id || revolutData._id;
    const checkoutUrl = revolutData.checkout_url;

    if (!revolutPaymentId) {
      console.error('Invalid Revolut response, missing id:', revolutResponse.data);
      return res.status(500).json({
        status: 'error',
        message: 'Invalid response from payment service',
        error: 'Missing payment id in response'
      });
    }

    if (!checkoutUrl) {
      console.error('Invalid Revolut response, missing checkout_url:', revolutResponse.data);
      return res.status(500).json({
        status: 'error',
        message: 'Invalid response from payment service',
        error: 'Missing checkout_url in response. Revolut API should always return checkout_url.'
      });
    }

    const revolutOrderId = revolutPaymentId;

    // Store full Revolut response for return (checkout_url is already included in the response)
    // Handle both axios response structure and direct response
    const fullRevolutResponse = revolutResponse?.data || revolutResponse || {};

    // Log for debugging in production
    console.log('Revolut API Response:', JSON.stringify(fullRevolutResponse, null, 2));
    console.log('Checkout URL from Revolut:', checkoutUrl);

    // Create transaction with Revolut data
    const transactionData = {
      customerName: customerName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      description: description?.trim(),
      bookingRef: bookingRef.trim(),
      amount,
      currency: currency.toUpperCase().trim(),
      checkoutUrl,
      revolutOrderId
    };

    // Include product if provided in request (even if empty string)
    if (product !== undefined) {
      transactionData.product = typeof product === 'string' ? product.trim() : product;
    }

    const transaction = await Transaction.create(transactionData);

    // Remove checkoutUrl and revolutOrderId from transaction object to avoid duplication
    const { checkoutUrl: _, revolutOrderId: __, ...transactionWithoutDuplicates } = transaction.toObject();

    // Ensure revolut object is always included in response
    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: transactionWithoutDuplicates,
      revolut: fullRevolutResponse
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
    const { customerName, email, phone, description, bookingRef, amount, currency, product } = req.body;

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
    if (product !== undefined) updateData.product = product?.trim();

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

