const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./testSetup');
const jwt = require('jsonwebtoken');

let userToken;
let adminToken;
let userId;

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
  
  // Create a regular user
  const user = {
    email: 'user@example.com',
    password: 'Test@123',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    phoneNumber: '+1234567890'
  };

  const userRes = await request(app)
    .post('/api/users/register')
    .send(user);

  userToken = userRes.body.token;
  userId = userRes.body.user._id;

  // Create an admin user
  const admin = {
    ...user,
    email: 'admin@example.com',
    role: 'admin'
  };

  const adminUser = new User(admin);
  await adminUser.save();
  adminToken = jwt.sign(
    { userId: adminUser._id },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
  );
});

describe('KYC API Tests', () => {
  const validKycData = {
    documentType: 'passport',
    documentNumber: 'AB123456',
    documentExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
    documentFront: 'base64-encoded-front-image',
    documentBack: 'base64-encoded-back-image',
    selfie: 'base64-encoded-selfie'
  };

  describe('POST /api/kyc/submit', () => {
    it('should submit KYC documents successfully', async () => {
      const res = await request(app)
        .post('/api/kyc/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validKycData)
        .expect(200);

      expect(res.body.message).toBeDefined();
      expect(res.body.kyc.status).toBe('submitted');
      expect(res.body.kyc.documentType).toBe(validKycData.documentType);
    });

    it('should fail with expired document', async () => {
      const expiredData = {
        ...validKycData,
        documentExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Yesterday
      };

      const res = await request(app)
        .post('/api/kyc/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send(expiredData)
        .expect(400);

      expect(res.body.message).toBe('kyc.documentExpired');
    });

    it('should fail with invalid document type', async () => {
      const invalidData = {
        ...validKycData,
        documentType: 'invalidType'
      };

      const res = await request(app)
        .post('/api/kyc/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData)
        .expect(400);

      expect(res.body.message).toBe('kyc.invalidDocumentType');
    });

    it('should fail if KYC already submitted', async () => {
      await request(app)
        .post('/api/kyc/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validKycData);

      const res = await request(app)
        .post('/api/kyc/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validKycData)
        .expect(400);

      expect(res.body.message).toBe('kyc.alreadySubmitted');
    });
  });

  describe('GET /api/kyc/status', () => {
    it('should get KYC status successfully', async () => {
      await request(app)
        .post('/api/kyc/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validKycData);

      const res = await request(app)
        .get('/api/kyc/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.status).toBe('submitted');
      expect(res.body.documentType).toBe(validKycData.documentType);
    });

    it('should return pending status for new user', async () => {
      const res = await request(app)
        .get('/api/kyc/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.status).toBe('pending');
    });
  });

  describe('POST /api/kyc/verify', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/kyc/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validKycData);
    });

    it('should approve KYC successfully as admin', async () => {
      const res = await request(app)
        .post('/api/kyc/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId,
          action: 'approve'
        })
        .expect(200);

      expect(res.body.kyc.status).toBe('verified');
      expect(res.body.kyc.verificationDate).toBeDefined();
    });

    it('should reject KYC with reason as admin', async () => {
      const res = await request(app)
        .post('/api/kyc/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId,
          action: 'reject',
          rejectionReason: 'Document unclear'
        })
        .expect(200);

      expect(res.body.kyc.status).toBe('rejected');
      expect(res.body.kyc.rejectionReason).toBe('Document unclear');
    });

    it('should fail verification without admin rights', async () => {
      const res = await request(app)
        .post('/api/kyc/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          action: 'approve'
        })
        .expect(403);

      expect(res.body.message).toBe('Access denied. Admin privileges required.');
    });

    it('should fail rejection without reason', async () => {
      const res = await request(app)
        .post('/api/kyc/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId,
          action: 'reject'
        })
        .expect(400);

      expect(res.body.message).toBe('kyc.rejectionReasonRequired');
    });
  });
}); 