import { useState, useEffect, useRef, useCallback } from 'react';
import { endpoints } from '../services/api';
import authStorage from '../utils/authStorage';
import { useAuth } from '../context/AuthContext';

export const useProfilePolling = (interval = 30000) => {
  const { isAuthenticated, updateUserState, user } = useAuth();
  const [profileData, setProfileData] = useState(authStorage.getProfileData() || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isManualUpdateRef = useRef(false);

  /**
   * Keep a mutable reference of the latest `user` object so that we can
   * access it inside stable callbacks without having to list `user` as a
   * dependency (which would otherwise recreate the callbacks/effects on
   * every user state change and trigger extra network requests).
   */
  const userRef = useRef(user);

  // Synchronise the ref whenever `user` changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Unified fetch helper – stable reference (depends only on auth state)
  const fetchProfile = useCallback(async (isManual = false) => {
    // Skip if not authenticated
    if (!isAuthenticated) return;

    try {
      if (isManual) setLoading(true);
      setError(null);

      const response = await endpoints.profile.get();

      if (response?.data?.success && response?.data?.data) {
        const newProfileData = response.data.data;
        setProfileData(newProfileData);
        authStorage.setProfileData(newProfileData);

        // Only update auth context if something actually changed to prevent
        // unnecessary re-renders that can trigger extra data fetching.
        if (updateUserState) {
          const currentUser = userRef.current;
          const updatedPhoto = newProfileData.profile_photo || currentUser?.profile_photo;

          // Simple shallow comparison of a few key fields
          const hasChanges = (
            updatedPhoto !== currentUser?.profile_photo ||
            newProfileData.firstname !== currentUser?.firstname ||
            newProfileData.lastname !== currentUser?.lastname ||
            newProfileData.phone !== currentUser?.phone
          );

          if (hasChanges) {
            updateUserState({
              ...currentUser,
              profile_photo: updatedPhoto,
              firstname: newProfileData.firstname || currentUser?.firstname,
              lastname: newProfileData.lastname || currentUser?.lastname,
              phone: newProfileData.phone || currentUser?.phone,
              profile: {
                ...(currentUser?.profile || {}),
                ...newProfileData,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err);
      setProfileData(null);
      authStorage.clearProfileData();
    } finally {
      if (isManual) setLoading(false);
    }
  }, [isAuthenticated, updateUserState]);

  // Start polling
  useEffect(() => {
    if (!isAuthenticated) {
      setProfileData(null);
      setError(null);
      return;
    }

    // Immediate fetch
    fetchProfile(false);

    const pollInterval = setInterval(() => fetchProfile(false), interval);
    return () => clearInterval(pollInterval);
  }, [fetchProfile, interval, isAuthenticated]);

  // Manual refresh
  const refreshProfile = async () => {
    isManualUpdateRef.current = true;
    try {
      await fetchProfile(true);
    } finally {
      isManualUpdateRef.current = false;
    }
  };

  return {
    profileData,
    loading: loading && isManualUpdateRef.current,
    error,
    refreshProfile,
  };
}; 