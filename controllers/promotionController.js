const Promotion = require('../models/Promotion');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/promotions';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'promotion-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware for single image upload
const uploadSingle = upload.single('image');

// Create a new promotion
const createPromotion = async (req, res) => {
    try {
        uploadSingle(req, res, async (err) => {
            if (err) {
                return res.status(400).json({
                    status: 'error',
                    message: err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Image is required'
                });
            }

            const { heading, subHeading, isActive = true } = req.body;

            // Validate required fields
            if (!heading || !subHeading) {
                // Delete uploaded file if validation fails
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    status: 'error',
                    message: 'Heading and sub-heading are required'
                });
            }

            const promotion = new Promotion({
                heading,
                subHeading,
                image: req.file.path,
                isActive: isActive === 'true' || isActive === true
            });

            await promotion.save();

            res.status(201).json({
                status: 'success',
                message: 'Promotion created successfully',
                data: promotion
            });
        });
    } catch (error) {
        // Delete uploaded file if error occurs
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            status: 'error',
            message: 'Error creating promotion',
            error: error.message
        });
    }
};

// Get all promotions
const getAllPromotions = async (req, res) => {
    try {
        const { isActive } = req.query;
        const query = {};

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const promotions = await Promotion.find(query)
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            message: 'Promotions retrieved successfully',
            data: promotions
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error retrieving promotions',
            error: error.message
        });
    }
};

// Get promotion by ID
const getPromotionById = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);

        if (!promotion) {
            return res.status(404).json({
                status: 'error',
                message: 'Promotion not found'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Promotion retrieved successfully',
            data: promotion
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error retrieving promotion',
            error: error.message
        });
    }
};

// Update promotion
const updatePromotion = async (req, res) => {
    try {
        uploadSingle(req, res, async (err) => {
            if (err) {
                return res.status(400).json({
                    status: 'error',
                    message: err.message
                });
            }

            const { heading, subHeading, isActive } = req.body;
            const promotionId = req.params.id;

            const promotion = await Promotion.findById(promotionId);
            if (!promotion) {
                // Delete uploaded file if promotion not found
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({
                    status: 'error',
                    message: 'Promotion not found'
                });
            }

            // Update fields
            if (heading) promotion.heading = heading;
            if (subHeading) promotion.subHeading = subHeading;
            if (isActive !== undefined) {
                promotion.isActive = isActive === 'true' || isActive === true;
            }

            // Handle image update
            if (req.file) {
                // Delete old image
                if (promotion.image && fs.existsSync(promotion.image)) {
                    fs.unlinkSync(promotion.image);
                }
                promotion.image = req.file.path;
            }

            await promotion.save();

            res.status(200).json({
                status: 'success',
                message: 'Promotion updated successfully',
                data: promotion
            });
        });
    } catch (error) {
        // Delete uploaded file if error occurs
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            status: 'error',
            message: 'Error updating promotion',
            error: error.message
        });
    }
};

// Delete promotion
const deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);

        if (!promotion) {
            return res.status(404).json({
                status: 'error',
                message: 'Promotion not found'
            });
        }

        // Delete associated image file
        if (promotion.image && fs.existsSync(promotion.image)) {
            fs.unlinkSync(promotion.image);
        }

        await Promotion.findByIdAndDelete(req.params.id);

        res.status(200).json({
            status: 'success',
            message: 'Promotion deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error deleting promotion',
            error: error.message
        });
    }
};

// Toggle promotion status
const togglePromotionStatus = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);

        if (!promotion) {
            return res.status(404).json({
                status: 'error',
                message: 'Promotion not found'
            });
        }

        promotion.isActive = !promotion.isActive;
        await promotion.save();

        res.status(200).json({
            status: 'success',
            message: `Promotion ${promotion.isActive ? 'activated' : 'deactivated'} successfully`,
            data: promotion
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error toggling promotion status',
            error: error.message
        });
    }
};

module.exports = {
    createPromotion,
    getAllPromotions,
    getPromotionById,
    updatePromotion,
    deletePromotion,
    togglePromotionStatus
};
