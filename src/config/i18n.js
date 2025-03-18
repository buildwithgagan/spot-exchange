const path = require('path');

module.exports = {
  debug: process.env.NODE_ENV === 'development',
  fallbackLng: 'en',
  supportedLngs: ['en'],
  preload: ['en'],
  ns: ['common'],
  defaultNS: 'common',
  backend: {
    loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
    addPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.missing.json')
  },
  detection: {
    order: ['querystring', 'cookie', 'header'],
    lookupQuerystring: 'lng',
    lookupCookie: 'i18next',
    lookupHeader: 'accept-language',
    caches: ['cookie']
  }
}; 