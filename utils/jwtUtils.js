const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Generate refresh token (optional for future use)
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Verify token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

// Decode token without verification (for getting payload)
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken
};
