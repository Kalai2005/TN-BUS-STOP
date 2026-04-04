const API_ORIGIN = String(import.meta.env.VITE_API_URL || '').trim();
const API_BASE_URL = API_ORIGIN
  ? (API_ORIGIN.endsWith('/api')
      ? API_ORIGIN.replace(/\/+$/, '')
      : `${API_ORIGIN.replace(/\/+$/, '')}/api`)
  : '/api';

const normalizeLegacyId = (value) => String(value || '').trim().split(':')[0];

const getLegacyScheduleContext = async (scheduleId) => {
  const busId = normalizeLegacyId(scheduleId);
  const busResponse = await makeRequest('GET', `/buses/${busId}`);
  const bus = busResponse?.bus || busResponse;

  let route = null;
  const routeRef = Array.isArray(bus?.routeIds) ? bus.routeIds[0] : bus?.routeIds;
  const routeId = typeof routeRef === 'object'
    ? (routeRef?._id || routeRef?.id)
    : routeRef;

  if (routeId) {
    try {
      const routeResponse = await makeRequest('GET', `/routes/${routeId}`);
      route = routeResponse?.route || routeResponse;
    } catch {
      route = null;
    }
  }

  return { bus, route };
};

const getAuthToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('authToken');
};

const makeRequest = async (method, endpoint, body = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || `API Error: ${response.status}`);
  }

  return data;
};

export const api = {
  search: (source, destination) => makeRequest('POST', '/routes/search', { source, destination }),
  getAllRoutes: () => makeRequest('GET', '/routes'),
  getRoutesByCity: (city) => makeRequest('GET', `/routes/city/${encodeURIComponent(city)}`),
  getRouteById: (routeId) => makeRequest('GET', `/routes/${routeId}`),
  createRoute: (routeData) => makeRequest('POST', '/routes/create', routeData),
  updateRoute: (routeId, routeData) => makeRequest('PUT', `/routes/${routeId}`, routeData),
  deleteRoute: (routeId) => makeRequest('DELETE', `/routes/${routeId}`),

  getAllBuses: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return makeRequest('GET', `/buses${params ? `?${params}` : ''}`);
  },
  getBusById: (busId) => makeRequest('GET', `/buses/${busId}`),
  getAvailableSeats: (busId, journeyDate) => makeRequest('GET', `/buses/${busId}/available-seats?journeyDate=${encodeURIComponent(journeyDate)}`),
  createBus: (busData) => makeRequest('POST', '/buses/create', busData),
  updateBus: (busId, busData) => makeRequest('PUT', `/buses/${busId}`, busData),

  book: async (bookingData) => {
    const legacyScheduleId = bookingData?.scheduleId || bookingData?.busId || bookingData?.schedule_id;
    const { bus, route } = legacyScheduleId ? await getLegacyScheduleContext(legacyScheduleId) : { bus: null, route: null };
    const seatNumber = String(bookingData?.seatNumber || '').trim();
    const journeyDate = bookingData?.journeyDate || new Date().toISOString().slice(0, 10);
    const ticketCount = Math.max(1, Number(bookingData?.ticketCount) || 1);

    const normalizedSeatNumbers = Array.isArray(bookingData?.seatNumbers) && bookingData.seatNumbers.length > 0
      ? bookingData.seatNumbers
      : (seatNumber && seatNumber !== 'N/A'
          ? [seatNumber]
          : Array.from({ length: ticketCount }, (_, index) => `LOCAL-${index + 1}`));

    const payload = {
      busId: bus?._id || normalizeLegacyId(legacyScheduleId),
      routeId: route?._id || route?.id || null,
      seatNumbers: normalizedSeatNumbers,
      journeyDate,
      boardingPoint: bookingData?.boardingStop || bookingData?.boardingPoint || route?.source || bus?.source || '',
      droppingPoint: bookingData?.dropStop || bookingData?.droppingPoint || route?.destination || bus?.destination || '',
      totalPrice: bookingData?.totalPrice || bookingData?.total_fare || bookingData?.fare || 0,
      pricePerSeat: bookingData?.pricePerSeat || bookingData?.unit_fare || bookingData?.fare || 0,
      paymentMethod: bookingData?.paymentMethod || 'card',
      passengerName: bookingData?.passengerName || '',
      passengerAge: bookingData?.passengerAge || null,
      passengerGender: bookingData?.passengerGender || null,
    };

    const response = await makeRequest('POST', '/bookings/create', payload);
    const booking = response?.booking || response;
    const qrDownloadUrl = response?.qr_download_url || booking?.qr_download_url || '';

    return {
      success: true,
      bookingId: booking?._id || booking?.id || booking?.bookingId || '',
      qr_code: booking?._id || booking?.id || `BK-${Date.now()}`,
      qr_download_url: qrDownloadUrl,
      total_fare: booking?.totalPrice || payload.totalPrice || 0,
      booking_date: booking?.createdAt || new Date().toISOString(),
      source: route?.source || payload.boardingPoint,
      destination: route?.destination || payload.droppingPoint,
      departure_time: route?.stops?.[0]?.stopTime || '',
      arrival_time: route?.stops?.[Math.max((route?.stops?.length || 1) - 1, 0)]?.stopTime || '',
      bus_number: bus?.busNumber || '',
      bus_type: bus?.busType || '',
      operator: bus?.operatorName || '',
      seat_number: seatNumber || 'N/A',
      booking,
    };
  },

  getUserBookings: async () => {
    const response = await makeRequest('GET', '/bookings/my-bookings');
    return response?.bookings || response || [];
  },
  getBookingById: (bookingId) => makeRequest('GET', `/bookings/${bookingId}`),
  cancelBooking: (bookingId, reason = '') => makeRequest('POST', `/bookings/${bookingId}/cancel`, { reason }),
  updateBooking: (bookingId, bookingData) => makeRequest('PUT', `/bookings/${bookingId}`, bookingData),

  getAllConductors: () => makeRequest('GET', '/conductors'),
  getConductorById: (conductorId) => makeRequest('GET', `/conductors/${conductorId}`),
  createConductor: (conductorData) => makeRequest('POST', '/conductors/create', conductorData),
  updateConductor: (conductorId, conductorData) => makeRequest('PUT', `/conductors/${conductorId}`, conductorData),
  assignBusToConductor: (conductorId, busId) => makeRequest('POST', `/conductors/${conductorId}/assign-bus`, { busId }),
  assignRoutesToConductor: (conductorId, routeIds) => makeRequest('POST', `/conductors/${conductorId}/assign-routes`, { routeIds }),
  updateConductorRating: (conductorId, rating) => makeRequest('POST', `/conductors/${conductorId}/update-rating`, { rating }),

  getAdvice: (source, destination) => makeRequest('POST', '/advice', { source, destination }),
  getChatbotReply: (message, history = []) => makeRequest('POST', '/chatbot', { message, history }),

  getScheduleById: async (scheduleId) => {
    const { bus, route } = await getLegacyScheduleContext(scheduleId);
    return {
      success: true,
      id: bus?._id || normalizeLegacyId(scheduleId),
      bus_id: bus?._id || normalizeLegacyId(scheduleId),
      bus_number: bus?.busNumber || '',
      bus_type: bus?.busType || '',
      operator: bus?.operatorName || '',
      capacity: bus?.totalSeats || 40,
      source: route?.source || '',
      destination: route?.destination || '',
      distance_km: route?.distance || 0,
      fare: route?.basePrice || 0,
      between_stop_rate: route?.pricePerKm || 0,
      departure_time: route?.stops?.[0]?.stopTime || '',
      arrival_time: route?.stops?.[Math.max((route?.stops?.length || 1) - 1, 0)]?.stopTime || '',
      routeId: route?._id || null,
      route_doc_id: route?._id || null,
      isLocalRoute: Boolean(route?.isLocalRoute),
      bus,
      route,
    };
  },

  getBookedSeats: async (scheduleId) => {
    const busId = normalizeLegacyId(scheduleId);
    const journeyDate = new Date().toISOString().slice(0, 10);
    const availability = await makeRequest('GET', `/buses/${busId}/available-seats?journeyDate=${encodeURIComponent(journeyDate)}`);
    const bookedSeats = Array.isArray(availability?.seats)
      ? availability.seats.filter((seat) => !seat.isAvailable).map((seat) => seat.number)
      : [];

    return {
      success: true,
      busId,
      journeyDate,
      bookedSeats,
      totalSeats: availability?.totalSeats || 0,
    };
  },

  getScheduleStops: async (scheduleId) => {
    const { route } = await getLegacyScheduleContext(scheduleId);
    return {
      success: true,
      schedule_id: normalizeLegacyId(scheduleId),
      stops: Array.isArray(route?.stops) ? route.stops : [],
    };
  },
  getAdminStats: () => makeRequest('GET', '/admin/stats'),
  conductorScan: ({ qrCode, busNumber = '' }) => makeRequest('POST', '/conductor/scan', { qr_code: qrCode, bus_number: busNumber }),
  issuePhysicalTicket: ({ bookingId, conductorId }) => makeRequest('POST', '/conductor/issue-physical', { booking_id: bookingId, conductor_id: conductorId }),
};

export default api;
