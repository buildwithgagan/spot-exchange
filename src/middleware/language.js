const i18next = require('../config/i18n');

/**
 * Middleware to handle language switching and persistence
 */
const languageMiddleware = (req, res, next) => {
  // Get language from query parameter, header, or cookie
  const language = 
    req.query.lng || 
    req.headers['accept-language']?.split(',')[0] || 
    req.cookies?.lng ||
    'en';

  // Validate if language is supported
  const supportedLanguages = i18next.options.supportedLngs;
  const validLanguage = supportedLanguages.includes(language) ? language : 'en';

  // Set language for the request
  req.language = validLanguage;
  
  // Set cookie for language persistence if it's different from current
  if (req.cookies?.lng !== validLanguage) {
    res.cookie('lng', validLanguage, {
      maxAge: i18next.options.detection.cookieMinutes * 60 * 1000,
      httpOnly: true,
      domain: i18next.options.detection.cookieDomain,
      secure: process.env.NODE_ENV === 'production'
    });
  }

  // Change language for the current request
  req.i18n.changeLanguage(validLanguage);

  next();
};

module.exports = languageMiddleware; 