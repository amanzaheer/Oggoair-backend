const express = require('express');
const router = express.Router();
const {
    createPromotion,
    getAllPromotions,
    getPromotionById,
    updatePromotion,
    deletePromotion,
    togglePromotionStatus
} = require('../controllers/promotionController');

// Create a new promotion
router.post('/', createPromotion);

// Get all promotions with pagination and filtering
router.get('/', getAllPromotions);

// Get promotion by ID
router.get('/:id', getPromotionById);

// Update promotion
router.put('/:id', updatePromotion);

// Delete promotion
router.delete('/:id', deletePromotion);

// Toggle promotion status (activate/deactivate)
router.patch('/:id/toggle-status', togglePromotionStatus);

module.exports = router;
