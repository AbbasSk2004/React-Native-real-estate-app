// Cookie consent utilities
export const getCookieConsent = () => {
  try {
    const consent = localStorage.getItem('cookieConsent');
    return consent ? JSON.parse(consent) : null;
  } catch (error) {
    console.error('Error reading cookie consent:', error);
    return null;
  }
};

export const setCookieConsent = (preferences) => {
  try {
    const consentData = {
      ...preferences,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(consentData));
    return true;
  } catch (error) {
    console.error('Error setting cookie consent:', error);
    return false;
  }
};

export const hasConsentFor = (cookieType) => {
  const consent = getCookieConsent();
  return consent ? consent[cookieType] === true : false;
};

export const isConsentRequired = () => {
  return getCookieConsent() === null;
};

// Initialize services based on consent
export const initializeAnalytics = () => {
  if (hasConsentFor('analytics')) {
    // Initialize Google Analytics
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
  }
};

export const initializeMarketing = () => {
  if (hasConsentFor('marketing')) {
    // Initialize marketing tools
    if (window.gtag) {
      window.gtag('consent', 'update', {
        ad_storage: 'granted'
      });
    }
  }
};

// Cookie management functions
export const deleteCookiesByType = (type) => {
  if (type === 'analytics') {
    // Delete analytics cookies
    document.cookie = '_ga=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = '_gid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = '_gat=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
  
  if (type === 'marketing') {
    // Delete marketing cookies
    document.cookie = '_fbp=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = '_fbc=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
};

export const updateCookieConsent = (newPreferences) => {
  const currentConsent = getCookieConsent();
  
  if (currentConsent) {
    // Check what changed and handle accordingly
    Object.keys(newPreferences).forEach(type => {
      if (currentConsent[type] && !newPreferences[type]) {
        // User disabled this type of cookie
        deleteCookiesByType(type);
      }
    });
  }
  
  return setCookieConsent(newPreferences);
};