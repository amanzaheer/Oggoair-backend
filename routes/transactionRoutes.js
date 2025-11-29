const express = require('express');
const router = express.Router();
const {
    getAllTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction
} = require('../controllers/transactionController');

// Get all transactions
router.get('/', getAllTransactions);

// Create a new transaction
router.post('/', createTransaction);

// Update transaction
router.put('/:id', updateTransaction);

// Delete transaction
router.delete('/:id', deleteTransaction);

module.exports = router;

