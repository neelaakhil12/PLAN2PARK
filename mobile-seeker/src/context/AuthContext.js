import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseApiUrl, COMMON_HEADERS } from '../config/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('user_token');
      const storedUser = await AsyncStorage.getItem('user_data');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        fetchProfile(storedToken);
      }
    } catch (e) {
      console.error('Failed to load auth state', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (authToken) => {
    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/auth/profile`, {
        headers: { ...COMMON_HEADERS, Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        await AsyncStorage.setItem('user_data', JSON.stringify(data));
      } else {
        logout();
      }
    } catch (err) {
      console.log('Profile fetch error:', err.message);
    }
  };

  const loginForRole = async (role, email, password) => {
    const baseUrl = await getBaseApiUrl();
    const endpoint = `${baseUrl}/auth/${role}/login`;

    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify({ email, password }),
      });
    } catch (netErr) {
      throw new Error(`Cannot connect to server. Please check your internet connection.`);
    }

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.message || 'Login failed');
      error.isEmailVerified = data.isEmailVerified;
      error.email = data.email;
      throw error;
    }

    const userData = {
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role || role,
      contact: data.contact,
      status: data.status,
      profileImage: data.profileImage || '',
      vehicles: data.vehicles || [],
      isEmailVerified: data.isEmailVerified,
      isNewlyRegistered: false,
    };

    setToken(data.token);
    setUser(userData);
    await AsyncStorage.setItem('user_token', data.token);
    await AsyncStorage.setItem('user_data', JSON.stringify(userData));

    return userData;
  };

  const signupForRole = async (role, name, email, password, contact) => {
    const baseUrl = await getBaseApiUrl();
    const endpoint = `${baseUrl}/auth/${role}/signup`;

    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify({ name, email, password, contact }),
      });
    } catch (netErr) {
      throw new Error(`Cannot connect to server. Please check your internet connection.`);
    }

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.message || 'Signup failed');
      error.isEmailVerified = data.isEmailVerified;
      error.email = data.email;
      throw error;
    }

    if (data.token) {
      const userData = {
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role || role,
        contact: data.contact,
        status: data.status,
        profileImage: data.profileImage || '',
        vehicles: data.vehicles || [],
        isEmailVerified: data.isEmailVerified,
        isNewlyRegistered: true,
      };
      setToken(data.token);
      setUser(userData);
      await AsyncStorage.setItem('user_token', data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    }

    return data;
  };

  const updateProfile = async (profileData) => {
    const baseUrl = await getBaseApiUrl();
    const currentToken = token || (await AsyncStorage.getItem('user_token'));

    const updatedVehicles = profileData.vehicleNumber
      ? [{ plateNumber: profileData.vehicleNumber, vehicleType: 'Car' }]
      : (user?.vehicles && user.vehicles.length > 0 ? user.vehicles : [{ plateNumber: 'TS 07 AB 1234', vehicleType: 'Car' }]);

    const localUpdatedUser = {
      ...user,
      ...profileData,
      contact: profileData.contact || user?.contact,
      vehicles: updatedVehicles,
      profileImage: profileData.passPhoto || profileData.profileImage || user?.profileImage,
    };

    // Update state & AsyncStorage immediately so UI updates & modal closes
    setUser(localUpdatedUser);
    try {
      await AsyncStorage.setItem('user_data', JSON.stringify(localUpdatedUser));
    } catch (e) {
      console.error('AsyncStorage error:', e);
    }

    // Sync to backend server
    try {
      const res = await fetch(`${baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: {
          ...COMMON_HEADERS,
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(profileData),
      });

      if (res.ok) {
        const data = await res.json();
        const finalMerged = {
          ...localUpdatedUser,
          ...data,
          vehicles: (data.vehicles && data.vehicles.length > 0) ? data.vehicles : updatedVehicles,
        };
        setUser(finalMerged);
        await AsyncStorage.setItem('user_data', JSON.stringify(finalMerged));
        return finalMerged;
      }
    } catch (err) {
      console.log('Backend sync error:', err.message);
    }

    return localUpdatedUser;
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user_token');
      await AsyncStorage.removeItem('user_data');
    } catch (e) {
      console.error(e);
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, loginForRole, signupForRole, updateProfile, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
