const User = require('../models/User');
const Role = require('../models/Role');
const OTP = require('../models/OTP');
const { generateToken, generateRefreshToken, verifyToken } = require('../utils/jwtUtils');
const { sendOTPEmail } = require('../utils/emailService');

// Register a new user (sends OTP for verification)
const signup = async (req, res) => {
  try {
    const { fullName, username, email, phone, password, role } = req.body;
    const type = req.query.type || 'customer'; // Get type from query parameter, default to customer

    // Validate type
    if (!['customer', 'admin'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid type. Must be either "customer" or "admin"'
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({
        status: 'error',
        message: 'Username already exists. Please choose a different username.'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered. Please use a different email or login.'
      });
    }

    // If type is admin, role is required
    if (type === 'admin') {
      if (!role) {
        return res.status(400).json({
          status: 'error',
          message: 'Role is required for admin type'
        });
      }

      // Validate role exists
      const roleDoc = await Role.findById(role);
      if (!roleDoc) {
        return res.status(400).json({
          status: 'error',
          message: 'Role not found'
        });
      }
    }

    // Store user data temporarily in OTP record
    const signupData = {
      fullName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      phone,
      password,
      type: type,
      role: type === 'admin' ? role : null
    };

    // Generate and store OTP
    const otpRecord = await OTP.createOTP(email.toLowerCase(), 'registration', signupData);

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otpRecord.otp);

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to your email. Please verify to complete registration.',
      data: {
        email: email.toLowerCase(),
        expiresIn: '10 minutes'
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Error processing signup request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify OTP and complete signup
const verifySignupOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate required fields
    if (!email || !otp) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and OTP are required'
      });
    }

    console.log('Verifying OTP and creating user');

    // Find valid OTP
    const otpRecord = await OTP.findValidOTP(email.toLowerCase(), 'registration');

    if (!otpRecord) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP. Please request a new OTP.'
      });
    }

    // Verify OTP
    const verification = otpRecord.verifyOTP(otp);
    if (!verification.valid) {
      return res.status(400).json({
        status: 'error',
        message: verification.message
      });
    }

    // Get signup data from OTP record
    const signupData = otpRecord.userData;

    // Double-check username and email are still unique (race condition protection)
    const existingUser = await User.findOne({
      $or: [
        { username: signupData.username },
        { email: signupData.email }
      ]
    });

    if (existingUser) {
      await OTP.findByIdAndDelete(otpRecord._id);
      return res.status(400).json({
        status: 'error',
        message: existingUser.username === signupData.username
          ? 'Username already exists'
          : 'Email already registered'
      });
    }

    // Create user
    const user = await User.create({
      fullName: signupData.fullName,
      username: signupData.username,
      email: signupData.email,
      phone: signupData.phone,
      password: signupData.password,
      type: signupData.type,
      role: signupData.role,
      isEmailVerified: true // Mark email as verified since they verified OTP
    });

    // Generate token
    const token = generateToken(user._id);
    await user.updateLastLogin();

    // Populate the role to get full role object
    const userWithRole = await User.findById(user._id)
      .populate('role', 'name permissions')
      .select('-password -refreshToken');

    // Delete the used OTP record
    await OTP.findByIdAndDelete(otpRecord._id);

    res.status(201).json({
      status: 'success',
      message: 'Registration successful! Welcome to Oggoair.',
      data: {
        user: userWithRole.profile,
        token
      }
    });

  } catch (error) {
    console.error('Verify signup OTP error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Error completing registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findByUsernameOrEmail(username);

    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials or account deactivated'
      });
    }

    const isPasswordCorrect = await user.correctPassword(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await user.updateLastLogin();
    await user.updateRefreshToken(refreshToken);

    // Populate the role to get full role object
    const userWithRole = await User.findById(user._id)
      .populate('role', 'name permissions')
      .select('-password -refreshToken');

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: userWithRole.profile,
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error during login'
    });
  }
};

// Get current user profile
const getMe = async (req, res) => {
  try {
    // Populate role for current user
    const user = await User.findById(req.user._id)
      .populate('role', 'name permissions')
      .select('+refreshToken');

    // Generate new access token
    const token = generateToken(user._id);

    res.status(200).json({
      status: 'success',
      data: {
        user: user.profile,
        token,
        refreshToken: user.refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user profile'
    });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { fullName: { $regex: req.query.search, $options: 'i' } },
        { username: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .populate('role', 'name permissions')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        users: users.map(user => user.profile),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users'
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('role', 'name permissions')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: user.profile
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user'
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { fullName, email, phone, isActive } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own profile'
      });
    }

    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already exists'
        });
      }
    }

    const updateData = { fullName, email, phone };
    // Only admin can update isActive
    if (req.user.type === 'admin') {
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('role', 'name permissions')
      .select('-password');

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: {
        user: updatedUser.profile
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating user'
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error deleting user'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error changing password'
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    console.log('=== Refresh Token Debug ===');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('Content-Type header:', req.headers['content-type']);

    const { refreshToken } = req.body;


    if (!refreshToken) {
      console.log('ERROR: No refresh token found in request body');
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token'
      });
    }

    // Find user with this refresh token
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found or account deactivated'
      });
    }

    // Check if refresh token matches
    if (user.refreshToken !== refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Update refresh token in database
    await user.updateRefreshToken(newRefreshToken);

    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error refreshing token'
    });
  }
};

// Logout (clear refresh token)
const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      await user.clearRefreshToken();
    }

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error during logout'
    });
  }
};

module.exports = {
  signup,
  verifySignupOTP,
  login,
  getMe,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  refreshToken,
  logout
};
