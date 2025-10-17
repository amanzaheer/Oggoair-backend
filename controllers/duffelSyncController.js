const DuffelOrder = require('../models/DuffelOrder');
const PassengerBooking = require('../models/PassengerBooking');
const { listOrders } = require('../utils/duffelClient');

async function syncDuffelOrders(req, res) {
    try {
        const pageLimit = parseInt(req.query.limit, 10) || 50;
        let after = req.query.after || undefined;
        let totalFetched = 0;
        let totalUpserted = 0;
        let bookingsCreated = 0;

        // Clear existing local booking data as requested
        await PassengerBooking.deleteMany({});

        while (true) {
            const params = { limit: pageLimit };
            if (after) params.after = after;

            const response = await listOrders(params);
            const orders = response && response.data ? response.data : [];
            const meta = response && response.meta ? response.meta : {};

            totalFetched += orders.length;

            for (const order of orders) {
                const duffelOrderId = order.id;
                const bookingReference = order.booking_reference || null;
                const status = order.status || null;
                const totalAmount = order.total_amount || null;
                const currency = order.total_currency || null;
                const passengerNames = Array.isArray(order.passengers)
                    ? order.passengers.map(p => [p.given_name, p.family_name].filter(Boolean).join(' ').trim()).filter(Boolean)
                    : [];

                const upsert = await DuffelOrder.findOneAndUpdate(
                    { duffelOrderId },
                    {
                        duffelOrderId,
                        bookingReference,
                        status,
                        totalAmount,
                        currency,
                        passengerNames,
                        data: order,
                        lastSyncedAt: new Date()
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                if (upsert) totalUpserted += 1;

                // Map Duffel order to PassengerBooking
                // Ensure email matches schema regex (TLD 2-3 chars)
                const rawEmail = (order.booking_contact && order.booking_contact.email)
                    || order.customer_email
                    || '';
                const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
                const contactEmail = emailRegex.test(rawEmail)
                    ? rawEmail
                    : 'N/A';

                const contactPhoneRaw = (order.booking_contact && (order.booking_contact.phone_number || order.booking_contact.phone)) || '';
                const phoneDigits = String(contactPhoneRaw || '').replace(/[^0-9+]/g, '');
                const dialingCode = phoneDigits.startsWith('+') ? phoneDigits.slice(0, 4) : '+000';
                const number = phoneDigits.startsWith('+') ? phoneDigits.slice(4) : (phoneDigits || '000000000');

                const passengers = Array.isArray(order.passengers) ? order.passengers
                    .map(p => {
                        const born = p.born_on ? String(p.born_on) : null; // YYYY-MM-DD
                        if (!born) return null; // require DOB to satisfy schema
                        const [year, month, day] = born.split('-').map(v => parseInt(v, 10));
                        const title = p.title && ['Mr', 'Mrs', 'Ms'].includes(p.title) ? p.title : 'Mr';
                        return {
                            title,
                            firstName: p.given_name || 'Unknown',
                            lastName: p.family_name || 'Unknown',
                            dateOfBirth: { day: day || 1, month: month || 1, year: year || 1990 },
                            countryOfResidence: (p.loyalty_programme_accounts && p.loyalty_programme_accounts[0] && p.loyalty_programme_accounts[0].airline_iata_code) || 'N/A',
                            passportNumber: 'N/A',
                            passportExpiry: { day: 1, month: 1, year: new Date().getFullYear() + 5 },
                            saveToProfile: false
                        };
                    })
                    .filter(Boolean) : [];

                if (passengers.length > 0) {
                    // Create booking linked to the user who triggered the sync (admin)
                    await PassengerBooking.create({
                        user: req.user._id,
                        bookingReference: bookingReference || undefined,
                        email: contactEmail,
                        phone: { dialingCode, number },
                        passengers,
                        bookingStatus: status === 'cancelled' ? 'cancelled' : (status === 'confirmed' ? 'confirmed' : 'pending'),
                        notes: undefined,
                        flightData: order, // keep full order for reference
                        extraServices: null
                    });
                    bookingsCreated += 1;
                }
            }

            if (!meta || !meta.after) break;
            after = meta.after;
        }

        return res.status(200).json({
            status: 'success',
            message: 'Duffel orders synced successfully and local bookings rebuilt',
            data: { totalFetched, totalUpserted, bookingsCreated }
        });
    } catch (error) {
        console.error('Duffel orders sync error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to sync Duffel orders',
            error: error.message
        });
    }
}

module.exports = {
    syncDuffelOrders
};


