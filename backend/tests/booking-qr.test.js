import 'dotenv/config';

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import app from '../src/app.js';
import User from '../src/module/auth/auth.model.js';
import Vehicle from '../src/module/vehicles/vehicle.model.js';
import ParkingSlot from '../src/module/parking-slot/parking-slot.model.js';
import Booking from '../src/module/booking/booking.model.js';

let mongod;
let customerToken;
let adminToken;
let customer;
let vehicle;

let slotCounter = 0;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  customer = await User.create({
    name: 'QR Customer',
    email: 'qr-customer@test.com',
    password: 'Test@12345',
    role: 'customer',
    isVerified: true,
  });

  const admin = await User.create({
    name: 'QR Admin',
    email: 'qr-admin@test.com',
    password: 'Test@12345',
    role: 'admin',
    isVerified: true,
  });

  const customerLogin = await request(app).post('/api/auth/login').send({
    email: 'qr-customer@test.com',
    password: 'Test@12345',
  });

  expect(customerLogin.status).toBe(200);
  customerToken = customerLogin.body.data.accessToken;

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'qr-admin@test.com',
    password: 'Test@12345',
  });

  expect(adminLogin.status).toBe(200);
  adminToken = adminLogin.body.data.accessToken;

  vehicle = await Vehicle.create({
    vehicleOwner: customer._id,
    vehicleNumber: 'MH12QR1234',
    vehicleType: 'TWO_WHEELER',
  });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();

  if (mongod) {
    await mongod.stop();
  }
}, 30000);

const customerAuth = () => ({
  Authorization: `Bearer ${customerToken}`,
});

const adminAuth = () => ({
  Authorization: `Bearer ${adminToken}`,
});

const futureTime = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000);

const createTestBooking = async ({ eligibleForEntry = false } = {}) => {
  slotCounter++;

  const slot = await ParkingSlot.create({
    slotNumber: `QR${String(slotCounter).padStart(3, '0')}`,
    vehicleType: 'TWO_WHEELER',
    status: 'ACTIVE',
  });

  const start = futureTime(2);
  const end = futureTime(4);

  const bookingResponse = await request(app)
    .post('/api/bookings')
    .set(customerAuth())
    .send({
      vehicleId: vehicle._id.toString(),
      parkingSlotId: slot._id.toString(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });

  expect(bookingResponse.status).toBe(201);

  const bookingId = bookingResponse.body.data.booking._id;

  if (eligibleForEntry) {
    // Simulate the booking period having started.
    await Booking.updateOne(
      { _id: bookingId },
      {
        $set: {
          startTime: new Date(Date.now() - 60 * 1000),
          endTime: futureTime(1),
        },
      },
    );
  }

  return bookingId;
};

const generateQr = async (bookingId) => {
  return request(app).post(`/api/bookings/${bookingId}/qr`).set(customerAuth());
};

const scanQr = async (qrToken, action, useAdmin = true) => {
  return request(app)
    .post('/api/bookings/scan')
    .set(useAdmin ? adminAuth() : customerAuth())
    .send({ qrToken, action });
};

describe('Booking QR APIs', () => {
  // 1. QR GENERATION
  it('should generate a QR token for a confirmed booking', async () => {
    const bookingId = await createTestBooking();

    const res = await generateQr(bookingId);

    expect(res.status).toBe(200);
    expect(res.body.data.qrToken).toMatch(/^[a-f0-9]{64}$/);
  });

  // 2. QR HASH STORAGE
  it('should store only the QR token hash in the database', async () => {
    const bookingId = await createTestBooking();

    const res = await generateQr(bookingId);
    const qrToken = res.body.data.qrToken;

    expect(res.status).toBe(200);

    const booking = await Booking.findById(bookingId).select('+qrTokenHash');

    expect(booking.qrTokenHash).toHaveLength(64);
    expect(booking.qrTokenHash).not.toBe(qrToken);
  });

  // 3. ENTRY SCAN
  it('should record entry when admin scans a valid QR', async () => {
    const bookingId = await createTestBooking({
      eligibleForEntry: true,
    });

    const qr = await generateQr(bookingId);
    const qrToken = qr.body.data.qrToken;

    const res = await scanQr(qrToken, 'ENTRY');

    expect(res.status).toBe(200);
    expect(res.body.data.booking.entryAt).not.toBeNull();
    expect(res.body.data.booking.exitAt).toBeNull();
  });

  // 4. DUPLICATE ENTRY
  it('should reject scanning the same QR for entry twice', async () => {
    const bookingId = await createTestBooking({
      eligibleForEntry: true,
    });

    const qr = await generateQr(bookingId);
    const qrToken = qr.body.data.qrToken;

    const first = await scanQr(qrToken, 'ENTRY');
    expect(first.status).toBe(200);

    const second = await scanQr(qrToken, 'ENTRY');
    expect(second.status).toBe(400);
  });

  // 5. EXIT SCAN
  it('should record exit without cancelling the reservation', async () => {
    const bookingId = await createTestBooking({
      eligibleForEntry: true,
    });

    const qr = await generateQr(bookingId);
    const qrToken = qr.body.data.qrToken;

    const entry = await scanQr(qrToken, 'ENTRY');
    expect(entry.status).toBe(200);

    const res = await scanQr(qrToken, 'EXIT');

    expect(res.status).toBe(200);
    expect(res.body.data.booking.exitAt).not.toBeNull();
    expect(res.body.data.booking.status).toBe('CONFIRMED');

    const savedBooking = await Booking.findById(bookingId);

    expect(savedBooking.status).toBe('CONFIRMED');
    expect(savedBooking.exitAt).not.toBeNull();
    expect(savedBooking.qrTokenHash).toBeUndefined();
  });

  // 6. DUPLICATE EXIT
  it('should reject scanning the same QR for exit twice', async () => {
    const bookingId = await createTestBooking({
      eligibleForEntry: true,
    });

    const qr = await generateQr(bookingId);
    const qrToken = qr.body.data.qrToken;

    await scanQr(qrToken, 'ENTRY');

    const firstExit = await scanQr(qrToken, 'EXIT');
    expect(firstExit.status).toBe(200);

    const secondExit = await scanQr(qrToken, 'EXIT');
    expect(secondExit.status).toBe(400);
  });

  // 7. CUSTOMER CANNOT SCAN QR
  it('should prevent customers from scanning QR codes', async () => {
    const bookingId = await createTestBooking({
      eligibleForEntry: true,
    });

    const qr = await generateQr(bookingId);
    const qrToken = qr.body.data.qrToken;

    const res = await scanQr(qrToken, 'ENTRY', false);

    expect(res.status).toBe(403);
  });

  // 8. INVALID QR
  it('should reject an invalid QR token', async () => {
    const res = await scanQr('a'.repeat(64), 'ENTRY');

    expect(res.status).toBe(400);
  });

  // 9. INVALID SCAN ACTION
  it('should reject an invalid scan action', async () => {
    const res = await scanQr('a'.repeat(64), 'INVALID');

    expect(res.status).toBe(400);
  });

  // 10. CANCELLED BOOKING
  it('should reject QR generation for a cancelled booking', async () => {
    const bookingId = await createTestBooking();

    const cancelled = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set(customerAuth());

    expect(cancelled.status).toBe(200);

    const res = await generateQr(bookingId);

    expect(res.status).toBe(400);
  });

  // 11. CUSTOMER OWNERSHIP
  it('should prevent customers from generating QR for another customer booking', async () => {
    const bookingId = await createTestBooking();

    const otherCustomer = await User.create({
      name: 'Another Customer',
      email: 'another-qr@test.com',
      password: 'Test@12345',
      role: 'customer',
      isVerified: true,
    });

    const login = await request(app).post('/api/auth/login').send({
      email: otherCustomer.email,
      password: 'Test@12345',
    });

    expect(login.status).toBe(200);

    const res = await request(app)
      .post(`/api/bookings/${bookingId}/qr`)
      .set({
        Authorization: `Bearer ${login.body.data.accessToken}`,
      });

    expect(res.status).toBe(404);
  });
});
