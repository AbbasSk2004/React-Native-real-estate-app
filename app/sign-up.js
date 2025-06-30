import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Image,
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
import { getImage } from '../constants/images';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import authService from '../services/auth';

const SignUpScreen = () => {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // OTP verification states
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  // Get logo image safely
  const logoImage = getImage('logo');
  
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
  
  // Redirect authenticated users away from sign-up page
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);
  
  // --------------------
  // Phone number formatter (Lebanese format only)
  // --------------------
  const handlePhoneChange = (text) => {
    // Allow only digits and an optional leading '+'
    let formatted = text.replace(/[^0-9+]/g, '');

    // Ensure '+' can appear only at the beginning
    if (formatted.includes('+')) {
      if (!formatted.startsWith('+')) {
        // Remove misplaced '+' characters
        formatted = formatted.replace(/\+/g, '');
      } else {
        // Keep first '+' and remove any subsequent ones
        formatted = '+' + formatted.slice(1).replace(/\+/g, '');
      }
    }

    // Limit length: '+961' + 8 digits = 12 chars OR 8 digits without country code
    if (formatted.startsWith('+961')) {
      formatted = formatted.slice(0, 12);
    } else {
      formatted = formatted.slice(0, 8);
    }

    setPhone(formatted);
  };
  
  // --------------------
  // Input helpers
  // --------------------
  const handleEmailChange = (text) => {
    // Store trimmed lowercase email to avoid case sensitivity issues
    setEmail(text.trim().toLowerCase());
  };
  
  const handleSignUp = async () => {
    if (!firstname || !lastname || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    // Validate basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Validate Lebanese phone number format
    const lebanesePhoneRegex = /^(\+961\d{8}|\d{8})$/;
    if (!lebanesePhoneRegex.test(phone)) {
      Alert.alert('Error', 'Please enter a valid Lebanese phone number (e.g., +96176937310 or 76937310)');
      return;
    }

    setIsLoading(true);
    
    try {
      // Call auth context register method with separate firstname and lastname
      const response = await register({
        email,
        password,
        firstname,
        lastname,
        phone
      });
      
      // Handle successful registration that requires verification
      if (response.requiresVerification) {
        setIsLoading(false);
        setShowOtpInput(true);
        
        Alert.alert(
          'Verification Required',
          'Please check your email for the verification code and enter it below.'
        );
        return;
      }
      
      // If we get here, registration was successful and no verification is needed
      setIsLoading(false);
      router.replace('/(tabs)');
    } catch (error) {
      setIsLoading(false);
      
      // Check if this is the verification required error
      if (error.message && error.message.includes('verification required')) {
        // Show OTP input instead of showing an error
        setShowOtpInput(true);
        Alert.alert(
          'Verification Required',
          'Please check your email for the verification code and enter it below.'
        );
      } else if (error.message && (
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists') ||
        error.message.toLowerCase().includes('already in use')
      )) {
        // Email already exists error
        Alert.alert(
          'Account Exists',
          'This email is already registered. Please use a different email or sign in with your existing account.',
          [
            { text: 'OK' },
            { 
              text: 'Sign In', 
              onPress: () => router.replace('/sign-in')
            }
          ]
        );
      } else {
        Alert.alert('Registration Error', error.message || 'Failed to register. Please try again.');
      }
    }
  };
  
  const handleVerifyOtp = async () => {
    if (!otpCode) {
      Alert.alert('Error', 'Please enter the verification code from your email');
      return;
    }
    
    setVerifyingOtp(true);
    
    try {
      const response = await authService.verifyOtp(email, otpCode);
      
      if (response.success) {
        Alert.alert(
          'Verification Successful',
          'Your email has been verified successfully.',
          [
            {
              text: 'Sign In',
              onPress: () => router.replace('/sign-in')
            }
          ]
        );
      } else {
        Alert.alert('Verification Failed', response.message || 'Failed to verify email. Please try again.');
      }
    } catch (error) {
      Alert.alert('Verification Error', error.message || 'An error occurred during verification.');
    } finally {
      setVerifyingOtp(false);
    }
  };
  
  const handleSignIn = () => {
    router.push('/sign-in');
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
          title: showOtpInput ? 'Verify Email' : 'Sign Up',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => {
                if (showOtpInput) {
                  setShowOtpInput(false);
                } else {
                  router.back();
                }
              }}
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
          {logoImage ? (
            <Image 
              source={logoImage} 
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>REAL ESTATE</Text>
            </View>
          )}
          {showOtpInput ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Verify Your Email</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter the verification code sent to {email}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign up to get started with Real Estate</Text>
            </>
          )}
        </View>
        
        {showOtpInput ? (
          <View style={styles.form}>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Ionicons name="key-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Verification Code"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={otpCode}
                onChangeText={setOtpCode}
                maxLength={6}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.signUpButton, { backgroundColor: colors.primary }, verifyingOtp && styles.disabledButton]}
              onPress={handleVerifyOtp}
              disabled={verifyingOtp}
            >
              {verifyingOtp ? (
                <Text style={styles.signUpButtonText}>Verifying...</Text>
              ) : (
                <Text style={styles.signUpButtonText}>Verify Email</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="First Name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                value={firstname}
                onChangeText={setFirstname}
              />
            </View>
            
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Last Name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                value={lastname}
                onChangeText={setLastname}
              />
            </View>
            
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email Address"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={handleEmailChange}
              />
            </View>
            
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Ionicons name="call-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Phone Number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={12}
                value={phone}
                onChangeText={handlePhoneChange}
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
            
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity 
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={colors.icon} 
                />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.signUpButton, { backgroundColor: colors.primary }, isLoading && styles.disabledButton]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.signUpButtonText}>Loading...</Text>
              ) : (
                <Text style={styles.signUpButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account?</Text>
          <TouchableOpacity onPress={handleSignIn}>
            <Text style={[styles.signInText, { color: colors.primary }]}>Sign In</Text>
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#3366FF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
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
  signUpButton: {
    backgroundColor: '#3366FF',
    borderRadius: 8,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  signInText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3366FF',
  },
  backButton: {
    padding: 8,
  },
});

export default SignUpScreen; 