import 'dotenv/config';

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import app from '../src/app.js';
import User from '../src/module/auth/auth.model.js';

let mongod;
let token;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Create a verified customer directly for testing.
  await User.create({
    name: 'Test Customer',
    email: 'customer@test.com',
    password: 'Test@12345',
    role: 'customer',
    isVerified: true,
  });

  // Login and obtain access token.
  const res = await request(app).post('/api/auth/login').send({
    email: 'customer@test.com',
    password: 'Test@12345',
  });

  expect(res.status).toBe(200);
  token = res.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}, 30000);

const auth = () => ({
  Authorization: `Bearer ${token}`,
});

describe('Vehicle APIs', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app).post('/api/vehicles').send({
      vehicleNumber: 'MH12AB1234',
      vehicleType: 'TWO_WHEELER',
    });

    expect(res.status).toBe(401);
  });

  it('should make the first vehicle default and the second non-default', async () => {
    const first = await request(app).post('/api/vehicles').set(auth()).send({
      vehicleNumber: 'MH12AB1234',
      vehicleType: 'TWO_WHEELER',
    });

    const second = await request(app).post('/api/vehicles').set(auth()).send({
      vehicleNumber: 'MH14XY5678',
      vehicleType: 'FOUR_WHEELER',
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    expect(first.body.data.isDefault).toBe(true);
    expect(second.body.data.isDefault).toBe(false);
  });

  it('should reject an invalid vehicle number', async () => {
    const res = await request(app).post('/api/vehicles').set(auth()).send({
      vehicleNumber: 'INVALID123',
      vehicleType: 'TWO_WHEELER',
    });

    expect(res.status).toBe(400);
  });

  it('should fetch the customer vehicles', async () => {
    const res = await request(app).get('/api/vehicles').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});
