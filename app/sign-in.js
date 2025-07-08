import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';
// import { getImage } from '../constants/images'; // Volkswagen logo removed
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const SignInScreen = () => {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Theme colors
  const { getThemeColors, isDarkMode } = useTheme();
  const colors = getThemeColors();
  
  // --------------------
  // Header appearance based on theme
  // --------------------
  const headerThemeStyles = {
    headerStyle: {
      backgroundColor: colors.background,
    },
    headerShadowVisible: !isDarkMode,
    headerTitleStyle: {
      color: colors.text,
    },
    headerTintColor: colors.text,
  };
  
  // Redirect authenticated users away from sign-in page
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);
  
  const handleSignIn = async () => {
    if (!email || !password) {
      // Show validation error
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call auth context login method with the rememberMe state
      await login(email, password, rememberMe);
      
      // Navigate to home screen after successful login
      router.replace('/(tabs)');
    } catch (error) {
      // Normalize error message for the user
      const rawMsg = (error?.message || '').toLowerCase();
      // Prefer server-side message if available
      const serverMsg = (error?.response?.data?.message || '').toLowerCase();
      const combinedMsg = `${rawMsg} ${serverMsg}`;

      const errorCode = (error?.response?.data?.error || '').toLowerCase();

      const accountNotFound =
        error?.response?.status === 404 ||
        errorCode === 'user_not_found' ||
        errorCode === 'account_not_found' ||
        combinedMsg.includes('not found') ||
        combinedMsg.includes("doesn't exist") ||
        combinedMsg.includes('does not exist') ||
        combinedMsg.includes('not exist') ||
        combinedMsg.includes('no user') ||
        combinedMsg.includes('not registered') ||
        combinedMsg.includes('unregistered');

      if (accountNotFound) {
        Alert.alert('Account Not Found', 'No account exists with this email. Please sign up first.');
      } else if (
        rawMsg.includes('credential') ||
        (/refresh(ing)? token/.test(combinedMsg) && combinedMsg.includes('network'))) {
        Alert.alert('Invalid Credentials', 'The email or password you entered is incorrect.');
      } else if (rawMsg.includes('network')) {
        Alert.alert('Network Error', 'Please check your internet connection and try again.');
      } else {
        Alert.alert('Login Error', 'Failed to login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSignUp = () => {
    router.push('/sign-up');
  };
  
  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      enabled
    >
      <Stack.Screen 
        options={{ 
          ...headerThemeStyles,
          title: 'Sign In',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          {/* Logo removed */}
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to continue to Real Estate</Text>
        </View>
        
        <View style={styles.form}>
          <View style={[styles.inputContainer, { borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Email Address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          
          <View style={[styles.inputContainer, { borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity 
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color={colors.icon} 
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.rememberMeContainer}>
            <TouchableOpacity 
              style={styles.checkboxContainer} 
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[
                styles.checkbox,
                { borderColor: colors.border },
                rememberMe && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}>
                {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={[styles.rememberMeText, { color: colors.textSecondary }]}>Keep me signed in</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleForgotPassword}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.signInButton, { backgroundColor: colors.primary }, isLoading && styles.disabledButton]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.signInButtonText}>Loading...</Text>
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account?</Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={[styles.signUpText, { color: colors.primary }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  form: {
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#333',
    fontSize: 16,
  },
  passwordToggle: {
    padding: 8,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3366FF',
    borderColor: '#3366FF',
  },
  rememberMeText: {
    color: '#666',
    fontSize: 14,
  },
  forgotPasswordText: {
    color: '#3366FF',
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: '#3366FF',
    borderRadius: 8,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: '#8EB0FF',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  signUpText: {
    color: '#3366FF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  backButton: {
    padding: 8,
  },
});

export default SignInScreen; 