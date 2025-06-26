import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

export default function SearchBar({ value, onChangeText, placeholder = "Search for anything", isDark }) {
  const router = useRouter();
  
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBarWrapper}>
        <View style={[styles.inputContainer, isDark && styles.darkInputContainer]}>
          <Ionicons name="search-outline" size={20} color={isDark ? "#AAA" : "#666876"} />
          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            placeholderTextColor={isDark ? "#999" : "#666876"}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    width: '100%',
    marginVertical: 8,
  },
  searchBarWrapper: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  darkInputContainer: {
    backgroundColor: '#2A2A2A',
    borderColor: '#444',
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#191d31',
    fontWeight: '500',
  },
  darkInput: {
    color: '#FFF',
  },
}); 