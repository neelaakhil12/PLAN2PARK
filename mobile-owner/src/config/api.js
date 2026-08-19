// PlanToPark Owner App API Configuration
// Live AWS EC2 backend: http://43.204.235.124:5000

import { Platform } from 'react-native';

export const PUBLIC_ONLINE_URL = 'http://43.204.235.124:5000/api';

export const COMMON_HEADERS = {
  'Content-Type': 'application/json',
};

export const getBaseApiUrl = async () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window?.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    try {
      const testRes = await fetch('http://localhost:5000/', { method: 'GET' });
      if (testRes.ok) return 'http://localhost:5000/api';
    } catch (e) {
      // Local backend port 5000 not reachable, fallback to AWS
    }
  }
  return PUBLIC_ONLINE_URL;
};

export let API_URL = PUBLIC_ONLINE_URL;

export const getImageUrl = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=1200&q=80';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const isLocal = Platform.OS === 'web' && typeof window !== 'undefined' && window?.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const baseUrl = isLocal ? 'http://localhost:5000' : 'http://43.204.235.124:5000';
    return `${baseUrl}${cleanPath}`;
  }
  return url;
};

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
