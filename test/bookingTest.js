const axios = require('axios');

// Base URL for your API
const BASE_URL = 'http://localhost:5000/api';

// Test data for passenger booking
const testBookingData = {
    email: 'khurramiqbal2449@gmail.com',
    phone: {
        dialingCode: '+351',
        number: '919998598'
    },
    passengers: [
        {
            title: 'Mr',
            firstName: 'KHURRAM',
            lastName: 'IQBAL',
            dateOfBirth: {
                day: 15,
                month: 6,
                year: 1990
            },
            countryOfResidence: 'Netherlands',
            passportNumber: '9333',
            passportExpiry: {
                day: 15,
                month: 6,
                year: 2030
            },
            saveToProfile: true
        },
        {
            title: 'Mr',
            firstName: 'KHURRAM',
            lastName: 'IQBAL',
            dateOfBirth: {
                day: 10,
                month: 3,
                year: 2015
            },
            countryOfResidence: 'Netherlands',
            passportNumber: '9833',
            passportExpiry: {
                day: 10,
                month: 3,
                year: 2025
            },
            saveToProfile: true
        }
    ],
    notes: 'Test booking for multiple passengers'
};

// Function to test the booking API
async function testBookingAPI() {
    try {
        console.log('🚀 Testing Passenger Booking API...\n');

        // First, you need to login to get a token
        console.log('1. Login to get authentication token...');
        const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
            username: 'your_username', // Replace with actual username
            password: 'your_password'  // Replace with actual password
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Login successful\n');

        // Set up axios with authentication header
        const api = axios.create({
            baseURL: BASE_URL,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Test 1: Create a new booking
        console.log('2. Creating a new passenger booking...');
        const createResponse = await api.post('/bookings', testBookingData);
        console.log('✅ Booking created successfully!');
        console.log('Booking Reference:', createResponse.data.data.booking.bookingReference);
        console.log('Passenger Count:', createResponse.data.data.booking.passengerCount);
        console.log('Status:', createResponse.data.data.booking.status);
        console.log('');

        const bookingId = createResponse.data.data.booking._id;
        const bookingReference = createResponse.data.data.booking.bookingReference;

        // Test 2: Get booking by ID
        console.log('3. Getting booking by ID...');
        const getByIdResponse = await api.get(`/bookings/${bookingId}`);
        console.log('✅ Booking retrieved successfully!');
        console.log('Passengers:', getByIdResponse.data.data.booking.passengers.length);
        console.log('');

        // Test 3: Get booking by reference
        console.log('4. Getting booking by reference...');
        const getByRefResponse = await api.get(`/bookings/reference/${bookingReference}`);
        console.log('✅ Booking retrieved by reference successfully!');
        console.log('');

        // Test 4: Get user's bookings
        console.log('5. Getting user\'s bookings...');
        const myBookingsResponse = await api.get('/bookings/my-bookings');
        console.log('✅ User bookings retrieved successfully!');
        console.log('Total bookings:', myBookingsResponse.data.data.pagination.total);
        console.log('');

        // Test 5: Update booking status
        console.log('6. Updating booking status to confirmed...');
        const updateStatusResponse = await api.patch(`/bookings/${bookingId}/status`, {
            status: 'confirmed'
        });
        console.log('✅ Booking status updated successfully!');
        console.log('New status:', updateStatusResponse.data.data.booking.status);
        console.log('');

        // Test 6: Update booking details
        console.log('7. Updating booking details...');
        const updateResponse = await api.put(`/bookings/${bookingId}`, {
            notes: 'Updated notes for the booking'
        });
        console.log('✅ Booking updated successfully!');
        console.log('');

        // Test 7: Get booking statistics (admin only)
        console.log('8. Getting booking statistics...');
        try {
            const statsResponse = await api.get('/bookings/stats/overview');
            console.log('✅ Booking statistics retrieved successfully!');
            console.log('Total bookings:', statsResponse.data.data.overview.totalBookings);
            console.log('Total passengers:', statsResponse.data.data.overview.totalPassengers);
        } catch (error) {
            console.log('❌ Statistics endpoint requires admin access');
        }
        console.log('');

        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Example of how to create a single passenger booking
async function testSinglePassengerBooking() {
    try {
        console.log('🚀 Testing Single Passenger Booking...\n');

        // Login first
        const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
            username: 'your_username',
            password: 'your_password'
        });

        const token = loginResponse.data.data.token;
        const api = axios.create({
            baseURL: BASE_URL,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Single passenger booking data
        const singlePassengerData = {
            email: 'test@example.com',
            phone: {
                dialingCode: '+31',
                number: '93908590'
            },
            passengers: [
                {
                    title: 'Mr',
                    firstName: 'JOHN',
                    lastName: 'DOE',
                    dateOfBirth: {
                        day: 1,
                        month: 1,
                        year: 1985
                    },
                    countryOfResidence: 'Netherlands',
                    passportNumber: '123456789',
                    passportExpiry: {
                        day: 1,
                        month: 1,
                        year: 2030
                    },
                    saveToProfile: true
                }
            ],
            notes: 'Single passenger booking test'
        };

        console.log('Creating single passenger booking...');
        const response = await api.post('/bookings', singlePassengerData);
        console.log('✅ Single passenger booking created successfully!');
        console.log('Booking Reference:', response.data.data.booking.bookingReference);
        console.log('Passenger Type:', response.data.data.passengers[0].passengerType);
        console.log('Age:', response.data.data.passengers[0].age);

    } catch (error) {
        console.error('❌ Single passenger test failed:', error.response?.data || error.message);
    }
}

// Run the tests
if (require.main === module) {
    console.log('📋 Passenger Booking API Test Suite');
    console.log('=====================================\n');

    // Uncomment the test you want to run:
    // testBookingAPI();
    // testSinglePassengerBooking();

    console.log('To run the tests, uncomment the desired test function in this file.');
    console.log('Make sure to update the login credentials with actual values.');
}

module.exports = {
    testBookingAPI,
    testSinglePassengerBooking
};
