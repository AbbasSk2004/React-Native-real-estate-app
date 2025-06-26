import React from 'react';
import {
  View, 
  Text,
  StyleSheet,
  ScrollView
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const Terms = () => {
  const { isDark } = useTheme();

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <View style={styles.contentContainer}>
        <Text style={[styles.heading, isDark && styles.darkText]}>Terms of Service</Text>
        <Text style={[styles.lastUpdated, isDark && styles.darkTextSecondary]}>Last Updated: August 1, 2023</Text>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>1. Introduction</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            Welcome to our real estate application ("App"). By accessing or using our App, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>2. Definitions</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            "User", "You" and "Your" refers to you, the person accessing this App and accepting these Terms of Service.
            "Company", "Ourselves", "We", "Our" and "Us", refers to the owners of this App.
            "Party", "Parties", or "Us", refers to both the User and ourselves.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>3. User Accounts</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            When you create an account with us, you guarantee that the information you provide is accurate, complete, and current. Inaccurate, incomplete, or obsolete information may result in the immediate termination of your account.
          </Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            You are responsible for maintaining the confidentiality of your account and password, including but not limited to restricting access to your computer and/or account. You agree to accept responsibility for any and all activities that occur under your account and/or password.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>4. Property Listings</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            Our App provides a platform for users to list and browse real estate properties. We do not guarantee the accuracy of property listings. Users are responsible for verifying property information before making any decisions.
          </Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            If you choose to list a property, you must ensure that all information provided is accurate and that you have the legal right to list the property.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>5. Prohibited Uses</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            You may not use our App for any illegal purpose or to violate any laws in your jurisdiction.
            You may not use the App to engage in advertising to or solicitation of other users to buy or sell any products or services not offered through the App.
            You may not transmit any worms or viruses or any code of a destructive nature.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>6. Intellectual Property</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            The App and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of the Company and its licensors. The App is protected by copyright, trademark, and other laws.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>7. Termination</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            We may terminate or suspend your account and bar access to the App immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including but not limited to a breach of these Terms of Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>8. Limitation of Liability</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            In no event shall the Company, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, or other intangible losses, resulting from your access to or use of or inability to access or use the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>9. Changes to Terms</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>10. Contact Us</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            If you have any questions about these Terms, please contact us through the contact information provided in the App.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 50,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  darkText: {
    color: '#FFF',
  },
  darkTextSecondary: {
    color: '#CCC',
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
    marginBottom: 12,
  },
});

export default Terms; 