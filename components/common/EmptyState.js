import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * EmptyState component for displaying when no content is available
 * 
 * @param {Object} props - Component props
 * @param {string} props.icon - Ionicons icon name
 * @param {string} props.title - Title text to display
 * @param {string} props.message - Message text to display
 * @param {string} props.actionLabel - (Optional) Label for the action button
 * @param {function} props.onAction - (Optional) Callback for when action button is pressed
 * @param {Object} props.style - (Optional) Additional styles for the container
 */
export default function EmptyState({ 
  icon = 'information-circle-outline',
  title = 'No Content',
  message = 'There is nothing to display here.',
  actionLabel,
  onAction,
  style
}) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={80} color="#A0A0A0" style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'transparent',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  actionButton: {
    backgroundColor: '#0061FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 