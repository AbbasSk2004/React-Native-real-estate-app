import React from 'react';
import {
  View, 
  Text,
  StyleSheet,
  ScrollView
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const Privacy = () => {
  const { isDark } = useTheme();

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <View style={styles.contentContainer}>
        <Text style={[styles.heading, isDark && styles.darkText]}>Privacy Policy</Text>
        <Text style={[styles.lastUpdated, isDark && styles.darkTextSecondary]}>Last Updated: August 1, 2023</Text>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>1. Introduction</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            We respect your privacy and are committed to protecting it through our compliance with this policy. This Privacy Policy describes the types of information we may collect from you or that you may provide when you use our real estate application ("App") and our practices for collecting, using, maintaining, protecting, and disclosing that information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>2. Information We Collect</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            We collect several types of information from and about users of our App, including:
          </Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• Personal information such as name, email address, telephone number, and postal address</Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• Information about your property searches and preferences</Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• Information about your device and internet connection, including your IP address, operating system, and browser type</Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• Location data when you permit the App to access your device's location</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>3. How We Use Your Information</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            We use information that we collect about you or that you provide to us:
          </Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• To provide you with the App and its contents, and any other information, products or services that you request from us</Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• To fulfill any other purpose for which you provide it</Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• To provide you with notices about your account</Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• To improve our App and user experience</Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• To contact you about properties that match your search criteria</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>4. Disclosure of Your Information</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            We may disclose personal information that we collect or you provide as described in this privacy policy:
          </Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• To our subsidiaries and affiliates</Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• To contractors, service providers, and other third parties we use to support our business</Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• To fulfill the purpose for which you provide it</Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• For any other purpose disclosed by us when you provide the information</Text>
          <Text style={[styles.bulletPoint, isDark && styles.darkTextSecondary]}>• To comply with any court order, law, or legal process</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>5. Data Security</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            We have implemented measures designed to secure your personal information from accidental loss and from unauthorized access, use, alteration, and disclosure. However, we cannot guarantee that unauthorized third parties will never be able to defeat those measures or use your personal information for improper purposes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>6. Your Choices About Our Collection and Use</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            You can set your browser or device to refuse all or some cookies, or to alert you when cookies are being sent. If you disable or refuse cookies or block the use of other tracking technologies, some parts of the App may not be accessible or may not function properly.
          </Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            You can choose not to provide us with certain personal information, but that may result in you being unable to use certain features of our App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>7. Children's Privacy</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            Our App is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18. If we learn we have collected or received personal information from a child under 18 without verification of parental consent, we will delete that information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>8. Changes to Our Privacy Policy</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            We may update our privacy policy from time to time. If we make material changes to how we treat our users' personal information, we will post the new privacy policy on this page with a notice that the privacy policy has been updated.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>9. Contact Information</Text>
          <Text style={[styles.paragraph, isDark && styles.darkTextSecondary]}>
            To ask questions or comment about this privacy policy and our privacy practices, contact us through the contact information provided in the App.
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
  bulletPoint: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
    marginBottom: 6,
    paddingLeft: 16,
  },
});

export default Privacy; 