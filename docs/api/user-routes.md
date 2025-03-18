# User Management API Documentation

This documentation describes the User Management API endpoints, their request/response formats, and authentication requirements.

## Base URL

```
http://localhost:3000/api/users
```

## Authentication

Most endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Register New User

Creates a new user account.

- **URL**: `/register`
- **Method**: `POST`
- **Auth required**: No
- **Content-Type**: `application/json`

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Validation Rules
- Email: Valid email format
- Password: Minimum 8 characters, must contain uppercase, lowercase, and number
- FirstName: Required, max 50 characters
- LastName: Required, max 50 characters

#### Success Response

- **Code**: `201 Created`
- **Content**:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-03-18T10:00:00.000Z",
    "updatedAt": "2024-03-18T10:00:00.000Z"
  },
  "token": "jwt_token"
}
```

#### Error Responses

- **Code**: `400 Bad Request`
  - When validation fails or user already exists
```json
{
  "message": "Validation error",
  "error": ["Email is required", "Password must be at least 8 characters long"]
}
```

### Login

Authenticates a user and returns a JWT token.

- **URL**: `/login`
- **Method**: `POST`
- **Auth required**: No
- **Content-Type**: `application/json`

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

#### Success Response

- **Code**: `200 OK`
- **Content**:
```json
{
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true
  },
  "token": "jwt_token"
}
```

#### Error Responses

- **Code**: `401 Unauthorized`
```json
{
  "message": "Invalid credentials"
}
```

### Get User Profile

Retrieves the authenticated user's profile.

- **URL**: `/profile`
- **Method**: `GET`
- **Auth required**: Yes

#### Success Response

- **Code**: `200 OK`
- **Content**:
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "isActive": true,
  "lastLogin": "2024-03-18T10:00:00.000Z",
  "createdAt": "2024-03-18T10:00:00.000Z",
  "updatedAt": "2024-03-18T10:00:00.000Z"
}
```

#### Error Responses

- **Code**: `401 Unauthorized`
```json
{
  "message": "Authentication required"
}
```

### Update Profile

Updates the authenticated user's profile information.

- **URL**: `/profile`
- **Method**: `PATCH`
- **Auth required**: Yes
- **Content-Type**: `application/json`

#### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "newemail@example.com",
  "password": "NewPassword123"
}
```

Note: All fields are optional. Include only the fields you want to update.

#### Success Response

- **Code**: `200 OK`
- **Content**:
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "user_id",
    "email": "newemail@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "updatedAt": "2024-03-18T10:00:00.000Z"
  }
}
```

#### Error Responses

- **Code**: `400 Bad Request`
  - When validation fails or email is already in use
```json
{
  "message": "Invalid updates"
}
```

- **Code**: `401 Unauthorized`
```json
{
  "message": "Authentication required"
}
```

### Deactivate Account

Deactivates the authenticated user's account.

- **URL**: `/account`
- **Method**: `DELETE`
- **Auth required**: Yes

#### Success Response

- **Code**: `200 OK`
- **Content**:
```json
{
  "message": "Account deactivated successfully"
}
```

#### Error Responses

- **Code**: `401 Unauthorized`
```json
{
  "message": "Authentication required"
}
```

## Error Handling

The API uses consistent error response formats:

```json
{
  "message": "Error description",
  "error": "Detailed error information (development mode only)"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

To be implemented: The API will include rate limiting to prevent abuse.

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- Input validation and sanitization
- CORS protection
- Security headers (using helmet)
- MongoDB injection protection
- Request size limiting (10kb)

## Testing

You can test these endpoints using tools like Postman or curl. Example curl command:

```bash
# Register a new user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","firstName":"John","lastName":"Doe"}'
``` 