# User Management System

A multilingual user management system built with Node.js, Express, and MongoDB, featuring authentication, user profile management, and internationalization support.

## Features

- 🔐 User Authentication (Register, Login)
- 👤 User Profile Management
- 🌐 Internationalization (i18n) Support
  - English (en)
  - Spanish (es)
  - French (fr)
- 📚 Swagger API Documentation
- 🔒 Security Best Practices
- 🍪 Language Preference Persistence

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd user-management-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/user-management
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRATION=24h
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   ```

4. Start the server:
   ```bash
   npm start
   ```

## API Documentation

Access the Swagger documentation at:
```
http://localhost:3000/api-docs
```

## Available Endpoints

### Authentication
- POST `/api/users/register` - Register a new user
- POST `/api/users/login` - Login user

### User Management
- GET `/api/users/profile` - Get user profile
- PATCH `/api/users/profile` - Update user profile
- DELETE `/api/users/account` - Delete user account

### Language
- GET `/api/language` - Get current language and supported languages

## Internationalization

The system supports multiple languages. You can switch languages by:
1. Query parameter: `?lng=fr`
2. Accept-Language header
3. Cookie (persists user preference)

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Request rate limiting
- Security headers with Helmet
- CORS configuration
- Input validation and sanitization

## Development

Start the development server with auto-reload:
```bash
npm run dev
```

## Testing

Run the test suite:
```bash
npm test
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 