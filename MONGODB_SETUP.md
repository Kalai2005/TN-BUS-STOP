# MongoDB Backend Setup Guide

## 📋 Completed Implementation

Your bus transport system backend has been successfully migrated from Firebase to MongoDB with Express.js. Here's what has been implemented:

### ✅ **Core Infrastructure**

1. **MongoDB Connection** (`src/Backend/config/mongoDb.js`)
   - Automated connection handling
   - Error management
   - Connection pooling support

2. **Database Models** (Mongoose Schemas)
   - User (Authentication & Profiles)
   - Booking (Trip Reservations)
   - Bus (Fleet Management)
   - Route (Route Information)
   - Conductor (Staff Management)

3. **Authentication System**
   - JWT-based token generation
   - Password hashing with bcryptjs
   - Role-based access control (RBAC)
   - Refresh token mechanism
   - Token verification middleware

---

## 🚀 **Getting Started**

### Step 1: Set Up Environment Variables

Create a `.env` file in your project root:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bus_system

# OpenAI / ChatGPT Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_REFRESH_EXPIRE=30d

# Server Configuration
PORT=5000
NODE_ENV=development
HOST=localhost

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### Step 2: MongoDB Setup

**Option A: MongoDB Atlas (Cloud - Recommended)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Generate connection string with credentials
5. Update `MONGODB_URI` in `.env`

**Option B: Local MongoDB**
```bash
# MongoDB Local Connection String
MONGODB_URI=mongodb://localhost:27017/bus_system
```

### Step 3: Start the Server

```bash
# Install dependencies (already done)
npm install

# Development mode with auto-reload
npm run dev

# Production mode
NODE_ENV=production npm start
```

The server will:
- ✅ Connect to MongoDB
- ✅ Use OpenAI for chatbot replies and travel advice
- ✅ Start on `http://localhost:5000`
- ✅ Serve API on `/api/`
- ✅ Serve React frontend from Vite

---

## 📚 **API Endpoints**

### Authentication Routes (`/api/auth`)
```javascript
POST   /api/auth/register          // Create new user
POST   /api/auth/login             // Login user
GET    /api/auth/profile           // Get user profile (protected)
PUT    /api/auth/profile           // Update profile (protected)
POST   /api/auth/change-password   // Change password (protected)
POST   /api/auth/logout            // Logout (protected)
```

**Login Request Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "passenger"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "..."
}
```

---

### Booking Routes (`/api/bookings`)
```javascript
POST   /api/bookings/create        // Create new booking (protected)
GET    /api/bookings/my-bookings   // Get user's bookings (protected)
GET    /api/bookings/:bookingId    // Get booking details (protected)
POST   /api/bookings/:bookingId/cancel  // Cancel booking (protected)
PUT    /api/bookings/:bookingId    // Update booking (admin only)
```

---

### Bus Routes (`/api/buses`)
```javascript
GET    /api/buses                  // Get all buses
GET    /api/buses/:busId           // Get bus details
POST   /api/buses/create           // Create bus (admin only)
PUT    /api/buses/:busId           // Update bus (admin only)
GET    /api/buses/:busId/available-seats  // Get available seats
```

---

### Route Routes (`/api/routes`)
```javascript
GET    /api/routes                 // Get all routes
POST   /api/routes/search          // Search routes by city
GET    /api/routes/:routeId        // Get route details
POST   /api/routes/create          // Create route (admin only)
PUT    /api/routes/:routeId        // Update route (admin only)
DELETE /api/routes/:routeId        // Deactivate route (admin only)
GET    /api/routes/city/:city      // Get routes by city
```

---

### Conductor Routes (`/api/conductors`)
```javascript
GET    /api/conductors             // Get all conductors
GET    /api/conductors/:conductorId  // Get conductor details
POST   /api/conductors/create      // Create conductor (admin only)
PUT    /api/conductors/:conductorId // Update conductor (admin only)
POST   /api/conductors/:conductorId/assign-bus    // Assign bus
POST   /api/conductors/:conductorId/assign-routes // Assign routes
POST   /api/conductors/:conductorId/update-rating // Update rating
```

---

## 🔐 **Authentication Usage in Frontend**

### Using Tokens in API Calls

```javascript
// In your frontend API service
const API_BASE_URL = 'http://localhost:5000/api';

// Get token from localStorage
const token = localStorage.getItem('authToken');

// Make authenticated request
const response = await fetch(`${API_BASE_URL}/auth/profile`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Frontend Integration Example

Update your `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';

export const api = {
  // Auth endpoints
  auth: {
    login: async (email, password) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      return data;
    },
    
    register: async (userData) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return response.json();
    },
    
    logout: async () => {
      const token = localStorage.getItem('authToken');
      localStorage.removeItem('authToken');
      return fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
  },

  // Bookings endpoints
  bookings: {
    create: async (bookingData) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/bookings/create`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });
      return response.json();
    },

    getMyBookings: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/bookings/my-bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.json();
    }
  },

  // Routes endpoints
  routes: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/routes`);
      return response.json();
    },

    search: async (source, destination) => {
      const response = await fetch(`${API_BASE_URL}/routes/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, destination })
      });
      return response.json();
    }
  },

  // Buses endpoints
  buses: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/buses`);
      return response.json();
    },

    getAvailableSeats: async (busId, journeyDate) => {
      const response = await fetch(
        `${API_BASE_URL}/buses/${busId}/available-seats?journeyDate=${journeyDate}`
      );
      return response.json();
    }
  }
};
```

---

## 📊 **Database Schema Overview**

### Users Collection
```json
{
  "_id": ObjectId,
  "email": "user@example.com",
  "password": "hashed_password",
  "name": "John Doe",
  "phone": "9876543210",
  "role": "passenger|conductor|admin",
  "profilePicture": "url",
  "isActive": true,
  "lastLogin": ISODate,
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### Bookings Collection
```json
{
  "_id": ObjectId,
  "userId": ObjectId,
  "busId": ObjectId,
  "routeId": ObjectId,
  "seatNumbers": ["1-1", "1-2"],
  "journeyDate": ISODate,
  "boardingPoint": "Chennai",
  "droppingPoint": "Madurai",
  "totalPassengers": 2,
  "totalPrice": 500,
  "pricePerSeat": 250,
  "status": "confirmed|cancelled|completed",
  "paymentStatus": "pending|completed|refunded",
  "paymentMethod": "card|upi|wallet|cash",
  "transactionId": "TXN123",
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### Buses Collection
```json
{
  "_id": ObjectId,
  "busNumber": "TN-30-L-7015",
  "busType": "TNSTC|KSRTC|SETC|Local buses|Private",
  "registrationNumber": "TN-01-AA-0001",
  "totalSeats": 36,
  "seatLayout": { "rows": 12, "seatsPerRow": 3 },
  "amenities": ["wifi", "charging", "blanket"],
  "operatorName": "TNSTC",
  "driverName": "Ram Kumar",
  "driverPhone": "9876543210",
  "conductorId": ObjectId,
  "routeIds": [ObjectId],
  "manufacturingYear": 2022,
  "isActive": true,
  "isOutOfService": false,
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### Routes Collection
```json
{
  "_id": ObjectId,
  "routeName": "Chennai - Madurai Express",
  "routeNumber": "RT001",
  "source": "Chennai",
  "destination": "Madurai",
  "distance": 150,
  "stops": [
    { "stopName": "Chennai Central", "stopTime": "06:00", "distance": 0 },
    { "stopName": "Ranipet", "stopTime": "07:30", "distance": 40 }
  ],
  "estimatedDuration": "03:30",
  "basePrice": 200,
  "pricePerKm": 1.2,
  "isActive": true,
  "isLocalRoute": false,
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

---

## 🔧 **Next Steps for Frontend Migration**

1. **Update Login/Register Pages**
   - Replace Firebase auth calls with `/api/auth/` endpoints
   - Store JWT token in localStorage
   - Update auth context to use new tokens

2. **Update Booking Pages**
   - Connect to `/api/bookings/` endpoints
   - Display available seats from `/api/buses/:busId/available-seats`

3. **Update Search Pages**
   - Connect to `/api/routes/search` for route search
   - Display bus availability via `/api/routes/` endpoints

4. **Update Protected Routes**
   - Use JWT token from localStorage
   - Verify token before accessing protected pages

5. **Update Admin Dashboard**
   - Connect to `/api/buses/create`, `/api/routes/create`
   - Use admin-only endpoints with proper role checks

---

## 🧪 **Testing with cURL**

### Test Health Check
```bash
curl http://localhost:5000/api/health
```

### Test Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@123",
    "name": "Test User",
    "phone": "9876543210"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@123"
  }'
```

### Test Protected Endpoint
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📝 **File Structure**

```
src/Backend/
├── config/
│   └── mongoDb.js              # MongoDB connection
├── models/
│   ├── User.js                 # User schema
│   ├── Booking.js              # Booking schema
│   ├── Bus.js                  # Bus schema
│   ├── Route.js                # Route schema
│   └── Conductor.js            # Conductor schema
├── middleware/
│   └── auth.js                 # JWT & role middleware
├── routes/
│   ├── authRoutes.js           # Auth API routes
│   ├── bookingRoutes.js        # Booking API routes
│   ├── busRoutes.js            # Bus API routes
│   ├── routeRoutes.js          # Route API routes
│   └── conductorRoutes.js      # Conductor API routes
├── authService.js             # Auth business logic
└── geminiService.js           # Gemini AI service
```

---

## ⚠️ **Important Notes**

1. **MongoDB URI**: Update `MONGODB_URI` before deploying
2. **JWT Secret**: Change `JWT_SECRET` in production
3. **CORS**: Update `CORS_ORIGIN` to match your frontend domain
4. **Firebase Cleanup**: Remove Firebase dependencies when fully migrated:
   ```bash
   npm uninstall firebase firebase-admin
   ```

---

## 🐛 **Troubleshooting**

**MongoDB Connection Error**
- Verify MongoDB URI is correct
- Check MongoDB Atlas IP whitelist
- Ensure credentials are URL-encoded

**JWT Token Errors**
- Verify token is sent in Authorization header as `Bearer TOKEN`
- Check token expiry and refresh if needed
- Clear localStorage and re-login

**CORS Errors**
- Update `CORS_ORIGIN` to match frontend URL
- Ensure frontend uses `http://localhost:5000` for API calls

---

## 📞 **Support**

For issues or questions, refer to:
- [Mongoose Documentation](https://mongoosejs.com)
- [Express.js Guide](https://expressjs.com)
- [MongoDB Atlas Docs](https://docs.mongodb.com/atlas)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)

---

**Migration Status**: ✅ **Backend Complete** | ⏳ **Frontend Integration Pending**
