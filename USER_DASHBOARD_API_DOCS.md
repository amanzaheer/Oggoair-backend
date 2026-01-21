# User Dashboard API - Frontend Documentation

## Overview
This document provides complete API documentation for building a user's personal dashboard, including booking statistics, recent activity, and booking management.

---

## Base URL
```
/api/bookings
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

## Endpoints

### 1. Get My Booking Statistics (Dashboard Overview)
**GET** `/api/bookings/my-stats`

**Description:** Get aggregated statistics and overview for the user's dashboard. Perfect for dashboard cards, charts, and quick summary widgets.

**Query Parameters:** None

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "overview": {
      "totalBookings": 25,
      "pendingBookings": 3,
      "confirmedBookings": 20,
      "cancelledBookings": 2,
      "totalPassengers": 68
    },
    "passengerTypes": [
      {
        "_id": "Adult",
        "count": 45
      },
      {
        "_id": "Child",
        "count": 18
      },
      {
        "_id": "Infant",
        "count": 5
      }
    ],
    "recentBookings": [
      {
        "bookingReference": "PAS1K2M3N4P5Q",
        "status": "confirmed",
        "passengerCount": 3,
        "createdAt": "2026-01-20T10:00:00.000Z"
      },
      {
        "bookingReference": "PAS1K3N4P6R",
        "status": "pending",
        "passengerCount": 2,
        "createdAt": "2026-01-19T15:30:00.000Z"
      },
      {
        "bookingReference": "PAS1K4P7Q8S",
        "status": "confirmed",
        "passengerCount": 4,
        "createdAt": "2026-01-18T09:20:00.000Z"
      },
      {
        "bookingReference": "PAS1K5Q9R0T",
        "status": "confirmed",
        "passengerCount": 1,
        "createdAt": "2026-01-17T14:45:00.000Z"
      },
      {
        "bookingReference": "PAS1K6R1S2U",
        "status": "cancelled",
        "passengerCount": 2,
        "createdAt": "2026-01-16T11:10:00.000Z"
      }
    ]
  }
}
```

**Use Cases:**
- Dashboard summary cards (Total Bookings, Confirmed, etc.)
- Pie charts showing booking status distribution
- Bar charts showing passenger type breakdown
- "Recent Activity" widget showing last 5 bookings
- Quick overview on page load

---

### 2. Get My Bookings (Full List)
**GET** `/api/bookings/my-bookings`

**Description:** Get a paginated list of all the user's bookings with complete details. Use this for the full bookings management page.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number |
| `limit` | Number | No | 10 | Results per page (max: 100) |
| `status` | String | No | - | Filter by status: `pending`, `confirmed`, or `cancelled` |

**Example Requests:**
```bash
# Get first page (10 bookings)
GET /api/bookings/my-bookings

# Get page 2 with 20 bookings per page
GET /api/bookings/my-bookings?page=2&limit=20

# Get only confirmed bookings
GET /api/bookings/my-bookings?status=confirmed

# Get pending bookings, page 1, 5 per page
GET /api/bookings/my-bookings?status=pending&page=1&limit=5
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "bookings": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "bookingReference": "PAS1K2M3N4P5Q",
        "user": "507f191e810c19729de860ea",
        "email": "user@example.com",
        "phone": {
          "dialingCode": "+1",
          "number": "2125551234"
        },
        "passengers": [
          {
            "title": "Mr",
            "firstName": "John",
            "lastName": "Doe",
            "dateOfBirth": {
              "day": 15,
              "month": 6,
              "year": 1990
            },
            "countryOfBirth": "United States",
            "countryOfResidence": "United States",
            "passportNumber": "AB123456",
            "passportExpiry": {
              "day": 15,
              "month": 6,
              "year": 2030
            },
            "address": {
              "street": "123 Main St",
              "city": "New York",
              "state": "NY",
              "postalCode": "10001",
              "country": "USA"
            },
            "age": 35,
            "passengerType": "Adult"
          },
          {
            "title": "Mrs",
            "firstName": "Jane",
            "lastName": "Doe",
            "dateOfBirth": {
              "day": 20,
              "month": 8,
              "year": 1992
            },
            "countryOfBirth": "United States",
            "passportNumber": "CD789012",
            "passportExpiry": {
              "day": 20,
              "month": 8,
              "year": 2032
            },
            "age": 33,
            "passengerType": "Adult"
          }
        ],
        "bookingStatus": "confirmed",
        "notes": {
          "type": "Special Request",
          "text": "Window seats preferred"
        },
        "flightData": {
          "departure": "JFK",
          "arrival": "LAX",
          "date": "2026-02-15"
        },
        "extraServices": null,
        "createdAt": "2026-01-20T10:00:00.000Z",
        "updatedAt": "2026-01-20T10:00:00.000Z"
      }
      // ... more bookings
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

**Use Cases:**
- Full bookings list/table page
- Search and filter bookings
- Paginated booking management
- Detailed booking information display

---

## Response Field Specifications

### Overview Object (from `/my-stats`)

| Field | Type | Description |
|-------|------|-------------|
| `totalBookings` | Number | Total number of bookings |
| `pendingBookings` | Number | Number of pending bookings |
| `confirmedBookings` | Number | Number of confirmed bookings |
| `cancelledBookings` | Number | Number of cancelled bookings |
| `totalPassengers` | Number | Total passengers across all bookings |

### Passenger Types Array (from `/my-stats`)

| Field | Type | Description |
|-------|------|-------------|
| `_id` | String | Passenger type: `Adult`, `Child`, or `Infant` |
| `count` | Number | Count of passengers of this type |

### Recent Bookings Array (from `/my-stats`)

| Field | Type | Description |
|-------|------|-------------|
| `bookingReference` | String | Unique booking reference |
| `status` | String | Booking status: `pending`, `confirmed`, or `cancelled` |
| `passengerCount` | Number | Number of passengers in this booking |
| `createdAt` | String (ISO 8601) | Booking creation date |

### Pagination Object (from `/my-bookings`)

| Field | Type | Description |
|-------|------|-------------|
| `page` | Number | Current page number |
| `limit` | Number | Results per page |
| `total` | Number | Total number of bookings |
| `pages` | Number | Total number of pages |

---

## Frontend Integration Examples

### TypeScript Type Definitions

```typescript
// Dashboard Stats Types
interface BookingOverview {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalPassengers: number;
}

interface PassengerTypeStats {
  _id: 'Adult' | 'Child' | 'Infant';
  count: number;
}

interface RecentBooking {
  bookingReference: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  passengerCount: number;
  createdAt: string;
}

interface DashboardStatsResponse {
  status: 'success' | 'error';
  data: {
    overview: BookingOverview;
    passengerTypes: PassengerTypeStats[];
    recentBookings: RecentBooking[];
  };
}

// Full Bookings Types
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
  age: number;
  passengerType: 'Adult' | 'Child' | 'Infant';
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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface MyBookingsResponse {
  status: 'success' | 'error';
  data: {
    bookings: Booking[];
    pagination: PaginationInfo;
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

// Get dashboard statistics
export const getDashboardStats = async (): Promise<DashboardStatsResponse> => {
  const response = await apiClient.get<DashboardStatsResponse>('/bookings/my-stats');
  return response.data;
};

// Get my bookings with optional filters
export const getMyBookings = async (
  page: number = 1,
  limit: number = 10,
  status?: 'pending' | 'confirmed' | 'cancelled'
): Promise<MyBookingsResponse> => {
  const params: any = { page, limit };
  if (status) params.status = status;
  
  const response = await apiClient.get<MyBookingsResponse>('/bookings/my-bookings', {
    params,
  });
  return response.data;
};
```

---

### React Components Examples

#### 1. Dashboard Page Component

```typescript
import React, { useState, useEffect } from 'react';
import { getDashboardStats } from './services/api';

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stats) return null;

  return (
    <div className="dashboard">
      <h1>My Dashboard</h1>
      
      {/* Summary Cards */}
      <div className="stats-grid">
        <StatsCard
          title="Total Bookings"
          value={stats.overview.totalBookings}
          icon="📋"
          color="blue"
        />
        <StatsCard
          title="Confirmed"
          value={stats.overview.confirmedBookings}
          icon="✅"
          color="green"
        />
        <StatsCard
          title="Pending"
          value={stats.overview.pendingBookings}
          icon="⏳"
          color="orange"
        />
        <StatsCard
          title="Total Passengers"
          value={stats.overview.totalPassengers}
          icon="👥"
          color="purple"
        />
      </div>

      {/* Passenger Distribution Chart */}
      <div className="chart-section">
        <h2>Passenger Distribution</h2>
        <PassengerTypeChart data={stats.passengerTypes} />
      </div>

      {/* Recent Bookings Widget */}
      <div className="recent-bookings">
        <h2>Recent Bookings</h2>
        <RecentBookingsList bookings={stats.recentBookings} />
        <button onClick={() => navigate('/bookings')}>
          View All Bookings →
        </button>
      </div>
    </div>
  );
};

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => (
  <div className={`stats-card stats-card-${color}`}>
    <div className="stats-icon">{icon}</div>
    <div className="stats-content">
      <div className="stats-value">{value}</div>
      <div className="stats-title">{title}</div>
    </div>
  </div>
);

// Recent Bookings List Component
interface RecentBookingsListProps {
  bookings: RecentBooking[];
}

const RecentBookingsList: React.FC<RecentBookingsListProps> = ({ bookings }) => {
  if (bookings.length === 0) {
    return <p>No bookings yet. Book your first flight!</p>;
  }

  return (
    <div className="recent-bookings-list">
      {bookings.map((booking) => (
        <div key={booking.bookingReference} className="recent-booking-item">
          <div className="booking-ref">
            <strong>{booking.bookingReference}</strong>
          </div>
          <div className="booking-info">
            <span className={`status-badge status-${booking.status}`}>
              {booking.status}
            </span>
            <span className="passenger-count">
              {booking.passengerCount} passenger{booking.passengerCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="booking-date">
            {new Date(booking.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
};

// Passenger Type Chart Component (using Chart.js or similar)
interface PassengerTypeChartProps {
  data: PassengerTypeStats[];
}

const PassengerTypeChart: React.FC<PassengerTypeChartProps> = ({ data }) => {
  // Using a chart library like recharts, chart.js, etc.
  const chartData = data.map(item => ({
    name: item._id,
    value: item.count
  }));

  return (
    <div className="passenger-chart">
      {/* Example with simple bars */}
      {data.map((item) => (
        <div key={item._id} className="chart-bar">
          <div className="bar-label">{item._id}</div>
          <div className="bar-container">
            <div 
              className="bar-fill" 
              style={{ width: `${(item.count / getTotalPassengers(data)) * 100}%` }}
            />
          </div>
          <div className="bar-value">{item.count}</div>
        </div>
      ))}
    </div>
  );
};

const getTotalPassengers = (data: PassengerTypeStats[]) => {
  return data.reduce((sum, item) => sum + item.count, 0);
};

export default DashboardPage;
```

#### 2. Bookings List Page Component

```typescript
import React, { useState, useEffect } from 'react';
import { getMyBookings } from './services/api';

const BookingsListPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'confirmed' | 'cancelled' | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, [currentPage, statusFilter]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await getMyBookings(
        currentPage,
        10,
        statusFilter || undefined
      );
      setBookings(response.data.bookings);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleStatusFilter = (status: typeof statusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  if (loading && bookings.length === 0) {
    return <div>Loading bookings...</div>;
  }

  return (
    <div className="bookings-list-page">
      <div className="page-header">
        <h1>My Bookings</h1>
        
        {/* Status Filter */}
        <div className="filter-buttons">
          <button
            className={statusFilter === '' ? 'active' : ''}
            onClick={() => handleStatusFilter('')}
          >
            All
          </button>
          <button
            className={statusFilter === 'confirmed' ? 'active' : ''}
            onClick={() => handleStatusFilter('confirmed')}
          >
            Confirmed
          </button>
          <button
            className={statusFilter === 'pending' ? 'active' : ''}
            onClick={() => handleStatusFilter('pending')}
          >
            Pending
          </button>
          <button
            className={statusFilter === 'cancelled' ? 'active' : ''}
            onClick={() => handleStatusFilter('cancelled')}
          >
            Cancelled
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>No bookings found.</p>
          <button onClick={() => navigate('/search-flights')}>
            Book a Flight
          </button>
        </div>
      ) : (
        <>
          {/* Bookings Table/Cards */}
          <div className="bookings-grid">
            {bookings.map((booking) => (
              <BookingCard key={booking._id} booking={booking} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
};

// Booking Card Component
interface BookingCardProps {
  booking: Booking;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking }) => (
  <div className="booking-card">
    <div className="booking-header">
      <h3>{booking.bookingReference}</h3>
      <span className={`status-badge status-${booking.bookingStatus}`}>
        {booking.bookingStatus}
      </span>
    </div>
    
    <div className="booking-details">
      <div className="detail-row">
        <span className="label">Passengers:</span>
        <span className="value">{booking.passengers.length}</span>
      </div>
      <div className="detail-row">
        <span className="label">Date:</span>
        <span className="value">
          {new Date(booking.createdAt).toLocaleDateString()}
        </span>
      </div>
      {booking.flightData && (
        <div className="detail-row">
          <span className="label">Route:</span>
          <span className="value">
            {booking.flightData.departure} → {booking.flightData.arrival}
          </span>
        </div>
      )}
    </div>

    <div className="booking-passengers">
      <h4>Passengers:</h4>
      <ul>
        {booking.passengers.map((passenger, index) => (
          <li key={index}>
            {passenger.title} {passenger.firstName} {passenger.lastName}
            <span className="passenger-type">({passenger.passengerType})</span>
          </li>
        ))}
      </ul>
    </div>

    <div className="booking-actions">
      <button onClick={() => navigate(`/bookings/${booking._id}`)}>
        View Details
      </button>
      {booking.bookingStatus !== 'cancelled' && (
        <button onClick={() => handleEditBooking(booking._id)}>
          Edit
        </button>
      )}
    </div>
  </div>
);

// Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="pagination">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ← Previous
      </button>
      
      {pages.map((page) => (
        <button
          key={page}
          className={page === currentPage ? 'active' : ''}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}
      
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next →
      </button>
    </div>
  );
};

export default BookingsListPage;
```

---

### Example CSS Styles

```css
/* Dashboard Styles */
.dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stats-icon {
  font-size: 2.5rem;
}

.stats-value {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
}

.stats-title {
  font-size: 0.875rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stats-card-blue { border-left: 4px solid #3b82f6; }
.stats-card-green { border-left: 4px solid #10b981; }
.stats-card-orange { border-left: 4px solid #f59e0b; }
.stats-card-purple { border-left: 4px solid #8b5cf6; }

/* Recent Bookings */
.recent-bookings {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.recent-booking-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.recent-booking-item:last-child {
  border-bottom: none;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-confirmed {
  background: #d1fae5;
  color: #065f46;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

/* Bookings List */
.bookings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.booking-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.booking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f3f4f6;
}

.booking-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.booking-actions button {
  flex: 1;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2rem;
}

.pagination button {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}

.pagination button.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## Testing Examples

### cURL Examples

**Get Dashboard Stats:**
```bash
curl -X GET http://localhost:5001/api/bookings/my-stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Get My Bookings (First Page):**
```bash
curl -X GET "http://localhost:5001/api/bookings/my-bookings?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Get Confirmed Bookings Only:**
```bash
curl -X GET "http://localhost:5001/api/bookings/my-bookings?status=confirmed" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Get Page 2 with 20 Results:**
```bash
curl -X GET "http://localhost:5001/api/bookings/my-bookings?page=2&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Dashboard Design Recommendations

### 1. Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  HEADER: User Name, Logout                          │
├─────────────────────────────────────────────────────┤
│  STATS CARDS ROW                                    │
│  [Total] [Confirmed] [Pending] [Passengers]        │
├─────────────────────────────────────────────────────┤
│  CHART SECTION                                      │
│  Passenger Distribution (Pie/Bar Chart)            │
├─────────────────────────────────────────────────────┤
│  RECENT BOOKINGS                                    │
│  • Booking 1                                        │
│  • Booking 2                                        │
│  • Booking 3                                        │
│  [View All Bookings →]                             │
└─────────────────────────────────────────────────────┘
```

### 2. Key Features

**Dashboard Page:**
- ✅ Summary cards with icons
- ✅ Visual charts/graphs
- ✅ Recent bookings preview (5 most recent)
- ✅ Quick action buttons
- ✅ "View All" link to full bookings page

**Bookings List Page:**
- ✅ Filter by status (All, Confirmed, Pending, Cancelled)
- ✅ Pagination controls
- ✅ Booking cards or table view
- ✅ Search functionality (optional)
- ✅ Sort options (optional)

### 3. Loading States

```typescript
// Dashboard loading skeleton
<div className="dashboard-skeleton">
  <div className="skeleton-cards">
    {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
  </div>
  <div className="skeleton-chart" />
  <div className="skeleton-list" />
</div>

// Bookings list loading
<div className="bookings-skeleton">
  {[1, 2, 3].map(i => <SkeletonBookingCard key={i} />)}
</div>
```

### 4. Empty States

```typescript
// No bookings yet
<div className="empty-state">
  <img src="/empty-bookings.svg" alt="No bookings" />
  <h3>No Bookings Yet</h3>
  <p>Start your journey by booking your first flight!</p>
  <button onClick={() => navigate('/search')}>
    Search Flights
  </button>
</div>
```

### 5. Error Handling

```typescript
// Error display
{error && (
  <div className="error-banner">
    <span className="error-icon">⚠️</span>
    <span>{error}</span>
    <button onClick={retry}>Retry</button>
  </div>
)}
```

---

## Performance Optimization Tips

### 1. Caching Strategy

```typescript
// Use React Query or SWR for caching
import { useQuery } from '@tanstack/react-query';

const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

const useMyBookings = (page: number, status?: string) => {
  return useQuery({
    queryKey: ['my-bookings', page, status],
    queryFn: () => getMyBookings(page, 10, status),
    keepPreviousData: true, // For smooth pagination
  });
};
```

### 2. Lazy Loading

```typescript
// Lazy load the bookings list page
const BookingsListPage = lazy(() => import('./pages/BookingsListPage'));

// In your router
<Route
  path="/bookings"
  element={
    <Suspense fallback={<LoadingSpinner />}>
      <BookingsListPage />
    </Suspense>
  }
/>
```

### 3. Debounce Filters

```typescript
import { useDebouncedValue } from './hooks/useDebounce';

const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebouncedValue(searchTerm, 500);

useEffect(() => {
  if (debouncedSearch) {
    searchBookings(debouncedSearch);
  }
}, [debouncedSearch]);
```

---

## Common Issues & Troubleshooting

### Issue: Empty statistics on dashboard
**Cause:** No bookings created yet.  
**Solution:** Show empty state with call-to-action to create first booking.

### Issue: Pagination not working
**Cause:** Not updating page state properly.  
**Solution:** Ensure `currentPage` state updates and triggers new API call.

### Issue: Stats not updating after creating booking
**Cause:** Cached data not invalidated.  
**Solution:** Invalidate cache or refetch after booking creation:
```typescript
// With React Query
queryClient.invalidateQueries(['dashboard-stats']);
queryClient.invalidateQueries(['my-bookings']);
```

### Issue: Slow dashboard load
**Cause:** Loading too much data at once.  
**Solution:** 
- Use `/my-stats` for dashboard (lightweight)
- Only load `/my-bookings` when user navigates to bookings page
- Implement proper loading states

---

## Best Practices

1. **Load dashboard stats first** - They're lightweight and fast
2. **Lazy load bookings list** - Only when user navigates there
3. **Implement proper caching** - Reduce unnecessary API calls
4. **Show loading skeletons** - Better UX than spinners
5. **Handle empty states** - Guide users to take action
6. **Use pagination** - Don't load all bookings at once
7. **Add status filters** - Help users find specific bookings
8. **Implement error boundaries** - Graceful error handling
9. **Optimize re-renders** - Use React.memo where appropriate
10. **Add analytics** - Track user interactions

---

## API Response Time Expectations

| Endpoint | Expected Response Time | Data Size |
|----------|----------------------|-----------|
| `/my-stats` | < 200ms | ~2KB |
| `/my-bookings` (10 items) | < 300ms | ~5-10KB |
| `/my-bookings` (100 items) | < 500ms | ~50-100KB |

---

## Support

For any issues or questions, contact the backend team or refer to the main API documentation.

**Related Documentation:**
- [User Profile API Documentation](./USER_PROFILE_API_DOCS.md)
- [Passenger Booking API Documentation](./PASSENGER_BOOKING_API_DOCS.md)

**Last Updated:** January 20, 2026
