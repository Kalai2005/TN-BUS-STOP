# MongoDB Backend API Quick Reference

**Base URL**: `http://localhost:5000/api`

---

## 🔐 Authentication

### Register
```
POST /auth/register
Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "9876543210",
  "role": "passenger" // optional: passenger|conductor|admin
}

Response: { success: true, user: {...}, token: "...", refreshToken: "..." }
```

### Login
```
POST /auth/login
Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "password123"
}

Response: { success: true, user: {...}, token: "...", refreshToken: "..." }
```

### Get Profile
```
GET /auth/profile
Authorization: Bearer {token}

Response: { id, email, name, phone, role, ... }
```

### Update Profile
```
PUT /auth/profile
Authorization: Bearer {token}
Content-Type: application/json

Body: { name: "New Name", phone: "9999999999", profilePicture: "url" }

Response: { success: true, user: {...} }
```

### Change Password
```
POST /auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "currentPassword": "old123",
  "newPassword": "new123"
}

Response: { success: true, message: "Password changed successfully" }
```

### Logout
```
POST /auth/logout
Authorization: Bearer {token}

Response: { success: true, message: "Logged out successfully" }
```

---

## 🚌 Routes

### Search Routes
```
POST /routes/search
Content-Type: application/json

Body:
{
  "source": "Chennai",
  "destination": "Madurai"
}

Response: { success: true, count: 5, routes: [...] }
```

### Get All Routes
```
GET /routes?source=Chennai&destination=Madurai&isLocal=false

Response: { success: true, count: 10, routes: [...] }
```

### Get Route by City
```
GET /routes/city/Chennai

Response: { success: true, count: 3, routes: [...] }
```

### Get Single Route
```
GET /routes/{routeId}

Response: { success: true, route: {...} }
```

### Create Route (Admin)
```
POST /routes/create
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "routeName": "Chennai - Madurai Express",
  "routeNumber": "RT001",
  "source": "Chennai",
  "destination": "Madurai",
  "distance": 150,
  "stops": [
    {
      "stopName": "Chennai Central",
      "stopTime": "06:00",
      "distance": 0
    }
  ],
  "estimatedDuration": "03:30",
  "basePrice": 200,
  "pricePerKm": 1.2,
  "isLocalRoute": false
}

Response: { success: true, message: "Route created successfully", route: {...} }
```

---

## 🚐 Buses

### Get All Buses
```
GET /buses?type=TNSTC&active=true

Query Parameters:
- type: TNSTC|KSRTC|SETC|Local buses|Private
- active: true|false

Response: { success: true, count: 20, buses: [...] }
```

### Get Bus Details
```
GET /buses/{busId}

Response: { success: true, bus: {...} }
```

### Get Available Seats
```
GET /buses/{busId}/available-seats?journeyDate=2026-04-05

Response: 
{
  "success": true,
  "busId": "{busId}",
  "journeyDate": "2026-04-05",
  "totalSeats": 36,
  "availableCount": 28,
  "seats": [
    { "number": "1-1", "isAvailable": true },
    { "number": "1-2", "isAvailable": false },
    ...
  ]
}
```

### Create Bus (Admin)
```
POST /buses/create
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "busNumber": "TN-30-L-7015",
  "busType": "TNSTC",
  "registrationNumber": "TN-01-AA-0001",
  "totalSeats": 36,
  "operatorName": "TNSTC",
  "driverName": "Ram Kumar",
  "driverPhone": "9876543210",
  "manufacturingYear": 2022,
  "amenities": ["wifi", "charging"],
  "seatLayout": { "rows": 12, "seatsPerRow": 3 }
}

Response: { success: true, message: "Bus created successfully", bus: {...} }
```

---

## 📅 Bookings

### Create Booking
```
POST /bookings/create
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "busId": "{busId}",
  "routeId": "{routeId}",
  "seatNumbers": ["1-1", "1-2"],
  "journeyDate": "2026-04-05T06:00:00Z",
  "boardingPoint": "Chennai Central",
  "droppingPoint": "Madurai Junction",
  "totalPrice": 500,
  "pricePerSeat": 250,
  "paymentMethod": "card"
}

Response: { success: true, message: "Booking created successfully", booking: {...} }
```

### Get My Bookings
```
GET /bookings/my-bookings
Authorization: Bearer {token}

Response: { success: true, count: 5, bookings: [...] }
```

### Get Booking Details
```
GET /bookings/{bookingId}
Authorization: Bearer {token}

Response: { success: true, booking: {...} }
```

### Cancel Booking
```
POST /bookings/{bookingId}/cancel
Authorization: Bearer {token}
Content-Type: application/json

Body: { reason: "Flight scheduled earlier" }

Response: { success: true, message: "Booking cancelled successfully", booking: {...} }
```

### Update Booking (Admin)
```
PUT /bookings/{bookingId}
Authorization: Bearer {token}
Content-Type: application/json

Body: { status: "completed", paymentStatus: "completed" }

Response: { success: true, message: "Booking updated successfully", booking: {...} }
```

---

## 👨‍✈️ Conductors

### Get All Conductors
```
GET /conductors

Response: { success: true, count: 15, conductors: [...] }
```

### Get Conductor Details
```
GET /conductors/{conductorId}

Response: { success: true, conductor: {...} }
```

### Create Conductor (Admin)
```
POST /conductors/create
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "userId": "{userId}",
  "licenseNumber": "LIC123456",
  "licenseExpiry": "2027-12-31",
  "yearsOfExperience": 5,
  "documents": {
    "aadhar": "url_to_aadhar",
    "drivingLicense": "url_to_license",
    "panCard": "url_to_pan"
  }
}

Response: { success: true, message: "Conductor profile created successfully", conductor: {...} }
```

### Assign Bus to Conductor (Admin)
```
POST /conductors/{conductorId}/assign-bus
Authorization: Bearer {token}
Content-Type: application/json

Body: { busId: "{busId}" }

Response: { success: true, message: "Bus assigned successfully", conductor: {...} }
```

### Assign Routes to Conductor (Admin)
```
POST /conductors/{conductorId}/assign-routes
Authorization: Bearer {token}
Content-Type: application/json

Body: { routeIds: ["{routeId1}", "{routeId2}"] }

Response: { success: true, message: "Routes assigned successfully", conductor: {...} }
```

### Update Conductor Rating (Admin)
```
POST /conductors/{conductorId}/update-rating
Authorization: Bearer {token}
Content-Type: application/json

Body: { rating: 4.5 }

Response: { success: true, message: "Rating updated successfully", conductor: {...} }
```

---

## 🏥 Health Check

### Server Status
```
GET /health

Response: { success: true, message: "Server is running", timestamp: "2026-04-03T..." }
```

---

## 📝 Common Response Structures

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "message": "Error description"
}
```

---

## 🔑 API Key Management

**Token Storage:**
```javascript
// After login, store token
localStorage.setItem('authToken', response.token);

// Retrieve token for requests
const token = localStorage.getItem('authToken');

// Clear token on logout
localStorage.removeItem('authToken');
```

**Using Token in Requests:**
```javascript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

fetch('http://localhost:5000/api/bookings/my-bookings', {
  method: 'GET',
  headers: headers
});
```

---

## 🚨 Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | No token or invalid token | Login and get new token |
| 403 Forbidden | Insufficient permissions | Use admin account or correct role |
| 404 Not Found | Resource doesn't exist | Check ID or endpoint URL |
| 400 Bad Request | Missing/invalid fields | Check request body format |
| 500 Server Error | Server issue | Check server logs |

---

## 📱 Frontend Integration Example

```javascript
const API_BASE = 'http://localhost:5000/api';

// Login
async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  localStorage.setItem('authToken', data.token);
  return data;
}

// Search Routes
async function searchRoutes(source, destination) {
  const res = await fetch(`${API_BASE}/routes/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, destination })
  });
  return res.json();
}

// Create Booking
async function createBooking(bookingData) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/bookings/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookingData)
  });
  return res.json();
}
```

---

**Ready to integrate into your frontend!** 🚀
