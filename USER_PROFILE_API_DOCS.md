# User Profile Management API - Frontend Documentation

## Overview
This document provides complete API documentation for user profile management, including account settings and user information updates.

---

## Base URL
```
/api/users
```

---

## Authentication
All endpoints require authentication unless specified as public.

**Headers:**
```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

## Endpoints

### 1. Get Current User Profile
**GET** `/api/users/me`

**Description:** Fetch the currently authenticated user's profile. This endpoint only returns user data - use `/refresh-token` for token management.

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "dateOfBirth": "1990-01-15T00:00:00.000Z",
      "countryOfBirth": "United States",
      "passportNumber": "AB123456",
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "postalCode": "10001"
      },
      "type": "customer",
      "role": null,
      "isActive": true,
      "lastLogin": "2026-01-20T10:30:00.000Z",
      "createdAt": "2025-12-01T10:00:00.000Z",
      "updatedAt": "2026-01-20T10:30:00.000Z"
    }
  }
}
```

**Note:** This endpoint does NOT return tokens. Tokens are only provided during login/signup. To refresh your access token, use the `/refresh-token` endpoint.

---

### 2. Update User Profile
**PUT** `/api/users/:id`

**Description:** Update user profile information. Users can only update their own profile unless they are admin.

**URL Parameters:**
- `id` (string, required): User ID (must match authenticated user's ID for non-admins)

**Request Body:**
All fields are optional. Only send the fields you want to update.

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-15",
  "countryOfBirth": "United States",
  "passportNumber": "AB123456",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "postalCode": "10001"
  }
}
```

**Success Response:**
```json
{
  "status": "success",
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "dateOfBirth": "1990-01-15T00:00:00.000Z",
      "countryOfBirth": "United States",
      "passportNumber": "AB123456",
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "postalCode": "10001"
      },
      "type": "customer",
      "role": null,
      "isActive": true,
      "lastLogin": "2026-01-20T10:30:00.000Z",
      "createdAt": "2025-12-01T10:00:00.000Z",
      "updatedAt": "2026-01-20T11:15:00.000Z"
    }
  }
}
```

**Error Responses:**

*403 Forbidden - Trying to update another user's profile:*
```json
{
  "status": "error",
  "message": "You can only update your own profile"
}
```

*400 Bad Request - Email already exists:*
```json
{
  "status": "error",
  "message": "Email already exists"
}
```

*400 Bad Request - Username already exists:*
```json
{
  "status": "error",
  "message": "Username already exists"
}
```

*400 Bad Request - Passport number already exists:*
```json
{
  "status": "error",
  "message": "Passport number already exists"
}
```

*400 Bad Request - Validation errors:*
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please enter a valid email",
      "value": "invalid-email"
    },
    {
      "field": "phone",
      "message": "Please enter a valid phone number",
      "value": "123"
    }
  ]
}
```

---

## Field Specifications

### User Profile Fields

| Field | Type | Required | Max Length | Description | Validation Rules |
|-------|------|----------|------------|-------------|------------------|
| `firstName` | String | Yes* | 50 | User's first name | Non-empty, trimmed |
| `lastName` | String | Yes* | 50 | User's last name | Non-empty, trimmed |
| `username` | String | No** | 30 | Unique username | 3-30 chars, alphanumeric + underscore, lowercase |
| `email` | String | Yes | - | User's email address | Valid email format, unique, lowercase |
| `phone` | String | No | 16 | Phone number with country code | Format: `+[country][number]`, e.g., `+1234567890` |
| `dateOfBirth` | Date/String | No | - | Date of birth | ISO 8601 format, must be in past, user must be at least 1 year old |
| `countryOfBirth` | String | No | 100 | Country/region of birth | Any string |
| `passportNumber` | String | No | 20 | Passport number | Alphanumeric only, unique, auto-uppercased |
| `address` | Object | No | - | User's address | See address fields below |

\* Required for new users during registration  
\** Required for admin users only

### Address Object Fields

| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| `address.street` | String | No | 200 | Street address |
| `address.city` | String | No | 100 | City name |
| `address.state` | String | No | 100 | State/Province/Region |
| `address.country` | String | No | 100 | Country name |
| `address.postalCode` | String | No | 20 | Postal/ZIP code |

### Read-Only Fields
These fields are returned in responses but cannot be updated via this endpoint:

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique user identifier (MongoDB ObjectId) |
| `type` | String | User type: `customer` or `admin` |
| `role` | Object/null | User's role object (for admins) |
| `isActive` | Boolean | Account active status (admin only can update) |
| `lastLogin` | Date | Last login timestamp |
| `createdAt` | Date | Account creation timestamp |
| `updatedAt` | Date | Last update timestamp |

---

## Validation Rules Summary

### Email
- ✅ Must be valid email format
- ✅ Must be unique
- ✅ Automatically converted to lowercase

### Phone
- ✅ Format: `+[country code][number]`
- ✅ Must start with `+` followed by 1-9
- ✅ Can be up to 16 digits total
- ✅ Examples: `+12125551234`, `+447911123456`

### Date of Birth
- ✅ Must be valid date in ISO 8601 format
- ✅ Must be in the past
- ✅ User must be at least 1 year old
- ✅ Frontend should send as: `YYYY-MM-DD` or full ISO string

### Passport Number
- ✅ Alphanumeric characters only (A-Z, 0-9)
- ✅ Must be unique across all users
- ✅ Automatically converted to uppercase
- ✅ Max 20 characters

### Username
- ✅ 3-30 characters
- ✅ Letters, numbers, and underscores only
- ✅ Must be unique
- ✅ Automatically converted to lowercase
- ✅ Optional for customers, required for admins

### Address
- ✅ Must be sent as an object
- ✅ All sub-fields are optional
- ✅ Address fields are merged with existing data (partial updates supported)

---

## Frontend Integration Examples

### React/TypeScript Example

#### Type Definitions
```typescript
interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  username?: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  countryOfBirth?: string;
  passportNumber?: string;
  address?: Address;
  type: 'customer' | 'admin';
  role?: any;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  countryOfBirth?: string;
  passportNumber?: string;
  address?: Address;
}

interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    value: any;
  }>;
}
```

#### API Service
```typescript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get current user profile
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<ApiResponse<{ user: User }>>('/users/me');
  return response.data.data!.user;
};

// Update user profile
export const updateUserProfile = async (
  userId: string,
  data: UpdateUserRequest
): Promise<User> => {
  const response = await apiClient.put<ApiResponse<{ user: User }>>(
    `/users/${userId}`,
    data
  );
  return response.data.data!.user;
};
```

#### React Component Example
```typescript
import React, { useState, useEffect } from 'react';
import { getCurrentUser, updateUserProfile } from './services/api';

const AccountSettings: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    countryOfBirth: '',
    passportNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userData = await getCurrentUser();
      setUser(userData);
      
      // Populate form with existing data
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        username: userData.username || '',
        email: userData.email || '',
        phone: userData.phone || '',
        dateOfBirth: userData.dateOfBirth 
          ? new Date(userData.dateOfBirth).toISOString().split('T')[0] 
          : '',
        countryOfBirth: userData.countryOfBirth || '',
        passportNumber: userData.passportNumber || '',
        address: {
          street: userData.address?.street || '',
          city: userData.address?.city || '',
          state: userData.address?.state || '',
          country: userData.address?.country || '',
          postalCode: userData.address?.postalCode || '',
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle nested address fields
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Only send fields that have values (optional)
      const updateData: UpdateUserRequest = {};
      
      if (formData.firstName) updateData.firstName = formData.firstName;
      if (formData.lastName) updateData.lastName = formData.lastName;
      if (formData.username) updateData.username = formData.username;
      if (formData.email) updateData.email = formData.email;
      if (formData.phone) updateData.phone = formData.phone;
      if (formData.dateOfBirth) updateData.dateOfBirth = formData.dateOfBirth;
      if (formData.countryOfBirth) updateData.countryOfBirth = formData.countryOfBirth;
      if (formData.passportNumber) updateData.passportNumber = formData.passportNumber;
      
      // Only include address if at least one field is filled
      if (Object.values(formData.address).some(val => val)) {
        updateData.address = formData.address;
      }
      
      const updatedUser = await updateUserProfile(user.id, updateData);
      setUser(updatedUser);
      
      alert('Profile updated successfully!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile';
      setError(errorMessage);
      
      // Handle validation errors
      if (err.response?.data?.errors) {
        const validationErrors = err.response.data.errors
          .map((e: any) => `${e.field}: ${e.message}`)
          .join('\n');
        setError(validationErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="account-settings">
      <h1>Account Settings</h1>
      
      {error && (
        <div className="error-message" style={{ color: 'red' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h2>Basic Information</h2>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled
            />
            <small>Email: {formData.email}</small>
          </div>

          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              maxLength={30}
              pattern="[a-zA-Z0-9_]+"
            />
            <small>Letters, numbers, and underscores only</small>
          </div>

          <div className="form-group">
            <label htmlFor="dateOfBirth">Date of Birth</label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="countryOfBirth">Country/Region of Birth</label>
            <input
              type="text"
              id="countryOfBirth"
              name="countryOfBirth"
              value={formData.countryOfBirth}
              onChange={handleInputChange}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="passportNumber">Passport Number</label>
            <input
              type="text"
              id="passportNumber"
              name="passportNumber"
              value={formData.passportNumber}
              onChange={handleInputChange}
              maxLength={20}
              pattern="[A-Za-z0-9]*"
            />
            <small>Letters and numbers only</small>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+1234567890"
            />
            <small>Include country code (e.g., +1234567890)</small>
          </div>
        </div>

        <div className="form-section">
          <h2>Address</h2>
          
          <div className="form-group">
            <label htmlFor="address.street">Street Address</label>
            <input
              type="text"
              id="address.street"
              name="address.street"
              value={formData.address.street}
              onChange={handleInputChange}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address.city">City</label>
            <input
              type="text"
              id="address.city"
              name="address.city"
              value={formData.address.city}
              onChange={handleInputChange}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address.state">State/Province</label>
            <input
              type="text"
              id="address.state"
              name="address.state"
              value={formData.address.state}
              onChange={handleInputChange}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address.country">Country</label>
            <input
              type="text"
              id="address.country"
              name="address.country"
              value={formData.address.country}
              onChange={handleInputChange}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address.postalCode">Postal Code</label>
            <input
              type="text"
              id="address.postalCode"
              name="address.postalCode"
              value={formData.address.postalCode}
              onChange={handleInputChange}
              maxLength={20}
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Account Status</h2>
          <p>
            <strong>Status:</strong>{' '}
            <span className={user?.isActive ? 'active' : 'inactive'}>
              {user?.isActive ? 'Active' : 'Inactive'}
            </span>
          </p>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default AccountSettings;
```

---

## Testing Examples

### cURL Examples

**Get Current User:**
```bash
curl -X GET http://localhost:5000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Update User Profile:**
```bash
curl -X PUT http://localhost:5000/api/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+12125551234",
    "dateOfBirth": "1990-01-15",
    "countryOfBirth": "United States",
    "passportNumber": "AB123456",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "postalCode": "10001"
    }
  }'
```

**Partial Update (only specific fields):**
```bash
curl -X PUT http://localhost:5000/api/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+12125551234",
    "address": {
      "city": "Los Angeles",
      "state": "CA"
    }
  }'
```

---

## Common Issues & Troubleshooting

### Issue: "You can only update your own profile"
**Cause:** The user ID in the URL doesn't match the authenticated user's ID.  
**Solution:** Ensure the `:id` parameter matches the logged-in user's ID.

### Issue: "Email already exists"
**Cause:** Another user already has this email address.  
**Solution:** Choose a different email or keep the current one.

### Issue: "Passport number already exists"
**Cause:** Another user already has this passport number.  
**Solution:** Verify the passport number is correct.

### Issue: "Please enter a valid phone number"
**Cause:** Phone number format is incorrect.  
**Solution:** Use format `+[country code][number]`, e.g., `+12125551234`

### Issue: Date of Birth validation fails
**Cause:** Invalid date format or date in the future.  
**Solution:** Use ISO 8601 format (`YYYY-MM-DD`) and ensure date is in the past.

### Issue: Address not updating
**Cause:** Address fields are being overwritten instead of merged.  
**Solution:** The backend automatically merges address fields. Just send the fields you want to update.

---

## Best Practices

1. **Always validate on frontend** before sending to API
2. **Handle validation errors** gracefully and show user-friendly messages
3. **Use TypeScript** for type safety
4. **Store tokens securely** (httpOnly cookies preferred over localStorage)
5. **Implement retry logic** for network failures
6. **Show loading states** during API calls
7. **Debounce** uniqueness checks (email, username, passport)
8. **Format phone numbers** as user types
9. **Validate dates** on frontend before submission
10. **Handle partial updates** - only send changed fields

---

## Token Management

### When Are Tokens Issued?

Tokens (access token + refresh token) are **ONLY** issued during:
1. **Login** (`POST /login`) - Password-based authentication
2. **Signup/OTP Verification** (`POST /signup/verify-otp`) - OTP-based authentication
3. **Token Refresh** (`POST /refresh-token`) - When access token expires

### When Are Tokens NOT Issued?

- **Profile Fetch** (`GET /me`) - Returns only user data
- **Profile Update** (`PUT /users/:id`) - Updates profile, doesn't refresh tokens
- **Password Change** (`PUT /change-password`) - Changes password only

### How to Refresh Tokens?

When your access token expires (3 days by default), use:

```bash
POST /api/users/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Token refreshed successfully",
  "data": {
    "token": "new_access_token",
    "refreshToken": "new_refresh_token"
  }
}
```

**Important:** Both tokens are rotated on refresh for security.

---

## Notes

- All dates are returned in ISO 8601 format
- Passport numbers are automatically converted to uppercase
- Email and username are automatically converted to lowercase
- Address fields are merged, not replaced (partial updates supported)
- Only admins can update `isActive` status
- Users can only update their own profile unless they are admin
- Phone numbers should include country code with `+` prefix
- All fields except email and firstName/lastName are optional
- The `/me` endpoint does NOT issue new tokens - use `/refresh-token` for that

---

## Support

For any issues or questions, contact the backend team or refer to the main API documentation.

**Last Updated:** January 20, 2026
