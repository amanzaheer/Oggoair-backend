const User = require('../models/User');
const Role = require('../models/Role');
const { generateToken, generateRefreshToken, verifyToken } = require('../utils/jwtUtils');

// Register a new user
const signup = async (req, res) => {
  try {
    const { fullName, username, email, phone, password, role, assignedRole } = req.body;

    const existingUser = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: existingUser.username === username.toLowerCase()
          ? 'Username already exists'
          : 'Email already exists'
      });
    }

    // If assignedRole provided, validate it exists and is active
    let assignedRoleId = null;
    if (assignedRole) {
      const roleDoc = await Role.findById(assignedRole);
      if (!roleDoc) {
        return res.status(400).json({
          status: 'error',
          message: 'Assigned role not found'
        });
      }
      if (!roleDoc.isActive) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot assign inactive role to user'
        });
      }
      assignedRoleId = roleDoc._id;
    }

    const user = await User.create({
      fullName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      phone,
      password,
      role: role || 'user',
      assignedRole: assignedRoleId
    });

    const token = generateToken(user._id);
    await user.updateLastLogin();

    // Populate the assignedRole to get full role object
    const userWithRole = await User.findById(user._id)
      .populate('assignedRole', 'name displayName description permissions isActive isSystemRole')
      .select('-password -refreshToken');

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: userWithRole.profile,
        token
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating user'
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

    // Populate the assignedRole to get full role object
    const userWithRole = await User.findById(user._id)
      .populate('assignedRole', 'name displayName description permissions isActive isSystemRole')
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
    // Populate assigned role for current user
    const user = await User.findById(req.user._id)
      .populate('assignedRole', 'name displayName description permissions isActive isSystemRole')
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
      .populate('assignedRole', 'name displayName description permissions isActive isSystemRole')
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
      .populate('assignedRole', 'name displayName description permissions isActive isSystemRole')
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
    const { fullName, email, phone, role, isActive, assignedRole } = req.body;
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
    // Allow updating assignedRole if provided and requester is admin
    if (req.user.role === 'admin' && assignedRole !== undefined) {
      const roleDoc = await Role.findById(assignedRole);
      if (!roleDoc) {
        return res.status(400).json({ status: 'error', message: 'Assigned role not found' });
      }
      if (!roleDoc.isActive) {
        return res.status(400).json({ status: 'error', message: 'Cannot assign inactive role to user' });
      }
      updateData.assignedRole = roleDoc._id;
    }
    if (req.user.role === 'admin') {
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedRole', 'name displayName description permissions isActive isSystemRole')
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
