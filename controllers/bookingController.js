const PassengerBooking = require('../models/PassengerBooking');

// Create a new passenger booking
const createBooking = async (req, res) => {
    try {
        console.log('Creating booking with data:', req.body);
        const { email, phone, passengers, notes, flightData } = req.body;

        // Validate that at least one passenger is provided
        if (!passengers || passengers.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'At least one passenger is required'
            });
        }

        // Validate passenger data
        for (let i = 0; i < passengers.length; i++) {
            const passenger = passengers[i];
            if (!passenger.title || !passenger.firstName || !passenger.lastName) {
                return res.status(400).json({
                    status: 'error',
                    message: `Passenger ${i + 1}: Title, first name, and last name are required`
                });
            }
            if (!passenger.dateOfBirth || !passenger.dateOfBirth.day || !passenger.dateOfBirth.month || !passenger.dateOfBirth.year) {
                return res.status(400).json({
                    status: 'error',
                    message: `Passenger ${i + 1}: Complete date of birth is required`
                });
            }
            if (!passenger.countryOfResidence || !passenger.passportNumber) {
                return res.status(400).json({
                    status: 'error',
                    message: `Passenger ${i + 1}: Country of residence and passport number are required`
                });
            }
            if (!passenger.passportExpiry || !passenger.passportExpiry.day || !passenger.passportExpiry.month || !passenger.passportExpiry.year) {
                return res.status(400).json({
                    status: 'error',
                    message: `Passenger ${i + 1}: Complete passport expiry date is required`
                });
            }
        }

        console.log('Creating booking for user:', req.user._id);
        const booking = await PassengerBooking.create({
            user: req.user._id,
            email,
            phone,
            passengers,
            notes,
            flightData
        });
        console.log('Booking created successfully:', booking.bookingReference);

        res.status(201).json({
            status: 'success',
            message: 'Passenger booking created successfully',
            data: {
                booking: booking.summary,
                passengers: booking.passengers
            }
        });
    } catch (error) {
        console.error('Create booking error:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            status: 'error',
            message: 'Error creating passenger booking',
            error: error.message
        });
    }
};

// Get all bookings for the current user
const getMyBookings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { user: req.user._id };
        if (req.query.status) filter.bookingStatus = req.query.status;

        const bookings = await PassengerBooking.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await PassengerBooking.countDocuments(filter);

        res.status(200).json({
            status: 'success',
            data: {
                bookings,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching bookings'
        });
    }
};

// Get all bookings (admin only)
const getAllBookings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) filter.bookingStatus = req.query.status;
        if (req.query.user) filter.user = req.query.user;
        if (req.query.search) {
            filter.$or = [
                { bookingReference: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } },
                { 'passengers.firstName': { $regex: req.query.search, $options: 'i' } },
                { 'passengers.lastName': { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const bookings = await PassengerBooking.find(filter)
            .populate('user', 'fullName username email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await PassengerBooking.countDocuments(filter);

        res.status(200).json({
            status: 'success',
            data: {
                bookings,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all bookings error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching all bookings'
        });
    }
};

// Get booking by ID
const getBookingById = async (req, res) => {
    try {
        const booking = await PassengerBooking.findById(req.params.id)
            .populate('user', 'fullName username email');

        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking not found'
            });
        }

        // Check if user can access this booking
        if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'You can only view your own bookings'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                booking
            }
        });
    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching booking'
        });
    }
};

// Get booking by reference
const getBookingByReference = async (req, res) => {
    try {
        const booking = await PassengerBooking.findByReference(req.params.reference)
            .populate('user', 'fullName username email');

        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking not found'
            });
        }

        // Check if user can access this booking
        if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'You can only view your own bookings'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                booking
            }
        });
    } catch (error) {
        console.error('Get booking by reference error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching booking'
        });
    }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const bookingId = req.params.id;

        const booking = await PassengerBooking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking not found'
            });
        }

        // Check if user can update this booking
        if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'You can only update your own bookings'
            });
        }

        // Regular users can only cancel their own bookings
        if (req.user.role !== 'admin' && status !== 'cancelled') {
            return res.status(403).json({
                status: 'error',
                message: 'You can only cancel your bookings'
            });
        }

        // Check if booking can be cancelled
        if (status === 'cancelled' && !booking.canBeCancelled()) {
            return res.status(400).json({
                status: 'error',
                message: 'This booking cannot be cancelled'
            });
        }

        booking.bookingStatus = status;
        await booking.save();

        res.status(200).json({
            status: 'success',
            message: 'Booking status updated successfully',
            data: {
                booking: booking.summary
            }
        });
    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error updating booking status'
        });
    }
};

// Update booking details
const updateBooking = async (req, res) => {
    try {
        const { email, phone, passengers, notes, flightData } = req.body;
        const bookingId = req.params.id;

        const booking = await PassengerBooking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking not found'
            });
        }

        // Check if user can update this booking
        if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'You can only update your own bookings'
            });
        }

        // Check if booking can be updated
        if (booking.bookingStatus === 'cancelled') {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot update cancelled booking'
            });
        }

        // Update fields
        if (email) booking.email = email;
        if (phone) booking.phone = phone;
        if (passengers) booking.passengers = passengers;
        if (notes !== undefined) booking.notes = notes;
        if (flightData !== undefined) booking.flightData = flightData;

        await booking.save();

        res.status(200).json({
            status: 'success',
            message: 'Booking updated successfully',
            data: {
                booking: booking.summary,
                passengers: booking.passengers
            }
        });
    } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error updating booking'
        });
    }
};

// Delete booking
const deleteBooking = async (req, res) => {
    try {
        const booking = await PassengerBooking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking not found'
            });
        }

        // Check if user can delete this booking
        if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'You can only delete your own bookings'
            });
        }

        // Check if booking can be deleted
        if (booking.bookingStatus === 'confirmed') {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot delete confirmed booking. Please cancel it first.'
            });
        }

        await PassengerBooking.findByIdAndDelete(req.params.id);

        res.status(200).json({
            status: 'success',
            message: 'Booking deleted successfully'
        });
    } catch (error) {
        console.error('Delete booking error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error deleting booking'
        });
    }
};

// Get booking statistics
const getBookingStats = async (req, res) => {
    try {
        const stats = await PassengerBooking.aggregate([
            {
                $group: {
                    _id: null,
                    totalBookings: { $sum: 1 },
                    pendingBookings: {
                        $sum: { $cond: [{ $eq: ['$bookingStatus', 'pending'] }, 1, 0] }
                    },
                    confirmedBookings: {
                        $sum: { $cond: [{ $eq: ['$bookingStatus', 'confirmed'] }, 1, 0] }
                    },
                    cancelledBookings: {
                        $sum: { $cond: [{ $eq: ['$bookingStatus', 'cancelled'] }, 1, 0] }
                    },
                    totalPassengers: { $sum: { $size: '$passengers' } }
                }
            }
        ]);

        const passengerTypeStats = await PassengerBooking.aggregate([
            { $unwind: '$passengers' },
            {
                $group: {
                    _id: '$passengers.passengerType',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                overview: stats[0] || {
                    totalBookings: 0,
                    pendingBookings: 0,
                    confirmedBookings: 0,
                    cancelledBookings: 0,
                    totalPassengers: 0
                },
                passengerTypes: passengerTypeStats
            }
        });
    } catch (error) {
        console.error('Get booking stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching booking statistics'
        });
    }
};

module.exports = {
    createBooking,
    getMyBookings,
    getAllBookings,
    getBookingById,
    getBookingByReference,
    updateBookingStatus,
    updateBooking,
    deleteBooking,
    getBookingStats
};
