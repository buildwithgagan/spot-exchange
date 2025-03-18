const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./testSetup');
const jwt = require('jsonwebtoken');

let authToken;
let userId;

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
  
  // Create a test user and get auth token
  const validUser = {
    email: 'test@example.com',
    password: 'Test@123',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    phoneNumber: '+1234567890'
  };

  const res = await request(app)
    .post('/api/users/register')
    .send(validUser);

  authToken = res.body.token;
  userId = res.body.user._id;
});

describe('User Profile API Tests', () => {
  describe('GET /api/users/profile', () => {
    it('should get user profile successfully', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('email', 'test@example.com');
      expect(res.body).toHaveProperty('firstName', 'John');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should fail without auth token', async () => {
      await request(app)
        .get('/api/users/profile')
        .expect(401);
    });

    it('should fail with invalid auth token', async () => {
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('PATCH /api/users/profile', () => {
    it('should update profile successfully', async () => {
      const updates = {
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1987654321',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10001'
        }
      };

      const res = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.firstName).toBe(updates.firstName);
      expect(res.body.lastName).toBe(updates.lastName);
      expect(res.body.phoneNumber).toBe(updates.phoneNumber);
      expect(res.body.address).toEqual(updates.address);
    });

    it('should fail with invalid phone number format', async () => {
      const updates = {
        phoneNumber: '123456' // Invalid format
      };

      const res = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should fail with name exceeding max length', async () => {
      const updates = {
        firstName: 'a'.repeat(51) // Exceeds 50 characters
      };

      const res = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/users/account', () => {
    it('should delete account successfully', async () => {
      await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify user is deleted
      const user = await User.findById(userId);
      expect(user).toBeNull();
    });

    it('should fail without auth token', async () => {
      await request(app)
        .delete('/api/users/account')
        .expect(401);
    });
  });
}); 