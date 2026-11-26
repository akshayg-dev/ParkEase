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

let token;
let otherToken;

let customer;
let otherCustomer;

let twoWheeler;
let fourWheeler;
let otherCustomersVehicle;

let slot1;
let slot2;
let slot3;
let slot4;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Create customers
  customer = await User.create({
    name: 'Test Customer',
    email: 'customer@test.com',
    password: 'Test@12345',
    role: 'customer',
    isVerified: true,
  });

  otherCustomer = await User.create({
    name: 'Other Customer',
    email: 'other@test.com',
    password: 'Test@12345',
    role: 'customer',
    isVerified: true,
  });

  // Login customer 1
  const login = await request(app).post('/api/auth/login').send({
    email: 'customer@test.com',
    password: 'Test@12345',
  });

  expect(login.status).toBe(200);
  token = login.body.data.accessToken;

  // Login customer 2
  const otherLogin = await request(app).post('/api/auth/login').send({
    email: 'other@test.com',
    password: 'Test@12345',
  });

  expect(otherLogin.status).toBe(200);
  otherToken = otherLogin.body.data.accessToken;

  // Create vehicles
  twoWheeler = await Vehicle.create({
    vehicleOwner: customer._id,
    vehicleNumber: 'MH12AB1234',
    vehicleType: 'TWO_WHEELER',
  });

  fourWheeler = await Vehicle.create({
    vehicleOwner: customer._id,
    vehicleNumber: 'MH12CD5678',
    vehicleType: 'FOUR_WHEELER',
  });

  otherCustomersVehicle = await Vehicle.create({
    vehicleOwner: otherCustomer._id,
    vehicleNumber: 'MH14XY9876',
    vehicleType: 'TWO_WHEELER',
  });

  // Create parking slots
  slot1 = await ParkingSlot.create({
    slotNumber: 'B101',
    vehicleType: 'TWO_WHEELER',
    status: 'ACTIVE',
  });

  slot2 = await ParkingSlot.create({
    slotNumber: 'B102',
    vehicleType: 'FOUR_WHEELER',
    status: 'ACTIVE',
  });

  slot3 = await ParkingSlot.create({
    slotNumber: 'B103',
    vehicleType: 'TWO_WHEELER',
    status: 'ACTIVE',
  });

  slot4 = await ParkingSlot.create({
    slotNumber: 'B104',
    vehicleType: 'TWO_WHEELER',
    status: 'ACTIVE',
  });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();

  if (mongod) {
    await mongod.stop();
  }
}, 30000);

// Authentication helpers
const auth = () => ({
  Authorization: `Bearer ${token}`,
});

const otherAuth = () => ({
  Authorization: `Bearer ${otherToken}`,
});

// Generate future dates
const futureTime = (hoursFromNow) =>
  new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

// Booking request helper
const createBooking = (vehicleId, parkingSlotId, start, end) =>
  request(app).post('/api/bookings').set(auth()).send({
    vehicleId: vehicleId.toString(),
    parkingSlotId: parkingSlotId.toString(),
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  });

describe('Booking APIs', () => {
  // 1. TWO-WHEELER PRICING
  it('should create a two-wheeler booking with rounded-up pricing', async () => {
    const res = await createBooking(
      twoWheeler._id,
      slot1._id,
      futureTime(1),
      futureTime(4.5),
    );

    expect(res.status).toBe(201);
    expect(res.body.data.booking.durationHours).toBe(4);
    expect(res.body.data.booking.pricePerHour).toBe(20);
    expect(res.body.data.booking.totalPrice).toBe(80);
    expect(res.body.data.booking.status).toBe('CONFIRMED');
  });

  // 2. FOUR-WHEELER PRICING
  it('should calculate four-wheeler pricing correctly', async () => {
    const res = await createBooking(
      fourWheeler._id,
      slot2._id,
      futureTime(10),
      futureTime(12.5),
    );

    expect(res.status).toBe(201);
    expect(res.body.data.booking.durationHours).toBe(3);
    expect(res.body.data.booking.pricePerHour).toBe(40);
    expect(res.body.data.booking.totalPrice).toBe(120);
  });

  // 3. VEHICLE-SLOT COMPATIBILITY
  it('should reject a vehicle-slot type mismatch', async () => {
    const res = await createBooking(
      twoWheeler._id,
      slot2._id,
      futureTime(15),
      futureTime(17),
    );

    expect(res.status).toBe(400);
  });

  // 4. OVERLAPPING BOOKINGS
  it('should reject overlapping bookings for the same slot', async () => {
    const first = await createBooking(
      twoWheeler._id,
      slot3._id,
      futureTime(20),
      futureTime(22),
    );

    expect(first.status).toBe(201);

    const second = await createBooking(
      twoWheeler._id,
      slot3._id,
      futureTime(21),
      futureTime(23),
    );

    expect(second.status).toBe(409);
  });

  // 5. VEHICLE OWNERSHIP
  it('should reject booking with another customer’s vehicle', async () => {
    const res = await createBooking(
      otherCustomersVehicle._id,
      slot1._id,
      futureTime(30),
      futureTime(32),
    );

    expect(res.status).toBe(404);
  });

  // 6. SUCCESSFUL CANCELLATION
  it('should cancel a confirmed booking', async () => {
    const booking = await createBooking(
      fourWheeler._id,
      slot2._id,
      futureTime(40),
      futureTime(42),
    );

    expect(booking.status).toBe(201);

    const bookingId = booking.body.data.booking._id;

    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.booking.status).toBe('CANCELLED');
  });

  // 7. DOUBLE CANCELLATION
  it('should reject cancelling an already cancelled booking', async () => {
    const booking = await createBooking(
      twoWheeler._id,
      slot1._id,
      futureTime(50),
      futureTime(52),
    );

    expect(booking.status).toBe(201);

    const bookingId = booking.body.data.booking._id;

    const firstCancel = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set(auth());

    expect(firstCancel.status).toBe(200);

    const secondCancel = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set(auth());

    expect(secondCancel.status).toBe(400);
  });

  // 8. CANCELLATION AFTER START
  it('should reject cancelling a booking after it has started', async () => {
    const booking = await createBooking(
      twoWheeler._id,
      slot1._id,
      futureTime(60),
      futureTime(62),
    );

    expect(booking.status).toBe(201);

    const bookingId = booking.body.data.booking._id;

    // Simulate booking already started
    await Booking.updateOne(
      { _id: bookingId },
      {
        $set: {
          startTime: new Date(Date.now() - 60 * 1000),
        },
      },
    );

    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set(auth());

    expect(res.status).toBe(400);
  });

  // 9. CONCURRENT BOOKING
  it('should allow only one booking when two requests compete for the same slot', async () => {
    const start = futureTime(70);
    const end = futureTime(72);

    const results = await Promise.all([
      createBooking(twoWheeler._id, slot4._id, start, end),
      createBooking(twoWheeler._id, slot4._id, start, end),
    ]);

    const statuses = results.map((res) => res.status).sort();

    expect(statuses).toEqual([201, 409]);
  });

  // 10. BOOKING OWNERSHIP - GET
  it('should prevent another customer from viewing a booking', async () => {
    const booking = await createBooking(
      twoWheeler._id,
      slot1._id,
      futureTime(80),
      futureTime(82),
    );

    expect(booking.status).toBe(201);

    const bookingId = booking.body.data.booking._id;

    const res = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set(otherAuth());

    expect(res.status).toBe(404);
  });

  // 11. BOOKING OWNERSHIP - CANCEL
  it('should prevent another customer from cancelling a booking', async () => {
    const booking = await createBooking(
      twoWheeler._id,
      slot1._id,
      futureTime(90),
      futureTime(92),
    );

    expect(booking.status).toBe(201);

    const bookingId = booking.body.data.booking._id;

    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set(otherAuth());

    expect(res.status).toBe(404);
  });

  // 12. INVALID BOOKING DATE
  it('should reject an invalid booking date', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(auth())
      .send({
        vehicleId: twoWheeler._id.toString(),
        parkingSlotId: slot1._id.toString(),
        startTime: 'invalid-date',
        endTime: futureTime(100).toISOString(),
      });

    expect(res.status).toBe(400);
  });

  // 13. END BEFORE START
  it('should reject an end time before the start time', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(auth())
      .send({
        vehicleId: twoWheeler._id.toString(),
        parkingSlotId: slot1._id.toString(),
        startTime: futureTime(110).toISOString(),
        endTime: futureTime(108).toISOString(),
      });

    expect(res.status).toBe(400);
  });

  // 14. UNAUTHENTICATED BOOKING
  it('should reject booking requests without authentication', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        vehicleId: twoWheeler._id.toString(),
        parkingSlotId: slot1._id.toString(),
        startTime: futureTime(120).toISOString(),
        endTime: futureTime(122).toISOString(),
      });

    expect(res.status).toBe(401);
  });

  // 15. GET CUSTOMER BOOKINGS
  it('should retrieve only the authenticated customer bookings', async () => {
    const res = await request(app).get('/api/bookings').set(auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.bookings)).toBe(true);
    expect(res.body.data.bookings.length).toBeGreaterThan(0);

    expect(
      res.body.data.bookings.every(
        (booking) =>
          booking.customer === undefined ||
          booking.customer.toString() === customer._id.toString(),
      ),
    ).toBe(true);
  });
});
