const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./testSetup');
const jwt = require('jsonwebtoken');

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

describe('Authentication API Tests', () => {
  const validUser = {
    email: 'test@example.com',
    password: 'Test@123',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    phoneNumber: '+1234567890'
  };

  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send(validUser)
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should fail registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({ ...validUser, email: 'invalid-email' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should fail registration with weak password', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({ ...validUser, password: 'weak' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should fail registration with duplicate email', async () => {
      await request(app)
        .post('/api/users/register')
        .send(validUser);

      const res = await request(app)
        .post('/api/users/register')
        .send(validUser)
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/users/register')
        .send(validUser);
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: validUser.email,
          password: validUser.password
        })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });

    it('should fail login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: validUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(res.body).toHaveProperty('message');
    });

    it('should lock account after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/users/login')
          .send({
            email: validUser.email,
            password: 'wrongpassword'
          });
      }

      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: validUser.email,
          password: validUser.password
        })
        .expect(401);

      expect(res.body.message).toContain('locked');
    });
  });
}); 