# Passenger Booking API - Frontend Documentation

## Overview
This document provides complete API documentation for managing passenger bookings and editing passenger details in flight reservations.

---

## Base URL
```
/api/bookings
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

### 1. Create Booking
**POST** `/api/bookings/`

**Description:** Create a new flight booking with passenger details (authenticated users).

**Request Body:**
```json
{
  "email": "passenger@example.com",
  "phone": {
    "dialingCode": "+1",
    "number": "2125551234"
  },
  "passengers": [
    {
      "title": "Mr",
      "firstName": "Usama",
      "lastName": "Bhatti",
      "dateOfBirth": {
        "day": 16,
        "month": 11,
        "year": 2001
      },
      "countryOfBirth": "Pakistan",
      "countryOfResidence": "USA",
      "passportNumber": "CZ87893893",
      "passportExpiry": {
        "day": 15,
        "month": 12,
        "year": 2030
      },
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "USA"
      }
    }
  ],
  "notes": {
    "type": "Special Request",
    "text": "Window seat preferred"
  },
  "flightData": {},
  "extraServices": {}
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Booking created successfully",
  "data": {
    "booking": {
      "bookingReference": "PAS1K2M3N4P5Q",
      "user": "507f1f77bcf86cd799439011",
      "passengerCount": 1,
      "status": "pending",
      "createdAt": "2026-01-20T10:00:00.000Z"
    },
    "passengers": [
      {
        "title": "Mr",
        "firstName": "Usama",
        "lastName": "Bhatti",
        "dateOfBirth": {
          "day": 16,
          "month": 11,
          "year": 2001
        },
        "countryOfBirth": "Pakistan",
        "countryOfResidence": "USA",
        "passportNumber": "CZ87893893",
        "passportExpiry": {
          "day": 15,
          "month": 12,
          "year": 2030
        },
        "address": {
          "street": "123 Main St",
          "city": "New York",
          "state": "NY",
          "postalCode": "10001",
          "country": "USA"
        },
        "age": 24,
        "passengerType": "Adult"
      }
    ]
  }
}
```

---

### 2. Get My Bookings
**GET** `/api/bookings/my-bookings?page=1&limit=10&status=confirmed`

**Description:** Get all bookings for the authenticated user.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 10, max: 100)
- `status` (string, optional): Filter by status (`pending`, `confirmed`, `cancelled`)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "bookings": [
      {
        "bookingReference": "PAS1K2M3N4P5Q",
        "user": "507f1f77bcf86cd799439011",
        "email": "passenger@example.com",
        "phone": {
          "dialingCode": "+1",
          "number": "2125551234"
        },
        "passengers": [...],
        "bookingStatus": "confirmed",
        "createdAt": "2026-01-20T10:00:00.000Z",
        "updatedAt": "2026-01-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

---

### 3. Get Booking by ID
**GET** `/api/bookings/:id`

**Description:** Get detailed information about a specific booking.

**URL Parameters:**
- `id` (string, required): Booking ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "booking": {
      "bookingReference": "PAS1K2M3N4P5Q",
      "user": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "email": "passenger@example.com",
      "phone": {
        "dialingCode": "+1",
        "number": "2125551234"
      },
      "passengers": [...],
      "bookingStatus": "confirmed",
      "notes": {
        "type": "Special Request",
        "text": "Window seat preferred"
      },
      "flightData": {},
      "extraServices": {},
      "createdAt": "2026-01-20T10:00:00.000Z",
      "updatedAt": "2026-01-20T10:00:00.000Z"
    }
  }
}
```

---

### 4. Update Entire Booking
**PUT** `/api/bookings/:id`

**Description:** Update booking details including all passengers.

**URL Parameters:**
- `id` (string, required): Booking ID

**Request Body:**
All fields are optional. Only send fields you want to update.

```json
{
  "email": "newemail@example.com",
  "phone": {
    "dialingCode": "+1",
    "number": "9876543210"
  },
  "passengers": [...],
  "notes": {
    "type": "Updated Note",
    "text": "New special requests"
  }
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Booking updated successfully",
  "data": {
    "booking": {...},
    "passengers": [...]
  }
}
```

---

### 5. Update Individual Passenger Details ⭐ NEW
**PUT** `/api/bookings/:bookingId/passengers/:passengerIndex`

**Description:** Update details for a specific passenger in a booking. This is the main endpoint for the "Edit Passenger Details" form.

**URL Parameters:**
- `bookingId` (string, required): Booking ID
- `passengerIndex` (number, required): Passenger index (0-based, e.g., 0 for first passenger, 1 for second)

**Request Body:**
All fields are optional. Only send fields you want to update.

```json
{
  "title": "Mr",
  "firstName": "Usama",
  "lastName": "Bhatti",
  "dateOfBirth": {
    "day": 16,
    "month": 11,
    "year": 2001
  },
  "countryOfBirth": "Pakistan",
  "countryOfResidence": "USA",
  "passportNumber": "CZ87893893",
  "passportExpiry": {
    "day": 15,
    "month": 12,
    "year": 2030
  },
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA"
  }
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Passenger details updated successfully",
  "data": {
    "booking": {
      "bookingReference": "PAS1K2M3N4P5Q",
      "user": "507f1f77bcf86cd799439011",
      "passengerCount": 1,
      "status": "confirmed",
      "createdAt": "2026-01-20T10:00:00.000Z"
    },
    "passenger": {
      "title": "Mr",
      "firstName": "Usama",
      "lastName": "Bhatti",
      "dateOfBirth": {
        "day": 16,
        "month": 11,
        "year": 2001
      },
      "countryOfBirth": "Pakistan",
      "countryOfResidence": "USA",
      "passportNumber": "CZ87893893",
      "passportExpiry": {
        "day": 15,
        "month": 12,
        "year": 2030
      },
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "USA"
      },
      "age": 24,
      "passengerType": "Adult"
    }
  }
}
```

**Error Responses:**

*404 Not Found:*
```json
{
  "status": "error",
  "message": "Booking not found"
}
```

*400 Bad Request - Invalid passenger index:*
```json
{
  "status": "error",
  "message": "Invalid passenger index"
}
```

*400 Bad Request - Cannot update cancelled booking:*
```json
{
  "status": "error",
  "message": "Cannot update cancelled booking"
}
```

*403 Forbidden:*
```json
{
  "status": "error",
  "message": "Access denied"
}
```

---

### 6. Update Booking Status
**PATCH** `/api/bookings/:id/status`

**Description:** Update booking status (users can only cancel, admins can change to any status).

**Request Body:**
```json
{
  "status": "cancelled"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Booking status updated successfully",
  "data": {
    "booking": {
      "bookingReference": "PAS1K2M3N4P5Q",
      "status": "cancelled"
    }
  }
}
```

---

### 7. Delete Booking
**DELETE** `/api/bookings/:id`

**Description:** Delete a booking (cannot delete confirmed bookings - must cancel first).

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Booking deleted successfully"
}
```

---

## Field Specifications

### Passenger Object Fields

| Field | Type | Required | Max Length | Description | Validation Rules |
|-------|------|----------|------------|-------------|------------------|
| `title` | String | Yes | - | Title | Must be: `Mr`, `Mrs`, or `Ms` |
| `firstName` | String | Yes | 50 | First name | Non-empty, trimmed |
| `lastName` | String | Yes | 50 | Last name | Non-empty, trimmed |
| `dateOfBirth` | Object | Yes | - | Date of birth | See Date Object structure below |
| `countryOfBirth` | String | No | 100 | Country of birth | Any string |
| `countryOfResidence` | String | No | 100 | Country of residence | Any string |
| `passportNumber` | String | Yes | 20 | Passport number | Alphanumeric only, auto-uppercased |
| `passportExpiry` | Object | Yes | - | Passport expiry date | Must be in future |
| `address` | Object | No | - | Passenger address | See Address Object below |
| `age` | Number | Auto-calculated | - | Passenger age | Calculated from DOB |
| `passengerType` | String | Auto-set | - | Type of passenger | `Adult`, `Child`, or `Infant` (based on age) |

### Date Object Structure (dateOfBirth & passportExpiry)

```json
{
  "day": 16,
  "month": 11,
  "year": 2001
}
```

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `day` | Number | 1-31 | Day of month |
| `month` | Number | 1-12 | Month (1=January, 12=December) |
| `year` | Number | 1900-current year | Year |

**Notes:**
- `dateOfBirth.year` cannot be in the future
- `passportExpiry.year` must be current year or later (passport cannot be expired)

### Address Object Fields

```json
{
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "USA"
}
```

| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| `street` | String | No | 200 | Street address |
| `city` | String | No | 100 | City name |
| `state` | String | No | 100 | State/Province |
| `postalCode` | String | No | 20 | Postal/ZIP code |
| `country` | String | No | 100 | Country name |

**Note:** All address fields are optional and can be sent as `null` or omitted.

### Phone Object Structure

```json
{
  "dialingCode": "+1",
  "number": "2125551234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dialingCode` | String | Yes | Country dialing code (e.g., `+1`, `+44`, `+92`) |
| `number` | String | Yes | Phone number without country code |

### Booking Contact Fields (at booking level)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | String | Yes | Contact email for booking |
| `phone` | Object | Yes | Contact phone for booking |

---

## Validation Rules Summary

### Title
- ✅ Must be one of: `Mr`, `Mrs`, `Ms`

### Name Fields (firstName, lastName)
- ✅ Required
- ✅ 1-50 characters
- ✅ Trimmed automatically

### Email (Booking Level)
- ✅ Valid email format
- ✅ Automatically converted to lowercase

### Phone (Booking Level)
- ✅ `dialingCode` required (e.g., `+1`)
- ✅ `number` required

### Date of Birth
- ✅ Day: 1-31
- ✅ Month: 1-12
- ✅ Year: 1900 to current year
- ✅ Must be valid date

### Passport Number
- ✅ Required
- ✅ 1-20 characters
- ✅ Alphanumeric only (A-Z, 0-9)
- ✅ Automatically converted to uppercase

### Passport Expiry
- ✅ Must be in the future
- ✅ Year must be >= current year

### Country Fields
- ✅ Optional
- ✅ Max 100 characters

### Address
- ✅ All fields optional
- ✅ Sent as object
- ✅ Fields are merged with existing data (partial updates)

### Passenger Type (Auto-calculated)
- **Infant:** Age < 2 years
- **Child:** Age 2-11 years
- **Adult:** Age >= 12 years

---

## Frontend Integration Examples

### React/TypeScript Example

#### Type Definitions
```typescript
interface DateObject {
  day: number;
  month: number;
  year: number;
}

interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface Phone {
  dialingCode: string;
  number: string;
}

interface Passenger {
  title: 'Mr' | 'Mrs' | 'Ms';
  firstName: string;
  lastName: string;
  dateOfBirth: DateObject;
  countryOfBirth?: string;
  countryOfResidence?: string;
  passportNumber: string;
  passportExpiry: DateObject;
  address?: Address;
  age?: number;
  passengerType?: 'Adult' | 'Child' | 'Infant';
}

interface Booking {
  _id: string;
  bookingReference: string;
  user: string;
  email: string;
  phone: Phone;
  passengers: Passenger[];
  bookingStatus: 'pending' | 'confirmed' | 'cancelled';
  notes?: {
    type?: string;
    text?: string;
  };
  flightData?: any;
  extraServices?: any;
  createdAt: string;
  updatedAt: string;
}

interface UpdatePassengerRequest {
  title?: 'Mr' | 'Mrs' | 'Ms';
  firstName?: string;
  lastName?: string;
  dateOfBirth?: DateObject;
  countryOfBirth?: string;
  countryOfResidence?: string;
  passportNumber?: string;
  passportExpiry?: DateObject;
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

// Get booking by ID
export const getBookingById = async (bookingId: string): Promise<Booking> => {
  const response = await apiClient.get<ApiResponse<{ booking: Booking }>>(
    `/bookings/${bookingId}`
  );
  return response.data.data!.booking;
};

// Update passenger details
export const updatePassengerDetails = async (
  bookingId: string,
  passengerIndex: number,
  data: UpdatePassengerRequest
): Promise<Passenger> => {
  const response = await apiClient.put<ApiResponse<{ passenger: Passenger }>>(
    `/bookings/${bookingId}/passengers/${passengerIndex}`,
    data
  );
  return response.data.data!.passenger;
};

// Get my bookings
export const getMyBookings = async (
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<{ bookings: Booking[]; pagination: any }> => {
  const params: any = { page, limit };
  if (status) params.status = status;
  
  const response = await apiClient.get<ApiResponse<any>>('/bookings/my-bookings', {
    params,
  });
  return response.data.data!;
};
```

#### Date Conversion Helpers
```typescript
// Convert "16/11/2001" or "2001-11-16" to DateObject
export const stringToDateObject = (dateString: string): DateObject => {
  let date: Date;
  
  if (dateString.includes('/')) {
    // Format: DD/MM/YYYY
    const [day, month, year] = dateString.split('/').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    // Format: YYYY-MM-DD
    date = new Date(dateString);
  }
  
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
};

// Convert DateObject to "DD/MM/YYYY" string
export const dateObjectToString = (dateObj: DateObject): string => {
  const day = String(dateObj.day).padStart(2, '0');
  const month = String(dateObj.month).padStart(2, '0');
  return `${day}/${month}/${dateObj.year}`;
};

// Convert DateObject to HTML date input format "YYYY-MM-DD"
export const dateObjectToInputValue = (dateObj: DateObject): string => {
  const month = String(dateObj.month).padStart(2, '0');
  const day = String(dateObj.day).padStart(2, '0');
  return `${dateObj.year}-${month}-${day}`;
};

// Convert HTML date input "YYYY-MM-DD" to DateObject
export const inputValueToDateObject = (inputValue: string): DateObject => {
  const [year, month, day] = inputValue.split('-').map(Number);
  return { day, month, year };
};
```

#### React Component Example
```typescript
import React, { useState, useEffect } from 'react';
import {
  getBookingById,
  updatePassengerDetails,
  stringToDateObject,
  dateObjectToInputValue,
  inputValueToDateObject,
} from './services/api';

interface EditPassengerProps {
  bookingId: string;
  passengerIndex: number;
  onClose: () => void;
  onSuccess: () => void;
}

const EditPassengerDetails: React.FC<EditPassengerProps> = ({
  bookingId,
  passengerIndex,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  
  const [formData, setFormData] = useState({
    title: 'Mr' as 'Mr' | 'Mrs' | 'Ms',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    countryOfBirth: '',
    passportNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  });

  useEffect(() => {
    loadBookingData();
  }, [bookingId, passengerIndex]);

  const loadBookingData = async () => {
    try {
      setLoading(true);
      const bookingData = await getBookingById(bookingId);
      setBooking(bookingData);
      
      const passenger = bookingData.passengers[passengerIndex];
      if (!passenger) {
        setError('Passenger not found');
        return;
      }
      
      // Populate form
      setFormData({
        title: passenger.title,
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        email: bookingData.email, // From booking level
        phone: `${bookingData.phone.dialingCode}${bookingData.phone.number}`,
        dateOfBirth: dateObjectToInputValue(passenger.dateOfBirth),
        countryOfBirth: passenger.countryOfBirth || '',
        passportNumber: passenger.passportNumber,
        address: {
          street: passenger.address?.street || '',
          city: passenger.address?.city || '',
          state: passenger.address?.state || '',
          postalCode: passenger.address?.postalCode || '',
          country: passenger.address?.country || '',
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
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
    
    if (!booking) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Build update data
      const updateData: UpdatePassengerRequest = {
        title: formData.title,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: inputValueToDateObject(formData.dateOfBirth),
        countryOfBirth: formData.countryOfBirth || undefined,
        passportNumber: formData.passportNumber,
      };
      
      // Include address if any field is filled
      if (Object.values(formData.address).some(val => val)) {
        updateData.address = formData.address;
      }
      
      await updatePassengerDetails(bookingId, passengerIndex, updateData);
      
      alert('Passenger details updated successfully!');
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update passenger';
      setError(errorMessage);
      
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

  if (loading && !booking) {
    return <div>Loading...</div>;
  }

  return (
    <div className="edit-passenger-modal">
      <div className="modal-header">
        <h2>Edit Passenger Details</h2>
        <button onClick={onClose}>✕</button>
      </div>
      
      {error && (
        <div className="error-message" style={{ color: 'red', padding: '10px' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              required
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>Last Name *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              maxLength={50}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Email Address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            disabled
          />
          <small>Email is managed at booking level</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+1234567890"
              disabled
            />
            <small>Include country code (e.g., +1234567890)</small>
          </div>

          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Passport Number</label>
            <input
              type="text"
              name="passportNumber"
              value={formData.passportNumber}
              onChange={handleInputChange}
              maxLength={20}
              pattern="[A-Za-z0-9]*"
            />
            <small>Letters and numbers only</small>
          </div>

          <div className="form-group">
            <label>Country of Birth</label>
            <input
              type="text"
              name="countryOfBirth"
              value={formData.countryOfBirth}
              onChange={handleInputChange}
              maxLength={100}
            />
          </div>
        </div>

        <h3>Address</h3>

        <div className="form-group">
          <label>Street Address</label>
          <input
            type="text"
            name="address.street"
            value={formData.address.street}
            onChange={handleInputChange}
            maxLength={200}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="address.city"
              value={formData.address.city}
              onChange={handleInputChange}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>State/Province</label>
            <input
              type="text"
              name="address.state"
              value={formData.address.state}
              onChange={handleInputChange}
              maxLength={100}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Postal Code</label>
            <input
              type="text"
              name="address.postalCode"
              value={formData.address.postalCode}
              onChange={handleInputChange}
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label>Country</label>
            <input
              type="text"
              name="address.country"
              value={formData.address.country}
              onChange={handleInputChange}
              maxLength={100}
            />
          </div>
        </div>

        <div className="note-box">
          <strong>Note:</strong> These details must match your passport or ID card for travel purposes.
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditPassengerDetails;
```

---

## Testing Examples

### cURL Examples

**Get Booking:**
```bash
curl -X GET http://localhost:5000/api/bookings/6789abc123def456 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Update Passenger (First passenger in booking):**
```bash
curl -X PUT http://localhost:5000/api/bookings/6789abc123def456/passengers/0 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Usama",
    "lastName": "Bhatti",
    "dateOfBirth": {
      "day": 16,
      "month": 11,
      "year": 2001
    },
    "countryOfBirth": "Pakistan",
    "passportNumber": "CZ87893893",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    }
  }'
```

**Partial Update (only specific fields):**
```bash
curl -X PUT http://localhost:5000/api/bookings/6789abc123def456/passengers/0 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "passportNumber": "NEW12345",
    "address": {
      "city": "Los Angeles",
      "state": "CA"
    }
  }'
```

---

## Important Notes

### Date Format Differences
- **Frontend Form:** Displays as `16/11/2001` (single date input)
- **Backend API:** Requires object format:
  ```json
  {
    "day": 16,
    "month": 11,
    "year": 2001
  }
  ```
- **Conversion Required:** Frontend must convert between formats using helper functions

### Email & Phone
- These fields are at the **booking level**, not passenger level
- To update email/phone, use the main booking update endpoint: `PUT /bookings/:id`
- The Edit Passenger form can display these but should be read-only or update the booking separately

### Passenger Index
- Passenger index is **0-based**
- First passenger: index `0`
- Second passenger: index `1`
- Always validate the index exists in the booking

### Address Merging
- Address fields are merged with existing data
- You can update only specific address fields
- Send only the fields you want to change

### Passport Number
- Automatically converted to **UPPERCASE**
- Only alphanumeric characters allowed
- Max 20 characters

### Booking Status
- Cannot update passengers in **cancelled** bookings
- Users can only access their own bookings (unless admin)

### Passenger Type & Age
- `age` and `passengerType` are **auto-calculated** from date of birth
- Don't send these fields - they're computed on save

---

## Common Issues & Troubleshooting

### Issue: "Invalid passenger index"
**Cause:** The passenger index doesn't exist in the booking.  
**Solution:** Check the number of passengers in the booking. Index must be 0 to (passengerCount - 1).

### Issue: "Cannot update cancelled booking"
**Cause:** Trying to edit a cancelled booking.  
**Solution:** Booking must be in `pending` or `confirmed` status.

### Issue: Date validation fails
**Cause:** Invalid date format or values.  
**Solution:** Ensure day (1-31), month (1-12), and year are valid numbers. DOB must be in the past.

### Issue: "Passport number can only contain letters and numbers"
**Cause:** Special characters in passport number.  
**Solution:** Remove spaces, hyphens, and special characters.

### Issue: Address not updating
**Cause:** Not sending address as object.  
**Solution:** Wrap address fields in an `address` object.

---

## Best Practices

1. **Convert dates properly** between display format and API format
2. **Validate on frontend** before sending to API
3. **Handle errors gracefully** with user-friendly messages
4. **Show loading states** during API calls
5. **Confirm before saving** - remind users details must match passport
6. **Cache booking data** to avoid repeated API calls
7. **Use TypeScript** for type safety
8. **Disable email/phone fields** in passenger form (managed at booking level)
9. **Validate passenger index** before API call
10. **Handle partial updates** - only send changed fields

---

## API Response Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Booking created successfully |
| 400 | Bad Request | Validation error or invalid data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Access denied (not your booking) |
| 404 | Not Found | Booking or passenger not found |
| 500 | Server Error | Internal server error |

---

## Support

For any issues or questions, contact the backend team or refer to the main API documentation.

**Last Updated:** January 20, 2026
