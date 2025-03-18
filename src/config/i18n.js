const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');

i18next
  .use(Backend)
  .init({
    // Supported languages
    supportedLngs: ['en', 'es', 'fr'],
    fallbackLng: 'en',
    lng: 'en', // default language
    preload: ['en', 'es', 'fr'], // preload all languages
    ns: ['common'], // namespace
    defaultNS: 'common',
    
    // Backend configuration
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json')
    },
    
    // Interpolation settings
    interpolation: {
      escapeValue: false
    },
    
    // Detection settings
    detection: {
      // Order of language detection
      order: ['header', 'querystring', 'cookie'],
      
      // Look for languages in the 'Accept-Language' header
      lookupHeader: 'accept-language',
      
      // Look for languages in the query string (?lng=en)
      lookupQuerystring: 'lng',
      
      // Cache user language preference in cookie
      caches: ['cookie'],
      
      // Cookie settings
      cookieMinutes: 10080, // 7 days
      cookieDomain: process.env.DOMAIN || 'localhost'
    },
    
    // Return objects instead of strings for missing translations
    returnObjects: true,
    
    // Debug mode for development
    debug: process.env.NODE_ENV === 'development'
  });

// Export configured i18next instance
module.exports = i18next; 