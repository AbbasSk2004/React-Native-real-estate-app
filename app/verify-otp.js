import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import authService from '../services/auth';

const VerifyOTPScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email = '', mode = 'reset' } = params;
  
  const [isLoading, setIsLoading] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Create refs for each OTP input field
  const inputRefs = useRef([...Array(6)].map(() => React.createRef()));
  
  // Theme colors
  const { getThemeColors, isDarkMode } = useTheme();
  const colors = getThemeColors();
  
  // Header appearance based on theme
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
  
  // Auto-focus first input on mount
  useEffect(() => {
    // Add small delay to ensure the component is fully rendered
    const timer = setTimeout(() => {
      if (inputRefs.current[0]?.current) {
        inputRefs.current[0].current.focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleOtpChange = (text, index) => {
    // Only allow digits
    if (!/^\d*$/.test(text)) return;
    
    // Update the OTP digits array
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = text;
    setOtpDigits(newOtpDigits);
    
    // Auto-advance to next input or submit if last digit
    if (text.length === 1) {
      if (index < 5) {
        // Focus next input
        inputRefs.current[index + 1].current.focus();
      } else if (mode === 'reset' && newOtpDigits.every(digit => digit !== '')) {
        // If all digits are filled and we're in reset mode, show password fields
        setShowPasswordFields(true);
      }
    }
  };
  
  const handleKeyPress = (e, index) => {
    // Go back to previous input on backspace if current input is empty
    if (e.nativeEvent.key === 'Backspace' && otpDigits[index] === '' && index > 0) {
      inputRefs.current[index - 1].current.focus();
    }
  };
  
  const validatePassword = () => {
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    
    return true;
  };
  
  const handleVerifyOTP = async () => {
    const otp = otpDigits.join('');
    
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter all 6 digits of the verification code');
      return;
    }
    
    if (mode === 'reset') {
      if (!showPasswordFields) {
        setShowPasswordFields(true);
        return;
      }
      
      if (!validatePassword()) {
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      if (mode === 'reset') {
        // Reset password with OTP and new password
        const response = await authService.resetPassword(email, otp, newPassword);
        
        if (response.success) {
          Alert.alert('Success', 'Your password has been reset successfully', [
            { text: 'OK', onPress: () => router.push('/sign-in') }
          ]);
        } else {
          Alert.alert('Error', response.message || 'Failed to reset password. Please try again.');
        }
      } else {
        // Handle email verification
        const response = await authService.verifyOtp(email, otp);
        
        if (response.success) {
          Alert.alert('Success', 'Email verified successfully', [
            { text: 'OK', onPress: () => router.push('/sign-in') }
          ]);
        } else {
          Alert.alert('Error', response.message || 'Failed to verify code. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendCode = async () => {
    setIsLoading(true);
    
    try {
      // Re-request password reset code
      const response = await authService.forgotPassword(email);
      
      if (response.success) {
        Alert.alert('Success', 'A new code has been sent to your email');
      } else {
        Alert.alert('Error', response.message || 'Failed to resend code. Please try again.');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Failed to resend code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
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
          title: mode === 'reset' ? 'Reset Password' : 'Verify Code',
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
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>
            {showPasswordFields ? 'Create New Password' : 'Verification Code'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {showPasswordFields 
              ? 'Enter your new password below'
              : `Enter the 6-digit code we sent to your email ${email}`
            }
          </Text>
          
          {!showPasswordFields && (
            <View style={styles.otpContainer}>
              {otpDigits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={inputRefs.current[index]}
                  style={[
                    styles.otpInput,
                    { 
                      borderColor: colors.border,
                      backgroundColor: colors.cardBackground,
                      color: colors.text
                    }
                  ]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>
          )}
          
          {showPasswordFields && mode === 'reset' && (
            <View style={styles.passwordContainer}>
              {/* New Password Input */}
              <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="New Password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity 
                  style={styles.passwordToggle}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons 
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={colors.icon} 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Confirm Password Input */}
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
              
              <Text style={[styles.passwordRequirement, { color: colors.textSecondary }]}>
                • Password must be at least 8 characters
              </Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.primary }, isLoading && styles.disabledButton]}
            onPress={handleVerifyOTP}
            disabled={isLoading || (
              showPasswordFields ? (!newPassword || !confirmPassword) : otpDigits.some(digit => digit === '')
            )}
          >
            {isLoading ? (
              <Text style={styles.actionButtonText}>Processing...</Text>
            ) : (
              <Text style={styles.actionButtonText}>
                {mode === 'reset' && showPasswordFields ? 'Reset Password' : 'Verify Code'}
              </Text>
            )}
          </TouchableOpacity>
          
          {!showPasswordFields && (
            <View style={styles.resendContainer}>
              <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                Didn't receive the code?
              </Text>
              <TouchableOpacity 
                onPress={handleResendCode}
                disabled={isLoading}
              >
                <Text style={[styles.resendLinkText, { color: colors.primary }]}>
                  Resend Code
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
  },
  passwordContainer: {
    width: '100%',
    marginBottom: 20,
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
    width: '100%',
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
  passwordRequirement: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#3366FF',
    borderRadius: 8,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  disabledButton: {
    backgroundColor: '#8EB0FF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLinkText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    color: '#3366FF',
  },
  backButton: {
    padding: 8,
  },
});

export default VerifyOTPScreen; 