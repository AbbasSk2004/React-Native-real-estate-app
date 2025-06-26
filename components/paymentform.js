import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const PaymentForm = ({ route, navigation }) => {
  // Get the property ID and price from route params if available
  const { propertyId, price = 5 } = route?.params || {};
  
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("PaymentForm component mounted with params:", { propertyId, price });
  }, [propertyId, price]);

  const formatCardNumber = (text) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');
    // Add space after every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    // Limit to 19 characters (16 digits + 3 spaces)
    return formatted.substring(0, 19);
  };

  const formatExpiryDate = (text) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');
    // Format as MM/YY
    if (cleaned.length > 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const handleSubmit = () => {
    // Validate form
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      Alert.alert('Error', 'Please enter a valid card number');
      return;
    }
    
    if (!expiryDate || expiryDate.length < 5) {
      Alert.alert('Error', 'Please enter a valid expiry date (MM/YY)');
      return;
    }
    
    if (!cvv || cvv.length < 3) {
      Alert.alert('Error', 'Please enter a valid CVV code');
      return;
    }
    
    if (!cardholderName) {
      Alert.alert('Error', 'Please enter the cardholder name');
      return;
    }

    // Simulate payment processing
    setLoading(true);
    console.log("Processing payment...");
    
    // Simulate a network delay
    setTimeout(() => {
      setLoading(false);
      console.log("Payment processed successfully");
      
      // Show success message
      Alert.alert(
        'Payment Successful',
        'Your property has been featured successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => {
              console.log("Navigating back to MyProperties");
              // Try to navigate back to My Properties screen
              if (navigation && navigation.navigate) {
                navigation.navigate('MyProperties');
              } else if (navigation && navigation.goBack) {
                navigation.goBack();
              } else {
                console.log("Navigation props not available");
              }
            }
          }
        ]
      );
    }, 2000);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Feature Your Property</Text>
          <Text style={styles.cardSubtitle}>Payment Amount: ${price}</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.secureInfoContainer}>
            <Icon name="shield-check" size={20} color="#4CAF50" />
            <Text style={styles.secureInfoText}>Secure Payment</Text>
          </View>

          <Text style={styles.label}>Card Number</Text>
          <TextInput
            style={styles.input}
            placeholder="1234 5678 9012 3456"
            keyboardType="numeric"
            value={cardNumber}
            onChangeText={(text) => setCardNumber(formatCardNumber(text))}
            maxLength={19}
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Expiry Date</Text>
              <TextInput
                style={styles.input}
                placeholder="MM/YY"
                keyboardType="numeric"
                value={expiryDate}
                onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                maxLength={5}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>CVV</Text>
              <TextInput
                style={styles.input}
                placeholder="123"
                keyboardType="numeric"
                value={cvv}
                onChangeText={setCvv}
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>

          <Text style={styles.label}>Cardholder Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John Smith"
            value={cardholderName}
            onChangeText={setCardholderName}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Pay ${price} and Feature My Property</Text>
            )}
          </TouchableOpacity>

          <View style={styles.cardIcons}>
            <Icon name="credit-card" size={30} color="#555" style={styles.icon} />
            <Icon name="credit-card-outline" size={30} color="#555" style={styles.icon} />
            <Icon name="credit-card-multiple" size={30} color="#555" style={styles.icon} />
          </View>

          <Text style={styles.alternativePayment}>
            If you don't have a visa or credit card, please contact us to pay by other methods.
          </Text>
          
          <TouchableOpacity onPress={() => Alert.alert('Contact Information', 'Call us at: +1 (555) 123-4567\nEmail: payments@realestate.com')}>
            <Text style={styles.contactLink}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cardContent: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 6,
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  button: {
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#4e73df',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#94a3d8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  icon: {
    marginHorizontal: 8,
  },
  alternativePayment: {
    textAlign: 'center',
    marginTop: 16,
    color: '#555',
    lineHeight: 20,
  },
  contactLink: {
    textAlign: 'center',
    color: '#4e73df',
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 16,
    textDecorationLine: 'underline',
  },
  secureInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    backgroundColor: '#e8f5e9',
    padding: 8,
    borderRadius: 4,
  },
  secureInfoText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default PaymentForm;
