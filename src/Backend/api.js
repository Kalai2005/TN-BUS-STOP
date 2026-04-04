// MongoDB Backend API Client
const API_BASE_URL = typeof window !== 'undefined' 
  ? (process.env.VITE_API_URL || 'http://localhost:5000/api')
  : 'http://localhost:5000/api';

// Helper to get auth token
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

// Helper to make authenticated requests
const makeRequest = async (method, endpoint, body = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `API Error: ${response.status}`);
  }

  return data;
};

export const api = {
  // ==================== ROUTES ====================
  search: (source, destination) => 
    makeRequest('POST', '/routes/search', { source, destination }),

  getAllRoutes: () =>
    makeRequest('GET', '/routes'),

  getRoutesByCity: (city) =>
    makeRequest('GET', `/routes/city/${city}`),

  getRouteById: (routeId) =>
    makeRequest('GET', `/routes/${routeId}`),

  createRoute: (routeData) =>
    makeRequest('POST', '/routes/create', routeData),

  updateRoute: (routeId, routeData) =>
    makeRequest('PUT', `/routes/${routeId}`, routeData),

  deleteRoute: (routeId) =>
    makeRequest('DELETE', `/routes/${routeId}`),

  // ==================== BUSES ====================
  getAllBuses: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return makeRequest('GET', `/buses${params ? '?' + params : ''}`);
  },

  getBusById: (busId) =>
    makeRequest('GET', `/buses/${busId}`),

  getAvailableSeats: (busId, journeyDate) =>
    makeRequest('GET', `/buses/${busId}/available-seats?journeyDate=${journeyDate}`),

  createBus: (busData) =>
    makeRequest('POST', '/buses/create', busData),

  updateBus: (busId, busData) =>
    makeRequest('PUT', `/buses/${busId}`, busData),

  // ==================== BOOKINGS ====================
  book: (bookingData) =>
    makeRequest('POST', '/bookings/create', bookingData),

  getUserBookings: () =>
    makeRequest('GET', '/bookings/my-bookings'),

  getBookingById: (bookingId) =>
    makeRequest('GET', `/bookings/${bookingId}`),

  cancelBooking: (bookingId, reason = '') =>
    makeRequest('POST', `/bookings/${bookingId}/cancel`, { reason }),

  updateBooking: (bookingId, bookingData) =>
    makeRequest('PUT', `/bookings/${bookingId}`, bookingData),

  // ==================== CONDUCTORS ====================
  getAllConductors: () =>
    makeRequest('GET', '/conductors'),

  getConductorById: (conductorId) =>
    makeRequest('GET', `/conductors/${conductorId}`),

  createConductor: (conductorData) =>
    makeRequest('POST', '/conductors/create', conductorData),

  updateConductor: (conductorId, conductorData) =>
    makeRequest('PUT', `/conductors/${conductorId}`, conductorData),

  assignBusToConductor: (conductorId, busId) =>
    makeRequest('POST', `/conductors/${conductorId}/assign-bus`, { busId }),

  assignRoutesToConductor: (conductorId, routeIds) =>
    makeRequest('POST', `/conductors/${conductorId}/assign-routes`, { routeIds }),

  updateConductorRating: (conductorId, rating) =>
    makeRequest('POST', `/conductors/${conductorId}/update-rating`, { rating }),

  // ==================== TRAVEL ADVICE ====================
  getAdvice: (source, destination) =>
    makeRequest('POST', '/advice', { source, destination }),

  // ==================== LEGACY METHODS (for backward compatibility) ====================
  getScheduleById: (scheduleId) =>
    makeRequest('GET', `/buses/${scheduleId}`),

  getBookedSeats: (scheduleId) =>
    makeRequest('GET', `/buses/${scheduleId}/available-seats`),

  getScheduleStops: (scheduleId) =>
    makeRequest('GET', `/routes/${scheduleId}`),

  getAdminStats: () =>
    makeRequest('GET', '/admin/stats'),

  conductorScan: ({ qrCode, busNumber = '' }) =>
    makeRequest('POST', '/conductor/scan', { qr_code: qrCode, bus_number: busNumber }),

  issuePhysicalTicket: ({ bookingId, conductorId }) =>
    makeRequest('POST', '/conductor/issue-physical', { booking_id: bookingId, conductor_id: conductorId }),
};

export default api;
