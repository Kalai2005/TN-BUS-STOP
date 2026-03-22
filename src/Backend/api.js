export const api = {
  search: (source, destination) => 
    fetch(`/api/search?source=${source}&destination=${destination}`).then(r => r.json()),
  
  getAdvice: (source, destination) =>
    fetch('/api/advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, destination })
    }).then(r => r.json()),

  getScheduleById: (scheduleId) =>
    fetch(`/api/schedules/${scheduleId}`).then(r => r.json()),

  getBookedSeats: (scheduleId) =>
    fetch(`/api/schedules/${scheduleId}/seats`).then(r => r.json()),

  getScheduleStops: (scheduleId) =>
    fetch(`/api/schedules/${scheduleId}/stops`).then(r => r.json()),

  book: ({ scheduleId, seatNumber, passengerName, passengerAge, passengerGender, userId = 1 }) =>
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedule_id: scheduleId,
        seat_number: seatNumber,
        user_id: userId,
        passenger_name: passengerName,
        passenger_age: passengerAge,
        passenger_gender: passengerGender,
      })
    }).then(r => r.json()),

  getUserBookings: (userId) =>
    fetch(`/api/user/bookings/${userId}`).then(r => r.json()),

  getAdminStats: () =>
    fetch('/api/admin/stats').then(r => r.json()),
};
