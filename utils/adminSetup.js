// Admin user setup utility

const ensureDefaultAdmin = async () => {
  const User = require('../models/User');
  const Role = require('../models/Role');

  try {
    // Check if any admin user exists
    const existingAdmin = await User.findOne({ type: 'admin' });
    if (existingAdmin) {
      console.log('✓ Admin user exists:', existingAdmin.username);
      return;
    }

    // Get admin credentials from environment
    const adminFullName = process.env.ADMIN_FULLNAME || 'Administrator';
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@oggoair.com').toLowerCase();
    const adminPhone = process.env.ADMIN_PHONE || '+10000000000';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    // Check if user exists with these credentials
    const existingUser = await User.findOne({
      $or: [{ username: adminUsername }, { email: adminEmail }]
    });

    // Find or create admin role
    let adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'admin',
        permissions: [
          'readusers',
          'writeusers',
          'deleteusers',
          'addusers',
          'updateusers',
          'addbookings',
          'viewbookings',
          'deletebookings'
        ]
      });
      console.log('✓ Admin role created');
    }

    if (existingUser) {
      // Promote existing user to admin if not already
      if (existingUser.type !== 'admin') {
        existingUser.type = 'admin';
        existingUser.role = adminRole._id;
        await existingUser.save();
        console.log('✓ Promoted existing user to admin:', existingUser.username);
      } else {
        console.log('✓ Admin user already exists:', existingUser.username);
      }
      return;
    }

    // Create new admin user
    const admin = await User.create({
      fullName: adminFullName,
      username: adminUsername,
      email: adminEmail,
      phone: adminPhone,
      password: adminPassword,
      type: 'admin',
      role: adminRole._id
    });

    console.log('✓ Default admin created:', {
      username: admin.username,
      email: admin.email
    });
  } catch (error) {
    console.error('✗ Error ensuring default admin:', error.message);
  }
};

module.exports = { ensureDefaultAdmin };

