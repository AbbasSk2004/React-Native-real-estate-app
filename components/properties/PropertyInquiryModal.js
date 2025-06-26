import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

const PropertyInquiryModal = ({ visible, onClose, onSubmit, propertyTitle, propertyOwnerId, isDark = false }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  
  // Check if current user is the property owner using provided owner id
  const isOwner = isAuthenticated && user && propertyOwnerId === user?.id;
  
  // Close modal if user is the owner
  useEffect(() => {
    if (visible && isOwner) {
      // Just close the modal without showing an alert - since the owner shouldn't see this modal at all
      onClose();
    }
  }, [visible, isOwner, onClose]);
  
  // Extra check to prevent showing the modal content for owners
  if (isOwner) {
    return null;
  }
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!subject.trim()) {
      newErrors.subject = 'Subject is required';
    } else if (subject.length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters';
    }
    
    if (!message.trim()) {
      newErrors.message = 'Message is required';
    } else if (message.length < 20) {
      newErrors.message = 'Message must be at least 20 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async () => {
    // Additional check to prevent submission if user is the owner
    if (isOwner) {
      // Simply close without alert since we shouldn't even get here
      onClose();
      return;
    }
    
    if (!isAuthenticated) {
      onClose();
      router.push('/sign-in');
      return;
    }
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await onSubmit({
        subject,
        message
      });
      
      // Reset form and close modal
      setSubject('');
      setMessage('');
      setErrors({});
      onClose();
      
      // Show success alert
      Alert.alert(
        'Inquiry Sent',
        'Your inquiry has been sent successfully. The property owner will contact you soon.'
      );
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to send inquiry. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    if (loading) return;
    
    // Reset form on close
    setSubject('');
    setMessage('');
    setErrors({});
    onClose();
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, isDark && styles.darkModalContainer]}>
          <View style={[styles.modalHeader, isDark && styles.darkModalHeader]}>
            <Text style={[styles.modalTitle, isDark && styles.darkText]}>Send Inquiry</Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClose}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color={isDark ? "#CCC" : "#666"} />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Property Title */}
            <View style={styles.propertyInfo}>
              <Text style={[styles.propertyTitle, isDark && styles.darkText]}>{propertyTitle}</Text>
            </View>
            
            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={[styles.inputLabel, isDark && styles.darkText]}>Subject</Text>
              <TextInput
                style={[
                  styles.input, 
                  errors.subject && styles.inputError,
                  isDark && styles.darkInput
                ]}
                placeholder="Enter subject"
                placeholderTextColor={isDark ? "#999" : "#999"}
                value={subject}
                onChangeText={setSubject}
                editable={!loading}
              />
              {errors.subject && (
                <Text style={styles.errorText}>{errors.subject}</Text>
              )}
              
              <Text style={[styles.inputLabel, isDark && styles.darkText]}>Message</Text>
              <TextInput
                style={[
                  styles.textArea, 
                  errors.message && styles.inputError,
                  isDark && styles.darkInput
                ]}
                placeholder="Enter your message"
                placeholderTextColor={isDark ? "#999" : "#999"}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!loading}
              />
              {errors.message && (
                <Text style={styles.errorText}>{errors.message}</Text>
              )}
            </View>
          </ScrollView>
          
          <View style={[styles.modalFooter, isDark && styles.darkModalFooter]}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton, isDark && styles.darkCancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, isDark && { color: '#0061FF' }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Send Inquiry</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  darkModalContainer: {
    backgroundColor: '#1A1A1A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  darkModalHeader: {
    borderBottomColor: '#333333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  darkText: {
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  propertyInfo: {
    marginBottom: 24,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  formContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    color: '#333',
  },
  darkInput: {
    backgroundColor: '#2A2A2A',
    borderColor: '#444',
    color: '#FFFFFF',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#FFFFFF',
    color: '#333',
  },
  inputError: {
    borderColor: '#FF4949',
  },
  errorText: {
    color: '#FF4949',
    fontSize: 14,
    marginTop: -12,
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  darkModalFooter: {
    borderTopColor: '#333333',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  darkCancelButton: {
    backgroundColor: 'transparent',
  },
  submitButton: {
    backgroundColor: '#0061FF',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  cancelButtonText: {
    color: '#0061FF',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PropertyInquiryModal; 