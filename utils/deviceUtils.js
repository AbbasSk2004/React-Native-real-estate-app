import { Platform } from 'react-native';
import * as Network from 'expo-network';

/**
 * Get the device's IP address
 * @returns {Promise<string>} The device's IP address
 */
export const getDeviceIpAddress = async () => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.ipAddress || 'Unknown';
  } catch (error) {
    console.error('Error getting IP address:', error);
    return 'Unknown';
  }
};

/**
 * Check if the device is connected to the internet
 * @returns {Promise<boolean>} Whether the device is connected to the internet
 */
export const isConnectedToInternet = async () => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected && networkState.isInternetReachable;
  } catch (error) {
    console.error('Error checking internet connection:', error);
    return false;
  }
};

/**
 * Get information about the current environment
 * @returns {Promise<Object>} Information about the environment
 */
export const getEnvironmentInfo = async () => {
  try {
    const ipAddress = await getDeviceIpAddress();
    const isConnected = await isConnectedToInternet();
    
    return {
      platform: Platform.OS,
      isConnected,
      ipAddress,
      isEmulator: Platform.OS === 'android' && ipAddress?.startsWith('10.0.2'),
    };
  } catch (error) {
    console.error('Error getting environment info:', error);
    return {
      platform: Platform.OS,
      isConnected: false,
      ipAddress: 'Unknown',
      isEmulator: false,
    };
  }
};

export default {
  getDeviceIpAddress,
  isConnectedToInternet,
  getEnvironmentInfo
}; 