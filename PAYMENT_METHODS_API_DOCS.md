# Payment Methods & Payment History API - Frontend Documentation

## Overview
This document provides complete API documentation for managing saved payment methods and viewing payment history. Users can save payment methods for quick checkout and view their transaction history.

---

## Base URL
```
/api/payments
```

---

## Authentication
All endpoints require authentication.

**Headers:**
```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

## Architecture Overview

### Two-Part System:

1. **Saved Payment Methods** → Stored on User profile (for quick checkout)
2. **Payment History (Transactions)** → Transaction records linked to user

```
User Model
└── savedPaymentMethods[]
    ├── Card #1 (Visa •••• 1234) [Default]
    ├── Card #2 (Mastercard •••• 5678)
    └── Card #3 (PayPal)

Transaction Model
└── user: ObjectId (reference to User)
    ├── Transaction #1 (OGGOTRIP-ABC123)
    ├── Transaction #2 (OGGOTRIP-DEF456)
    └── Transaction #3 (OGGOTRIP-GHI789)
```

---

## Endpoints

### 1. Get Saved Payment Methods
**GET** `/api/payments/methods`

**Description:** Retrieve all saved payment methods for the authenticated user.

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "paymentMethods": [
      {
        "id": "507f1f77bcf86cd799439011",
        "provider": "revolut",
        "type": "card",
        "cardBrand": "visa",
        "last4": "1234",
        "expiryMonth": "12",
        "expiryYear": "2028",
        "isDefault": true,
        "nickname": "Personal Visa",
        "addedAt": "2026-01-15T10:00:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "provider": "revolut",
        "type": "card",
        "cardBrand": "mastercard",
        "last4": "5678",
        "expiryMonth": "06",
        "expiryYear": "2027",
        "isDefault": false,
        "nickname": "Business Card",
        "addedAt": "2026-01-10T14:30:00.000Z"
      }
    ]
  }
}
```

**Empty State Response:**
```json
{
  "status": "success",
  "data": {
    "paymentMethods": []
  }
}
```

---

### 2. Add Payment Method
**POST** `/api/payments/methods`

**Description:** Add a new payment method to user's saved methods. First method added automatically becomes default.

**Request Body:**
```json
{
  "paymentMethodId": "pm_1234567890abcdef",
  "provider": "revolut",
  "type": "card",
  "cardBrand": "visa",
  "last4": "1234",
  "expiryMonth": "12",
  "expiryYear": "2028",
  "nickname": "Personal Visa",
  "isDefault": false
}
```

**Field Specifications:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `paymentMethodId` | String | Yes | Unique ID from payment provider | Non-empty |
| `provider` | String | Yes | Payment provider | `revolut`, `stripe`, or `paypal` |
| `type` | String | Yes | Payment method type | `card`, `bank_account`, or `wallet` |
| `cardBrand` | String | No | Card brand (for cards) | visa, mastercard, amex, etc. |
| `last4` | String | No | Last 4 digits | Exactly 4 characters |
| `expiryMonth` | String | No | Expiry month | 01-12 format |
| `expiryYear` | String | No | Expiry year | 4 digits (e.g., 2028) |
| `nickname` | String | No | User-friendly name | Max 50 characters |
| `isDefault` | Boolean | No | Set as default method | true/false |

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Payment method added successfully",
  "data": {
    "paymentMethods": [
      {
        "id": "507f1f77bcf86cd799439011",
        "provider": "revolut",
        "type": "card",
        "cardBrand": "visa",
        "last4": "1234",
        "expiryMonth": "12",
        "expiryYear": "2028",
        "isDefault": true,
        "nickname": "Personal Visa",
        "addedAt": "2026-01-20T10:00:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**

*400 Bad Request - Missing required fields:*
```json
{
  "status": "error",
  "message": "Payment method ID, provider, and type are required"
}
```

*400 Bad Request - Duplicate payment method:*
```json
{
  "status": "error",
  "message": "Payment method already exists"
}
```

*400 Bad Request - Validation errors:*
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "provider",
      "message": "Provider must be revolut, stripe, or paypal",
      "value": "invalid"
    }
  ]
}
```

---

### 3. Remove Payment Method
**DELETE** `/api/payments/methods/:paymentMethodId`

**Description:** Remove a saved payment method. If the removed method was default and other methods exist, the first remaining method becomes default.

**URL Parameters:**
- `paymentMethodId` (string, required): Payment method ID

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Payment method removed successfully",
  "data": {
    "paymentMethods": [
      // Remaining payment methods
    ]
  }
}
```

**Error Responses:**

*404 Not Found:*
```json
{
  "status": "error",
  "message": "Payment method not found"
}
```

---

### 4. Set Default Payment Method
**PATCH** `/api/payments/methods/:paymentMethodId/default`

**Description:** Set a payment method as the default. All other methods will be marked as non-default.

**URL Parameters:**
- `paymentMethodId` (string, required): Payment method ID to set as default

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Default payment method updated successfully",
  "data": {
    "paymentMethods": [
      {
        "id": "507f1f77bcf86cd799439011",
        "provider": "revolut",
        "type": "card",
        "cardBrand": "visa",
        "last4": "1234",
        "isDefault": true,
        // ... other fields
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "provider": "revolut",
        "type": "card",
        "cardBrand": "mastercard",
        "last4": "5678",
        "isDefault": false,
        // ... other fields
      }
    ]
  }
}
```

**Error Responses:**

*404 Not Found:*
```json
{
  "status": "error",
  "message": "Payment method not found"
}
```

---

### 5. Get Payment History
**GET** `/api/payments/history?page=1&limit=10&status=completed`

**Description:** Get paginated payment history (transactions) for the authenticated user.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number |
| `limit` | Number | No | 10 | Results per page (max: 100) |
| `status` | String | No | - | Filter by status |

**Status Values:** `pending`, `created`, `initiated`, `authorized`, `completed`, `paid`, `success`, `failed`, `canceled`, `cancelled`, `void`

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "transactions": [
      {
        "id": "507f191e810c19729de860ea",
        "transaction_id": "OGGOTRIP-ABC123XYZ",
        "amount": 249.99,
        "currency": "USD",
        "status": "completed",
        "description": "Flight booking payment",
        "product": "Flight Ticket",
        "bookingRef": "PAS1K2M3N4P5Q",
        "createdAt": "2026-01-20T10:00:00.000Z",
        "updatedAt": "2026-01-20T10:05:00.000Z"
      },
      {
        "id": "507f191e810c19729de860eb",
        "transaction_id": "OGGOTRIP-DEF456ABC",
        "amount": 399.00,
        "currency": "USD",
        "status": "completed",
        "description": "Hotel booking",
        "product": "Hotel Reservation",
        "bookingRef": "HTL7N8M9P0Q1R",
        "createdAt": "2026-01-18T14:30:00.000Z",
        "updatedAt": "2026-01-18T14:35:00.000Z"
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

## Data Models

### Payment Method Object

```typescript
interface PaymentMethod {
  id: string;                    // MongoDB ObjectId
  provider: 'revolut' | 'stripe' | 'paypal';
  type: 'card' | 'bank_account' | 'wallet';
  cardBrand?: string;            // visa, mastercard, amex, etc.
  last4?: string;                // Last 4 digits
  expiryMonth?: string;          // 01-12
  expiryYear?: string;           // YYYY format
  isDefault: boolean;
  nickname?: string;
  addedAt: string;               // ISO 8601 date
}
```

### Transaction Object (in Payment History)

```typescript
interface Transaction {
  id: string;                    // MongoDB ObjectId
  transaction_id: string;        // OGGOTRIP-XXXXXXXX
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  status: string;
  description?: string;
  product?: string;
  bookingRef?: string;
  createdAt: string;             // ISO 8601 date
  updatedAt: string;             // ISO 8601 date
}
```

---

## Frontend Integration Examples

### TypeScript Type Definitions

```typescript
// Payment Method Types
type PaymentProvider = 'revolut' | 'stripe' | 'paypal';
type PaymentType = 'card' | 'bank_account' | 'wallet';

interface PaymentMethod {
  id: string;
  provider: PaymentProvider;
  type: PaymentType;
  cardBrand?: string;
  last4?: string;
  expiryMonth?: string;
  expiryYear?: string;
  isDefault: boolean;
  nickname?: string;
  addedAt: string;
}

interface AddPaymentMethodRequest {
  paymentMethodId: string;
  provider: PaymentProvider;
  type: PaymentType;
  cardBrand?: string;
  last4?: string;
  expiryMonth?: string;
  expiryYear?: string;
  nickname?: string;
  isDefault?: boolean;
}

// Transaction/Payment History Types
type TransactionStatus = 
  | 'pending' 
  | 'created' 
  | 'initiated' 
  | 'authorized' 
  | 'completed' 
  | 'paid' 
  | 'success' 
  | 'failed' 
  | 'canceled' 
  | 'cancelled' 
  | 'void';

interface Transaction {
  id: string;
  transaction_id: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  status: TransactionStatus;
  description?: string;
  product?: string;
  bookingRef?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentHistoryResponse {
  status: 'success' | 'error';
  data: {
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface PaymentMethodsResponse {
  status: 'success' | 'error';
  data: {
    paymentMethods: PaymentMethod[];
  };
}
```

---

### API Service Layer

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

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

// Get saved payment methods
export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const response = await apiClient.get<PaymentMethodsResponse>('/payments/methods');
  return response.data.data.paymentMethods;
};

// Add payment method
export const addPaymentMethod = async (
  data: AddPaymentMethodRequest
): Promise<PaymentMethod[]> => {
  const response = await apiClient.post<PaymentMethodsResponse>('/payments/methods', data);
  return response.data.data.paymentMethods;
};

// Remove payment method
export const removePaymentMethod = async (
  paymentMethodId: string
): Promise<PaymentMethod[]> => {
  const response = await apiClient.delete<PaymentMethodsResponse>(
    `/payments/methods/${paymentMethodId}`
  );
  return response.data.data.paymentMethods;
};

// Set default payment method
export const setDefaultPaymentMethod = async (
  paymentMethodId: string
): Promise<PaymentMethod[]> => {
  const response = await apiClient.patch<PaymentMethodsResponse>(
    `/payments/methods/${paymentMethodId}/default`
  );
  return response.data.data.paymentMethods;
};

// Get payment history
export const getPaymentHistory = async (
  page: number = 1,
  limit: number = 10,
  status?: TransactionStatus
): Promise<PaymentHistoryResponse['data']> => {
  const params: any = { page, limit };
  if (status) params.status = status;
  
  const response = await apiClient.get<PaymentHistoryResponse>('/payments/history', {
    params,
  });
  return response.data.data;
};
```

---

### React Components Examples

#### 1. Payment Methods Page Component

```typescript
import React, { useState, useEffect } from 'react';
import {
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
} from './services/api';

const PaymentMethodsPage: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await getPaymentMethods();
      setPaymentMethods(methods);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;
    
    try {
      const updated = await removePaymentMethod(paymentMethodId);
      setPaymentMethods(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove payment method');
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      const updated = await setDefaultPaymentMethod(paymentMethodId);
      setPaymentMethods(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to set default');
    }
  };

  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa': return '💳';
      case 'mastercard': return '💳';
      case 'amex': return '💳';
      default: return '💳';
    }
  };

  if (loading) return <div>Loading payment methods...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="payment-methods-page">
      <div className="page-header">
        <h1>Payment Methods</h1>
        <button onClick={() => setShowAddForm(true)} className="btn-primary">
          + Add Payment Method
        </button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="empty-state">
          <p>No payment methods saved yet.</p>
          <button onClick={() => setShowAddForm(true)}>
            Add Your First Payment Method
          </button>
        </div>
      ) : (
        <div className="payment-methods-list">
          {paymentMethods.map((method) => (
            <div key={method.id} className="payment-method-card">
              <div className="card-icon">{getCardIcon(method.cardBrand)}</div>
              
              <div className="card-details">
                <div className="card-title">
                  {method.nickname || `${method.cardBrand?.toUpperCase()} ${method.last4}`}
                  {method.isDefault && (
                    <span className="default-badge">Default</span>
                  )}
                </div>
                
                <div className="card-info">
                  {method.cardBrand && (
                    <span className="brand">{method.cardBrand.toUpperCase()}</span>
                  )}
                  {method.last4 && (
                    <span className="last4">•••• {method.last4}</span>
                  )}
                  {method.expiryMonth && method.expiryYear && (
                    <span className="expiry">
                      Expires {method.expiryMonth}/{method.expiryYear}
                    </span>
                  )}
                </div>
                
                <div className="card-provider">
                  <small>{method.provider.charAt(0).toUpperCase() + method.provider.slice(1)}</small>
                </div>
              </div>

              <div className="card-actions">
                {!method.isDefault && (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    className="btn-link"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => handleRemove(method.id)}
                  className="btn-danger-link"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <AddPaymentMethodModal
          onClose={() => setShowAddForm(false)}
          onSuccess={loadPaymentMethods}
        />
      )}
    </div>
  );
};

export default PaymentMethodsPage;
```

#### 2. Payment History Component

```typescript
import React, { useState, useEffect } from 'react';
import { getPaymentHistory } from './services/api';

const PaymentHistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [currentPage, statusFilter]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await getPaymentHistory(
        currentPage,
        10,
        statusFilter || undefined
      );
      setTransactions(response.transactions);
      setPagination(response.pagination);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'success':
        return 'green';
      case 'pending':
      case 'created':
      case 'initiated':
        return 'orange';
      case 'failed':
      case 'canceled':
      case 'cancelled':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (loading && transactions.length === 0) {
    return <div>Loading payment history...</div>;
  }

  return (
    <div className="payment-history-page">
      <h1>Payment History</h1>

      {/* Status Filter */}
      <div className="filter-section">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as TransactionStatus | '');
            setCurrentPage(1);
          }}
        >
          <option value="">All Transactions</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <p>No payment history found.</p>
        </div>
      ) : (
        <>
          <div className="transactions-list">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-card">
                <div className="transaction-header">
                  <div className="transaction-id">
                    {transaction.transaction_id}
                  </div>
                  <div
                    className={`status-badge status-${getStatusColor(transaction.status)}`}
                  >
                    {transaction.status}
                  </div>
                </div>

                <div className="transaction-details">
                  <div className="detail-row">
                    <span className="label">Amount:</span>
                    <span className="value amount">
                      {transaction.currency} {transaction.amount.toFixed(2)}
                    </span>
                  </div>
                  
                  {transaction.description && (
                    <div className="detail-row">
                      <span className="label">Description:</span>
                      <span className="value">{transaction.description}</span>
                    </div>
                  )}
                  
                  {transaction.bookingRef && (
                    <div className="detail-row">
                      <span className="label">Booking:</span>
                      <span className="value">{transaction.bookingRef}</span>
                    </div>
                  )}
                  
                  <div className="detail-row">
                    <span className="label">Date:</span>
                    <span className="value">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </button>
              
              <span>Page {pagination.page} of {pagination.pages}</span>
              
              <button
                disabled={currentPage === pagination.pages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PaymentHistoryPage;
```

---

## How It All Works Together

### 1. User Flow - Saving a Payment Method

```
1. User makes a payment via Revolut/Stripe
2. Payment provider returns payment method ID
3. Frontend calls: POST /api/payments/methods
   {
     "paymentMethodId": "pm_xxxxx",
     "provider": "revolut",
     "type": "card",
     "cardBrand": "visa",
     "last4": "1234",
     ...
   }
4. Backend saves to user.savedPaymentMethods[]
5. Method available for future quick checkouts
```

### 2. Transaction Flow - Linking to User

```
1. User creates transaction (payment)
2. Backend creates Transaction with user reference:
   Transaction.create({
     user: req.user._id,  // ← User reference
     amount: 299.99,
     ...
   })
3. Transaction appears in user's payment history
4. Can be queried via GET /api/payments/history
```

### 3. Dashboard Integration

```typescript
// On dashboard, show both:

// 1. Payment methods count
const methods = await getPaymentMethods();
console.log(`${methods.length} saved cards`);

// 2. Recent transactions
const { transactions } = await getPaymentHistory(1, 5);
console.log(`Last 5 transactions`);
```

---

## Testing Examples

### cURL Examples

**Get Payment Methods:**
```bash
curl -X GET http://localhost:5001/api/payments/methods \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Add Payment Method:**
```bash
curl -X POST http://localhost:5001/api/payments/methods \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethodId": "pm_1234567890",
    "provider": "revolut",
    "type": "card",
    "cardBrand": "visa",
    "last4": "1234",
    "expiryMonth": "12",
    "expiryYear": "2028",
    "nickname": "My Visa",
    "isDefault": false
  }'
```

**Remove Payment Method:**
```bash
curl -X DELETE http://localhost:5001/api/payments/methods/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Set Default:**
```bash
curl -X PATCH http://localhost:5001/api/payments/methods/507f1f77bcf86cd799439011/default \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Get Payment History:**
```bash
curl -X GET "http://localhost:5001/api/payments/history?page=1&limit=10&status=completed" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Best Practices

### Security
1. **Never store actual card numbers** - Only last 4 digits
2. **Store payment method IDs from provider** - Not card details
3. **Always use HTTPS** in production
4. **Validate expiry dates** before using saved methods
5. **PCI compliance** - Let payment providers handle sensitive data

### UX
1. **Auto-set first method as default**
2. **Confirm before deleting** payment methods
3. **Show expiry warnings** for soon-to-expire cards
4. **Display payment provider logos**
5. **Allow nicknames** for easy identification

### Performance
1. **Cache payment methods** on client side
2. **Paginate payment history**
3. **Load methods on demand**
4. **Debounce searches** in payment history

---

## Common Issues & Troubleshooting

### Issue: Payment method not saving
**Cause:** Missing required fields or validation errors.  
**Solution:** Ensure `paymentMethodId`, `provider`, and `type` are provided.

### Issue: Can't delete default payment method
**Cause:** System doesn't prevent this, but auto-assigns new default.  
**Solution:** Remove method normally - if it was default, first remaining becomes default.

### Issue: Payment history shows no transactions
**Cause:** Transactions were created before user reference was added.  
**Solution:** Run migration to link existing transactions to users (see below).

### Issue: Duplicate payment methods
**Cause:** Same `paymentMethodId` added twice.  
**Solution:** Backend prevents this, returns 400 error.

---

## Database Migration (Optional)

If you have existing transactions without user references:

```javascript
// Migration script: linkTransactionsToUsers.js
const Transaction = require('./models/Transaction');
const User = require('./models/User');

async function linkTransactions() {
  const transactions = await Transaction.find({ user: null });
  
  for (const transaction of transactions) {
    // Find user by email
    const user = await User.findOne({ email: transaction.email });
    
    if (user) {
      transaction.user = user._id;
      await transaction.save();
      console.log(`Linked transaction ${transaction.transaction_id} to user ${user.email}`);
    }
  }
  
  console.log('Migration complete!');
}

linkTransactions();
```

---

## API Response Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Payment method added |
| 400 | Bad Request | Validation error or duplicate |
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not Found | Payment method not found |
| 500 | Server Error | Internal server error |

---

## Support

For any issues or questions, contact the backend team or refer to the main API documentation.

**Related Documentation:**
- [User Profile API Documentation](./USER_PROFILE_API_DOCS.md)
- [User Dashboard API Documentation](./USER_DASHBOARD_API_DOCS.md)
- [Passenger Booking API Documentation](./PASSENGER_BOOKING_API_DOCS.md)

**Last Updated:** January 20, 2026
