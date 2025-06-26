import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config/constants';
import { getEnvironmentInfo } from '../utils/deviceUtils';
import api from '../services/api';

export default function NetworkInfo() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [apiUrl, setApiUrl] = useState(API_BASE_URL);
  const [apiStatus, setApiStatus] = useState(null);
  const [testingApi, setTestingApi] = useState(false);

  useEffect(() => {
    fetchNetworkInfo();
  }, []);

  const fetchNetworkInfo = async () => {
    try {
      setLoading(true);
      const info = await getEnvironmentInfo();
      setNetworkInfo(info);
    } catch (error) {
      console.error('Error fetching network info:', error);
      Alert.alert('Error', 'Failed to fetch network information');
    } finally {
      setLoading(false);
    }
  };

  const testApiConnection = async () => {
    try {
      setTestingApi(true);
      setApiStatus(null);
      
      // Try to connect to the API server
      const isConnected = await api.checkHealth();
      
      setApiStatus({
        success: isConnected,
        message: isConnected ? 'Successfully connected to API server!' : 'Failed to connect to API server'
      });
    } catch (error) {
      console.error('Error testing API connection:', error);
      setApiStatus({
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`
      });
    } finally {
      setTestingApi(false);
    }
  };

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${text} copied to clipboard`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Network Info',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0061FF" />
          <Text style={styles.loadingText}>Loading network information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Network Info',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Network Information</Text>
          <Text style={styles.subtitle}>
            Use this information to configure your API URL in constants.js
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="phone-portrait" size={24} color="#0061FF" />
            <Text style={styles.cardTitle}>Device Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform:</Text>
            <Text style={styles.infoValue}>{networkInfo?.platform || 'Unknown'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Is Emulator:</Text>
            <Text style={styles.infoValue}>{networkInfo?.isEmulator ? 'Yes' : 'No'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wifi" size={24} color="#0061FF" />
            <Text style={styles.cardTitle}>Network Status</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Connected:</Text>
            <Text style={[
              styles.infoValue, 
              {color: networkInfo?.isConnected ? '#4CAF50' : '#FF3B30'}
            ]}>
              {networkInfo?.isConnected ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device IP:</Text>
            <TouchableOpacity onPress={() => copyToClipboard(networkInfo?.ipAddress)}>
              <Text style={[styles.infoValue, styles.copyableText]}>
                {networkInfo?.ipAddress || 'Unknown'} 
                <Ionicons name="copy-outline" size={16} color="#0061FF" />
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="server" size={24} color="#0061FF" />
            <Text style={styles.cardTitle}>API Configuration</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current API URL:</Text>
            <TouchableOpacity onPress={() => copyToClipboard(apiUrl)}>
              <Text style={[styles.infoValue, styles.copyableText]}>
                {apiUrl} <Ionicons name="copy-outline" size={16} color="#0061FF" />
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.testApiButton, 
              testingApi && styles.testingApiButton
            ]}
            onPress={testApiConnection}
            disabled={testingApi}
          >
            {testingApi ? (
              <>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.testApiButtonText}>Testing Connection...</Text>
              </>
            ) : (
              <>
                <Ionicons name="pulse" size={18} color="#FFF" />
                <Text style={styles.testApiButtonText}>Test API Connection</Text>
              </>
            )}
          </TouchableOpacity>
          
          {apiStatus && (
            <View style={[
              styles.apiStatusContainer,
              apiStatus.success ? styles.apiStatusSuccess : styles.apiStatusError
            ]}>
              <Ionicons 
                name={apiStatus.success ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color={apiStatus.success ? "#4CAF50" : "#FF3B30"} 
              />
              <Text style={styles.apiStatusText}>{apiStatus.message}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Recommended Config:</Text>
            <View>
              <Text style={styles.codeBlock}>
                {`// In config/constants.js
const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001/api';
  }
  if (Platform.OS === 'android' && isEmulator) {
    return 'http://10.0.2.2:3001/api';
  }
  // For Expo Go on physical device
  return 'http://${networkInfo?.ipAddress || '192.168.x.x'}:3001/api';
};`}
              </Text>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => copyToClipboard(`// In config/constants.js
const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001/api';
  }
  if (Platform.OS === 'android' && isEmulator) {
    return 'http://10.0.2.2:3001/api';
  }
  // For Expo Go on physical device
  return 'http://${networkInfo?.ipAddress}:3001/api';
};`)}
              >
                <Ionicons name="copy" size={16} color="#FFF" />
                <Text style={styles.copyButtonText}>Copy Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchNetworkInfo}
        >
          <Ionicons name="refresh" size={20} color="#FFF" />
          <Text style={styles.refreshButtonText}>Refresh Information</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    padding: 16,
  },
  backButton: {
    marginLeft: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    width: 120,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  copyableText: {
    color: '#0061FF',
    textDecorationLine: 'underline',
  },
  codeBlock: {
    fontFamily: 'monospace',
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    color: '#333',
    marginTop: 8,
  },
  copyButton: {
    backgroundColor: '#0061FF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  copyButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    backgroundColor: '#0061FF',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  refreshButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  testApiButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  testingApiButton: {
    backgroundColor: '#888',
  },
  testApiButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  apiStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  apiStatusSuccess: {
    backgroundColor: '#E8F5E9',
  },
  apiStatusError: {
    backgroundColor: '#FFEBEE',
  },
  apiStatusText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
}); 