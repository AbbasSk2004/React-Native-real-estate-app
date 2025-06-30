import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function PaymentMethods() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { isDark, getThemeColors } = useTheme();
  const colors = getThemeColors();
  const [isLoading, setIsLoading] = useState(false);
  
  // --------------------
  // Header appearance based on theme
  // --------------------
  const headerThemeStyles = {
    headerStyle: {
      backgroundColor: colors.background,
    },
    headerShadowVisible: !isDark,
    headerTitleStyle: {
      color: colors.text,
    },
    headerTintColor: colors.text,
  };

  // Mock payment history data based on the schema.sql payment table structure
  const mockPaymentHistory = [
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      amount: 250.00,
      payment_type: 'property_featuring',
      payment_status: 'completed',
      card_last_four: '4242',
      transaction_id: 'txn_1KjX8zLkj82nJd9',
      payment_method: 'credit_card',
      billing_name: 'John Doe',
      description: 'Feature property for 30 days',
      created_at: '2023-09-15T14:30:00Z'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440005',
      amount: 99.99,
      payment_type: 'subscription',
      payment_status: 'completed',
      card_last_four: '4242',
      transaction_id: 'txn_1KjY7zLkj82nJd9',
      payment_method: 'credit_card',
      billing_name: 'John Doe',
      description: 'Premium subscription - Monthly',
      created_at: '2023-08-15T10:15:00Z'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440006',
      amount: 50.00,
      payment_type: 'property_boost',
      payment_status: 'completed',
      card_last_four: '5555',
      transaction_id: 'txn_1KjZ9zLkj82nJd9',
      payment_method: 'credit_card',
      billing_name: 'John Doe',
      description: 'Boost property in search results',
      created_at: '2023-07-22T09:45:00Z'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440007',
      amount: 99.99,
      payment_type: 'subscription',
      payment_status: 'failed',
      card_last_four: '4242',
      transaction_id: 'txn_1KkX8zLkj82nJd9',
      payment_method: 'credit_card',
      billing_name: 'John Doe',
      description: 'Premium subscription - Monthly (Failed payment)',
      created_at: '2023-07-15T10:15:00Z'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440008',
      amount: 199.99,
      payment_type: 'subscription',
      payment_status: 'completed',
      card_last_four: '9876',
      transaction_id: 'txn_1KlX8zLkj82nJd9',
      payment_method: 'paypal',
      billing_name: 'John Doe',
      description: 'Premium subscription - Annual',
      created_at: '2023-06-10T16:20:00Z'
    }
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderPaymentItem = ({ item }) => (
    <View style={[styles.paymentItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.paymentHeader}>
        <Text style={[styles.paymentDescription, { color: colors.text }]}>{item.description}</Text>
        <Text style={[
          styles.paymentAmount, 
          { color: colors.text },
          item.payment_status === 'failed' && styles.failedPayment
        ]}>
          ${item.amount.toFixed(2)}
        </Text>
      </View>
      <View style={styles.paymentDetails}>
        <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
          {formatDate(item.created_at)}
        </Text>
        <View style={styles.paymentStatus}>
          <View style={[
            styles.statusIndicator, 
            item.payment_status === 'completed' ? styles.completedStatus : styles.failedStatus
          ]} />
          <Text style={[
            styles.statusText, 
            { color: colors.textSecondary },
            item.payment_status === 'failed' && styles.failedStatusText
          ]}>
            {item.payment_status === 'completed' ? 'Completed' : 'Failed'}
          </Text>
        </View>
      </View>
      <View style={styles.paymentMethod}>
        <Ionicons 
          name={item.payment_method === 'credit_card' ? 'card-outline' : 'logo-paypal'} 
          size={16} 
          color={colors.textSecondary} 
        />
        <Text style={[styles.paymentMethodText, { color: colors.textSecondary }]}>
          {item.payment_method === 'credit_card' 
            ? `Card ending in ${item.card_last_four}` 
            : 'PayPal'}
        </Text>
      </View>
      <Text style={[styles.transactionId, { color: colors.textMuted }]}>
        Transaction ID: {item.transaction_id}
      </Text>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            ...headerThemeStyles,
            headerTitle: 'Payment Methods',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Login Required</Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            Please sign in to view your payment methods and transaction history.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/sign-in')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          ...headerThemeStyles,
          headerTitle: 'Payment Methods',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Payment Methods Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Payment Methods</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => Alert.alert('Add Payment Method', 'This feature is coming soon!')}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Saved Cards */}
        <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="card-outline" size={24} color={colors.primary} />
            <View style={styles.cardDetails}>
              <Text style={[styles.cardName, { color: colors.text }]}>Visa ending in 4242</Text>
              <Text style={[styles.cardExpiry, { color: colors.textSecondary }]}>Expires 12/2025</Text>
            </View>
            <TouchableOpacity style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.cardAction}
              onPress={() => Alert.alert('Edit Card', 'This feature is coming soon!')}
            >
              <Ionicons name="pencil-outline" size={16} color={colors.primary} />
              <Text style={[styles.cardActionText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.cardAction}
              onPress={() => Alert.alert('Remove Card', 'Are you sure you want to remove this card?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive' }
              ])}
            >
              <Ionicons name="trash-outline" size={16} color="#FF4949" />
              <Text style={[styles.cardActionText, { color: '#FF4949' }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.addPaymentButton, { backgroundColor: colors.primary }]}
          onPress={() => Alert.alert('Add Payment Method', 'This feature is coming soon!')}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addPaymentButtonText}>Add Payment Method</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction History Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction History</Text>
        
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={mockPaymentHistory}
            renderItem={renderPaymentItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.paymentList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyPayments}>
                <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
                <Text style={[styles.emptyPaymentsText, { color: colors.text }]}>
                  No transactions yet
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  addButton: {
    padding: 8,
  },
  cardContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDetails: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '500',
  },
  cardExpiry: {
    fontSize: 14,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  defaultText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  cardActionText: {
    fontSize: 14,
    marginLeft: 4,
  },
  addPaymentButton: {
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  addPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  paymentList: {
    paddingTop: 8,
  },
  paymentItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentDescription: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentDate: {
    fontSize: 14,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  completedStatus: {
    backgroundColor: '#4CAF50',
  },
  failedStatus: {
    backgroundColor: '#FF4949',
  },
  statusText: {
    fontSize: 14,
  },
  failedStatusText: {
    color: '#FF4949',
  },
  failedPayment: {
    color: '#FF4949',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    marginLeft: 6,
  },
  transactionId: {
    fontSize: 12,
  },
  emptyPayments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyPaymentsText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#0061FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginTop: 20,
  }
}); 