const User = require('../models/User');
const Role = require('../models/Role');
const OTP = require('../models/OTP');
const { generateToken, generateRefreshToken, verifyToken } = require('../utils/jwtUtils');
const { sendOTPEmail } = require('../utils/emailService');

// Send OTP for login or registration (unified endpoint)
const signup = async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    const isLogin = !!existingUser;

    // If new user, require firstName and lastName
    if (!isLogin && (!firstName || !lastName)) {
      return res.status(400).json({
        status: 'error',
        message: 'First name and last name are required for new users'
      });
    }

    // Prepare data to store with OTP
    const otpData = {
      email: email.toLowerCase(),
      isLogin,
      firstName: firstName?.trim(),
      lastName: lastName?.trim()
    };

    // Generate and store OTP
    const otpRecord = await OTP.createOTP(email.toLowerCase(), isLogin ? 'login' : 'registration', otpData);

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
      message: `OTP sent to your email for ${isLogin ? 'login' : 'registration'}`,
      data: {
        email: email.toLowerCase(),
        isLogin,
        expiresIn: '3 minutes'
      }
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Error sending OTP',
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

    console.log('Verifying OTP for:', email);

    // Find valid OTP for either login or registration
    let otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      isVerified: false
    }).sort({ createdAt: -1 });

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

    const { isLogin, firstName, lastName } = otpRecord.userData;
    let user;

    if (isLogin) {
      // Existing user - login
      user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        await OTP.findByIdAndDelete(otpRecord._id);
        return res.status(400).json({
          status: 'error',
          message: 'User not found'
        });
      }

      console.log('User logged in:', user.email);
    } else {
      // New user - registration
      const fullName = `${firstName} ${lastName}`;

      user = await User.create({
        fullName,
        email: email.toLowerCase(),
        type: 'customer',
        role: null
      });

      console.log('New user created:', user.email);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Populate the role to get full role object
    const userWithRole = await User.findById(user._id)
      .populate('role', 'name permissions')
      .select('-password -refreshToken');

    // Delete the used OTP record
    await OTP.findByIdAndDelete(otpRecord._id);

    res.status(isLogin ? 200 : 201).json({
      status: 'success',
      message: isLogin ? 'Login successful!' : 'Registration successful! You are now logged in.',
      data: {
        user: userWithRole.profile,
        token,
        refreshToken
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

    // Filter by type (admin or customer)
    if (req.query.type && ['admin', 'customer'].includes(req.query.type)) {
      filter.type = req.query.type;
    }

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

// Check if email exists
const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    // Check if email exists in database
    const user = await User.findOne({ email: email.toLowerCase() });

    res.status(200).json({
      accountExists: !!user
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error checking email'
    });
  }
};

module.exports = {
  signup,
  verifySignupOTP,
  login,
  checkEmail,
  getMe,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  refreshToken,
  logout
};
