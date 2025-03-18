require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const i18next = require('./config/i18n');
const i18nextMiddleware = require('i18next-http-middleware');
const languageMiddleware = require('./middleware/language');
const userRoutes = require('./routes/userRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:"],
      "script-src": ["'self'", "'unsafe-inline'", "https:"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true
}));

// Configure CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  credentials: true // Allow cookies for language preference
}));

// Parse cookies
app.use(cookieParser());

// i18n middleware
app.use(i18nextMiddleware.handle(i18next));
app.use(languageMiddleware);

app.use(express.json({ limit: '10kb' })); // Limit payload size

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "User Management API Documentation",
  customfavIcon: "/assets/favicon.ico"
}));

// Routes
app.use('/api/users', userRoutes);

// Language route
app.get('/api/language', (req, res) => {
  res.json({
    currentLanguage: req.language,
    supportedLanguages: i18next.options.supportedLngs.filter(lng => lng !== 'cimode')
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: req.t('error.routeNotFound') });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      message: req.t('error.duplicateValue'),
      error: Object.keys(err.keyValue).map(key => `${key} ${req.t('user.exists')}`).join(', ')
    });
  }

  // Validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: req.t('error.validationError'),
      error: Object.values(err.errors).map(e => e.message).join(', ')
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: req.t('error.invalidToken') });
  }

  // Default error
  res.status(err.status || 500).json({
    message: err.message || req.t('error.somethingWrong'),
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
};

// Database connection with retry logic
const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    console.log(i18next.t('db.connected'));
  } catch (error) {
    console.error(i18next.t('db.connectionError'), error);
    console.log(i18next.t('db.retrying'));
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(i18next.t('server.running', { port: PORT }));
  });
});

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