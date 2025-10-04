const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config({ path: './config.env' });

// Import routes
const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const roleRoutes = require('./routes/roleRoutes');
const permissionRoutes = require('./routes/permissionRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('MongoDB connected successfully');
    try {
      await ensureDefaultAdmin();
    } catch (err) {
      console.error('Error ensuring default admin:', err);
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Ensure there is at least one admin user
async function ensureDefaultAdmin() {
  const User = require('./models/User');

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log('Admin user exists:', existingAdmin.username);
    return;
  }

  const adminFullName = process.env.ADMIN_FULLNAME || 'Administrator';
  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@oggoair.com').toLowerCase();
  const adminPhone = process.env.ADMIN_PHONE || '+10000000000';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

  const UserModel = User; // alias for clarity

  const existingByUsernameOrEmail = await UserModel.findOne({
    $or: [{ username: adminUsername }, { email: adminEmail }]
  });

  if (existingByUsernameOrEmail) {
    // If a user exists with the intended creds but not admin, elevate to admin
    if (existingByUsernameOrEmail.role !== 'admin') {
      existingByUsernameOrEmail.role = 'admin';
      await existingByUsernameOrEmail.save();
      console.log('Promoted existing user to admin:', existingByUsernameOrEmail.username);
    } else {
      console.log('Admin user exists:', existingByUsernameOrEmail.username);
    }
    return;
  }

  const created = await UserModel.create({
    fullName: adminFullName,
    username: adminUsername,
    email: adminEmail,
    phone: adminPhone,
    password: adminPassword,
    role: 'admin'
  });

  console.log('Default admin created:', {
    username: created.username,
    email: created.email,
    password: adminPassword
  });
}


// Routes
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
