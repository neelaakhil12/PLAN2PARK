// PlanToPark Live API Configuration
// Live backend: https://api.plantopark.com

export const PUBLIC_ONLINE_URL = 'https://api.plantopark.com/api';

export const COMMON_HEADERS = {
  'Content-Type': 'application/json',
};

export const getBaseApiUrl = async () => {
  return PUBLIC_ONLINE_URL;
};

export let API_URL = PUBLIC_ONLINE_URL;

export const endpoints = {
  // Auth
  seekerLogin: `${API_URL}/auth/seeker/login`,
  seekerSignup: `${API_URL}/auth/seeker/signup`,
  ownerLogin: `${API_URL}/auth/owner/login`,
  ownerSignup: `${API_URL}/auth/owner/signup`,
  adminLogin: `${API_URL}/auth/admin/login`,
  profile: `${API_URL}/auth/profile`,
  verifyOtp: `${API_URL}/auth/verify-otp`,
  resendOtp: `${API_URL}/auth/resend-otp`,

  // Spaces
  getSpaces: `${API_URL}/spaces`,
  getSpaceById: (id) => `${API_URL}/spaces/${id}`,
  createSpace: `${API_URL}/spaces`,
  updateSpace: (id) => `${API_URL}/spaces/${id}`,
  deleteSpace: (id) => `${API_URL}/spaces/${id}`,
  toggleSpaceStatus: (id) => `${API_URL}/spaces/${id}/toggle`,

  // Bookings
  createBooking: `${API_URL}/bookings`,
  getMyBookings: `${API_URL}/bookings/my-bookings`,
  getOwnerBookings: `${API_URL}/bookings/owner-bookings`,
  cancelBooking: (id) => `${API_URL}/bookings/${id}/cancel`,

  // Analytics
  getOwnerAnalytics: `${API_URL}/analytics/owner`,
  getAdminAnalytics: `${API_URL}/analytics/admin`,

  // Reviews & Complaints
  createReview: `${API_URL}/reviews`,
  getSpaceReviews: (spaceId) => `${API_URL}/reviews/space/${spaceId}`,
  createComplaint: `${API_URL}/complaints`,
};
