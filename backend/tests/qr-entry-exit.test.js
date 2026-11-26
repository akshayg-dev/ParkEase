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
let adminToken;
let customerToken;
let customer;
let vehicle;
let slot;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await User.create({
    name: 'Admin Gate',
    email: 'admin-qr@test.com',
    password: 'Test@12345',
    role: 'admin',
    isVerified: true,
  });

  customer = await User.create({
    name: 'Customer Gate',
    email: 'cust-qr@test.com',
    password: 'Test@12345',
    role: 'customer',
    isVerified: true,
  });

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin-qr@test.com',
    password: 'Test@12345',
  });
  expect(adminLogin.status).toBe(200);
  adminToken = adminLogin.body.data.accessToken;

  const custLogin = await request(app).post('/api/auth/login').send({
    email: 'cust-qr@test.com',
    password: 'Test@12345',
  });
  expect(custLogin.status).toBe(200);
  customerToken = custLogin.body.data.accessToken;

  vehicle = await Vehicle.create({
    vehicleOwner: customer._id,
    vehicleNumber: 'MH01QR1111',
    vehicleType: 'FOUR_WHEELER',
  });

  slot = await ParkingSlot.create({
    slotNumber: 'Q101',
    vehicleType: 'FOUR_WHEELER',
    status: 'ACTIVE',
  });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}, 30000);

const adminAuth = () => ({ Authorization: `Bearer ${adminToken}` });
const custAuth = () => ({ Authorization: `Bearer ${customerToken}` });

describe('Booking QR ENTRY -> EXIT lifecycle', () => {
  it('supports Entry QR scan, post-entry Exit QR regeneration, Exit scan, and blocks QR reuse after exit', async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(Date.now() + 3 * 60 * 60 * 1000);

    // 1. Create confirmed booking
    const createRes = await request(app)
      .post('/api/bookings')
      .set(custAuth())
      .send({
        vehicleId: vehicle._id.toString(),
        parkingSlotId: slot._id.toString(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
    expect(createRes.status).toBe(201);
    const bookingId = createRes.body.data.booking._id;

    // Move startTime into active window
    await Booking.updateOne(
      { _id: bookingId },
      { $set: { startTime: new Date(Date.now() - 5 * 60 * 1000) } },
    );

    // 2. Customer generates Entry QR
    const entryQrRes = await request(app)
      .post(`/api/bookings/${bookingId}/qr`)
      .set(custAuth());
    expect(entryQrRes.status).toBe(200);
    const entryToken = entryQrRes.body.data.qrToken;
    expect(entryToken).toMatch(/^[a-f0-9]{64}$/);

    // 3. Admin scans ENTRY
    const entryScanRes = await request(app)
      .post('/api/bookings/scan')
      .set(adminAuth())
      .send({ qrToken: entryToken, action: 'ENTRY' });
    expect(entryScanRes.status).toBe(200);
    expect(entryScanRes.body.data.booking.entryAt).toBeTruthy();
    expect(entryScanRes.body.data.booking.exitAt).toBeNull();

    // Duplicate ENTRY scan must fail
    const duplicateEntry = await request(app)
      .post('/api/bookings/scan')
      .set(adminAuth())
      .send({ qrToken: entryToken, action: 'ENTRY' });
    expect(duplicateEntry.status).toBe(400);

    // 4. Customer requests Exit QR after ENTRY (new token replaces old hash safely)
    const exitQrRes = await request(app)
      .post(`/api/bookings/${bookingId}/qr`)
      .set(custAuth());
    expect(exitQrRes.status).toBe(200);
    const exitToken = exitQrRes.body.data.qrToken;
    expect(exitToken).toMatch(/^[a-f0-9]{64}$/);
    expect(exitToken).not.toBe(entryToken);

    // Old Entry token is invalidated by hash replacement
    const staleExitAttempt = await request(app)
      .post('/api/bookings/scan')
      .set(adminAuth())
      .send({ qrToken: entryToken, action: 'EXIT' });
    expect(staleExitAttempt.status).toBe(400);

    // Move endTime into the past so this EXIT represents a final normal exit at window end
    await Booking.updateOne(
      { _id: bookingId },
      { $set: { endTime: new Date(Date.now() - 60 * 1000) } },
    );

    // 5. Admin scans EXIT with Exit QR token
    const exitScanRes = await request(app)
      .post('/api/bookings/scan')
      .set(adminAuth())
      .send({ qrToken: exitToken, action: 'EXIT' });
    expect(exitScanRes.status).toBe(200);
    expect(exitScanRes.body.data.booking.exitAt).toBeTruthy();
    expect(exitScanRes.body.data.booking.status).toBe('COMPLETED');

    // 6. After EXIT, QR cannot be regenerated or rescanned
    const afterExitQr = await request(app)
      .post(`/api/bookings/${bookingId}/qr`)
      .set(custAuth());
    expect(afterExitQr.status).toBe(400);

    const reuseExit = await request(app)
      .post('/api/bookings/scan')
      .set(adminAuth())
      .send({ qrToken: exitToken, action: 'EXIT' });
    expect(reuseExit.status).toBe(400);
  });

  it('allows Exit QR generation when a checked-in booking was marked COMPLETED past endTime without exit', async () => {
    const expiredCheckedIn = await Booking.create({
      customer: customer._id,
      vehicle: vehicle._id,
      parkingSlot: slot._id,
      startTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
      durationHours: 3,
      pricePerHour: 40,
      totalPrice: 120,
      status: 'COMPLETED',
      entryAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      exitAt: null,
    });

    const exitQrRes = await request(app)
      .post(`/api/bookings/${expiredCheckedIn._id}/qr`)
      .set(custAuth());
    expect(exitQrRes.status).toBe(200);

    const exitScanRes = await request(app)
      .post('/api/bookings/scan')
      .set(adminAuth())
      .send({ qrToken: exitQrRes.body.data.qrToken, action: 'EXIT' });
    expect(exitScanRes.status).toBe(200);
    expect(exitScanRes.body.data.booking.exitAt).toBeTruthy();
  });

  it('rejects QR generation for cancelled bookings', async () => {
    const cancelled = await Booking.create({
      customer: customer._id,
      vehicle: vehicle._id,
      parkingSlot: slot._id,
      startTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
      durationHours: 2,
      pricePerHour: 40,
      totalPrice: 80,
      status: 'CANCELLED',
    });

    const res = await request(app)
      .post(`/api/bookings/${cancelled._id}/qr`)
      .set(custAuth());
    expect(res.status).toBe(400);
  });
});
