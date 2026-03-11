import { api } from './api';

export const authService = {
  login: async (credentials) => {
    // Mock login
    return { user: { id: 1, name: 'John Doe', role: 'passenger' } };
  },
  logout: () => {
    // Mock logout
  }
};

export const bookingService = {
  createBooking: api.book,
  getUserBookings: api.getUserBookings
};
