// Centralized validation utilities

const validatePassengerData = (passengers) => {
  if (!passengers || passengers.length === 0) {
    return { valid: false, message: 'At least one passenger is required' };
  }

  for (let i = 0; i < passengers.length; i++) {
    const passenger = passengers[i];
    const passengerNum = i + 1;

    // Validate basic info
    if (!passenger.title || !passenger.firstName || !passenger.lastName) {
      return {
        valid: false,
        message: `Passenger ${passengerNum}: Title, first name, and last name are required`
      };
    }

    // Validate date of birth
    if (!passenger.dateOfBirth?.day || !passenger.dateOfBirth?.month || !passenger.dateOfBirth?.year) {
      return {
        valid: false,
        message: `Passenger ${passengerNum}: Complete date of birth is required`
      };
    }

    // Validate passport info
    if (!passenger.countryOfResidence || !passenger.passportNumber) {
      return {
        valid: false,
        message: `Passenger ${passengerNum}: Country of residence and passport number are required`
      };
    }

    // Validate passport expiry
    if (!passenger.passportExpiry?.day || !passenger.passportExpiry?.month || !passenger.passportExpiry?.year) {
      return {
        valid: false,
        message: `Passenger ${passengerNum}: Complete passport expiry date is required`
      };
    }
  }

  return { valid: true };
};

const validateEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  if (!phone || !phone.dialingCode || !phone.number) {
    return false;
  }
  return true;
};

module.exports = {
  validatePassengerData,
  validateEmail,
  validatePhone
};

