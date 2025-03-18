require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const i18nextBackend = require('i18next-fs-backend');
const path = require('path');
const languageMiddleware = require('./middleware/language');
const userRoutes = require('./routes/userRoutes');
const kycRoutes = require('./routes/kycRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const i18nConfig = require('./config/i18n');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(cookieParser());

// i18next setup
i18next
  .use(i18nextBackend)
  .use(i18nextMiddleware.LanguageDetector)
  .init(i18nConfig);

app.use(i18nextMiddleware.handle(i18next));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/kyc', kycRoutes);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "User Management API Documentation",
  customfavIcon: "/assets/favicon.ico"
}));

// Language route
app.get('/api/language', (req, res) => {
  res.json({
    currentLanguage: req.language,
    supportedLanguages: i18next.options.supportedLngs.filter(lng => lng !== 'cimode')
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: i18next.t('errors.routeNotFound') });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: i18next.t('errors.serverError') });
});

const connectWithRetry = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB is already connected');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    setTimeout(connectWithRetry, 5000);
  }
};

// Only connect to MongoDB and start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  connectWithRetry().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

module.exports = app;

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    await mongoose.connection.close();
    console.log(i18next.t('db.connectionClosed'));
    process.exit(0);
  } catch (error) {
    console.error(i18next.t('server.shutdownError'), error);
    process.exit(1);
  }
};

// Handle application termination
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't exit the process, just log the error
}); 