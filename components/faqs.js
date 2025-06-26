import React, { useState, useEffect } from 'react';
import {
  View, 
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { faqService } from '../services/faqService';

const FaqItem = ({ item, expanded, onToggle, isDark }) => {
  return (
    <View style={[styles.faqItem, isDark && styles.darkFaqItem]}>
      <TouchableOpacity 
        style={styles.faqHeader} 
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.faqQuestion, isDark && styles.darkText]}>{item.question}</Text>
        <Ionicons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={24} 
          color={isDark ? '#CCC' : '#666'}
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={[styles.faqAnswerContainer, isDark && styles.darkFaqAnswerContainer]}>
          <Text style={[styles.faqAnswer, isDark && { color: '#CCC' }]}>{item.answer}</Text>
        </View>
      )}
    </View>
  );
};

const FaqCategory = ({ title, faqs, expandedIds, toggleFaq, isDark }) => {
  if (!faqs || faqs.length === 0) return null;
  
  return (
    <View style={styles.categoryContainer}>
      <Text style={[styles.categoryTitle, isDark && styles.darkText]}>{title}</Text>
      {faqs.map(faq => (
        <FaqItem 
          key={faq.id}
          item={faq}
          expanded={expandedIds.includes(faq.id)}
          onToggle={() => toggleFaq(faq.id)}
          isDark={isDark}
        />
      ))}
    </View>
  );
};

const FAQs = () => {
  const { isDark } = useTheme();
  const [faqs, setFaqs] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadFaqs = async () => {
      try {
        setLoading(true);
        const fetchedFaqs = await faqService.getAllFaqs();
        setFaqs(fetchedFaqs);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(fetchedFaqs.map(faq => faq.category))].filter(Boolean);
        setCategories(uniqueCategories);
        
        // Auto-expand first FAQ in each category for better UX
        if (fetchedFaqs.length > 0) {
          const categorizedFaqs = {};
          uniqueCategories.forEach(category => {
            categorizedFaqs[category] = fetchedFaqs.filter(faq => faq.category === category);
          });
          
          // Get first FAQ from each category
          const firstFaqIds = Object.values(categorizedFaqs)
            .map(categoryFaqs => categoryFaqs[0]?.id)
            .filter(Boolean);
            
          setExpandedIds(firstFaqIds);
        }
      } catch (err) {
        console.error('Error fetching FAQs:', err);
        setError('Failed to load FAQs. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadFaqs();
  }, []);

  const toggleFaq = (id) => {
    setExpandedIds(prevIds => 
      prevIds.includes(id) 
        ? prevIds.filter(faqId => faqId !== id) 
        : [...prevIds, id]
    );
  };

  const renderCategorySection = () => {
    return (
      <View>
        {categories.map(category => (
          <FaqCategory
            key={category}
            title={category || 'General'}
            faqs={faqs.filter(faq => faq.category === category)}
            expandedIds={expandedIds}
            toggleFaq={toggleFaq}
            isDark={isDark}
          />
        ))}
        
        {/* For FAQs without a category */}
        {faqs.some(faq => !faq.category) && (
          <FaqCategory
            title="General"
            faqs={faqs.filter(faq => !faq.category)}
            expandedIds={expandedIds}
            toggleFaq={toggleFaq}
            isDark={isDark}
          />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centeredContainer, isDark && styles.darkContainer]}>
        <ActivityIndicator size="large" color="#0061FF" />
        <Text style={[styles.loadingText, isDark && styles.darkText]}>Loading FAQs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centeredContainer, isDark && styles.darkContainer]}>
        <Ionicons name="alert-circle-outline" size={48} color={isDark ? '#FFF' : '#666'} />
        <Text style={[styles.errorText, isDark && styles.darkText]}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => {
            setError(null);
            setLoading(true);
            faqService.getAllFaqs()
              .then(fetchedFaqs => {
                setFaqs(fetchedFaqs);
                setLoading(false);
              })
              .catch(err => {
                console.error('Error retrying fetch FAQs:', err);
                setError('Failed to load FAQs. Please try again later.');
                setLoading(false);
              });
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      {faqs.length === 0 ? (
        <View style={styles.centeredContainer}>
          <Ionicons name="help-circle-outline" size={48} color={isDark ? '#CCC' : '#666'} />
          <Text style={[styles.noFaqsText, isDark && styles.darkText]}>
            No FAQs available at the moment.
          </Text>
        </View>
      ) : (
        renderCategorySection()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  faqItem: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkFaqItem: {
    backgroundColor: '#2A2A2A',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    paddingRight: 16,
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  darkFaqAnswerContainer: {
    borderTopColor: '#3A3A3A',
  },
  faqAnswer: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
  },
  darkText: {
    color: '#FFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#0061FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  noFaqsText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default FAQs; 