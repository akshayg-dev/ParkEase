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
let fourWheeler;
let twoWheeler;
let slotA;
let slotB;
let slotMaint;
let slotTwo;

const futureTime = (hoursFromNow) =>
  new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await User.create({
    name: 'Admin User',
    email: 'admin-maint@test.com',
    password: 'Test@12345',
    role: 'admin',
    isVerified: true,
  });

  customer = await User.create({
    name: 'Customer User',
    email: 'cust-maint@test.com',
    password: 'Test@12345',
    role: 'customer',
    isVerified: true,
  });

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin-maint@test.com',
    password: 'Test@12345',
  });
  expect(adminLogin.status).toBe(200);
  adminToken = adminLogin.body.data.accessToken;

  const custLogin = await request(app).post('/api/auth/login').send({
    email: 'cust-maint@test.com',
    password: 'Test@12345',
  });
  expect(custLogin.status).toBe(200);
  customerToken = custLogin.body.data.accessToken;

  fourWheeler = await Vehicle.create({
    vehicleOwner: customer._id,
    vehicleNumber: 'KA01AB1001',
    vehicleType: 'FOUR_WHEELER',
  });

  twoWheeler = await Vehicle.create({
    vehicleOwner: customer._id,
    vehicleNumber: 'KA01AB2002',
    vehicleType: 'TWO_WHEELER',
  });

  slotA = await ParkingSlot.create({
    slotNumber: 'M101',
    vehicleType: 'FOUR_WHEELER',
    status: 'ACTIVE',
  });

  slotB = await ParkingSlot.create({
    slotNumber: 'M102',
    vehicleType: 'FOUR_WHEELER',
    status: 'ACTIVE',
  });

  slotMaint = await ParkingSlot.create({
    slotNumber: 'M103',
    vehicleType: 'FOUR_WHEELER',
    status: 'MAINTENANCE',
  });

  slotTwo = await ParkingSlot.create({
    slotNumber: 'M201',
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

const adminAuth = () => ({ Authorization: `Bearer ${adminToken}` });
const custAuth = () => ({ Authorization: `Bearer ${customerToken}` });

describe('Slot Maintenance Guard & Booking Reassignment', () => {
  it('blocks setting a slot to MAINTENANCE when a future confirmed booking exists and preserves QR across reassignment', async () => {
    const start = futureTime(2);
    const end = futureTime(4);

    // 1. Customer creates booking on slotA
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set(custAuth())
      .send({
        vehicleId: fourWheeler._id.toString(),
        parkingSlotId: slotA._id.toString(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
    expect(bookingRes.status).toBe(201);
    const booking = bookingRes.body.data.booking;

    // 2. Customer generates QR token before reassignment
    const qrRes = await request(app)
      .post(`/api/bookings/${booking._id}/qr`)
      .set(custAuth());
    expect(qrRes.status).toBe(200);
    const { qrToken } = qrRes.body.data;

    // 3. Admin attempts to set slotA to MAINTENANCE -> blocked with 409 + conflicts
    const maintBlocked = await request(app)
      .patch(`/api/parking-slots/${slotA._id}`)
      .set(adminAuth())
      .send({ status: 'MAINTENANCE' });

    expect(maintBlocked.status).toBe(409);
    expect(maintBlocked.body.data.conflicts).toHaveLength(1);
    expect(maintBlocked.body.data.conflicts[0].booking._id).toBe(booking._id);

    const eligibleIds = maintBlocked.body.data.conflicts[0].eligibleSlots.map(
      (s) => s._id,
    );
    expect(eligibleIds).toContain(slotB._id.toString());
    expect(eligibleIds).not.toContain(slotMaint._id.toString());
    expect(eligibleIds).not.toContain(slotTwo._id.toString());

    // 4. Reject reassignment to MAINTENANCE slot or mismatched vehicle-type slot
    const badMaintTarget = await request(app)
      .patch(`/api/bookings/admin/${booking._id}/reassign`)
      .set(adminAuth())
      .send({ targetSlotId: slotMaint._id.toString() });
    expect(badMaintTarget.status).toBe(400);

    const badTypeTarget = await request(app)
      .patch(`/api/bookings/admin/${booking._id}/reassign`)
      .set(adminAuth())
      .send({ targetSlotId: slotTwo._id.toString() });
    expect(badTypeTarget.status).toBe(400);

    // 5. Reassign booking from slotA -> slotB
    const reassignRes = await request(app)
      .patch(`/api/bookings/admin/${booking._id}/reassign`)
      .set(adminAuth())
      .send({ targetSlotId: slotB._id.toString() });

    expect(reassignRes.status).toBe(200);
    const updatedBooking = reassignRes.body.data.booking;
    expect(updatedBooking._id).toBe(booking._id);
    expect(updatedBooking.parkingSlot._id).toBe(slotB._id.toString());
    expect(updatedBooking.totalPrice).toBe(booking.totalPrice);
    expect(updatedBooking.durationHours).toBe(booking.durationHours);

    // 6. Now slotA can be moved to MAINTENANCE
    const maintAllowed = await request(app)
      .patch(`/api/parking-slots/${slotA._id}`)
      .set(adminAuth())
      .send({ status: 'MAINTENANCE' });
    expect(maintAllowed.status).toBe(200);
    expect(maintAllowed.body.data.slot.status).toBe('MAINTENANCE');

    // 7. Existing QR token remains valid for entry scan after reassignment
    await Booking.updateOne(
      { _id: booking._id },
      { $set: { startTime: new Date(Date.now() - 5 * 60 * 1000) } },
    );

    const scanRes = await request(app)
      .post('/api/bookings/scan')
      .set(adminAuth())
      .send({ qrToken, action: 'ENTRY' });
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.data.booking.entryAt).toBeTruthy();

    // Restore slotA to ACTIVE for subsequent test isolation
    await ParkingSlot.updateOne({ _id: slotA._id }, { $set: { status: 'ACTIVE' } });
  });

  it('rejects reassignment to an active slot that already has an overlapping confirmed booking', async () => {
    const start = futureTime(10);
    const end = futureTime(12);

    const b1 = await request(app)
      .post('/api/bookings')
      .set(custAuth())
      .send({
        vehicleId: fourWheeler._id.toString(),
        parkingSlotId: slotA._id.toString(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
    expect(b1.status).toBe(201);

    const b2 = await request(app)
      .post('/api/bookings')
      .set(custAuth())
      .send({
        vehicleId: fourWheeler._id.toString(),
        parkingSlotId: slotB._id.toString(),
        startTime: futureTime(11).toISOString(),
        endTime: futureTime(13).toISOString(),
      });
    expect(b2.status).toBe(201);

    const overlapReassign = await request(app)
      .patch(`/api/bookings/admin/${b1.body.data.booking._id}/reassign`)
      .set(adminAuth())
      .send({ targetSlotId: slotB._id.toString() });

    expect(overlapReassign.status).toBe(409);
  });

  it('keeps slot blocked from maintenance until scheduled endTime even after early exit', async () => {
    const earlySlot = await ParkingSlot.create({
      slotNumber: 'M301',
      vehicleType: 'TWO_WHEELER',
      status: 'ACTIVE',
    });

    const activeBooking = await Booking.create({
      customer: customer._id,
      vehicle: twoWheeler._id,
      parkingSlot: earlySlot._id,
      startTime: new Date(Date.now() - 30 * 60 * 1000),
      endTime: futureTime(2),
      durationHours: 3,
      pricePerHour: 20,
      totalPrice: 60,
      status: 'CONFIRMED',
      entryAt: new Date(Date.now() - 25 * 60 * 1000),
      exitAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    const checkRes = await request(app)
      .get(`/api/parking-slots/${earlySlot._id}/maintenance-check`)
      .set(adminAuth());
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.data.conflicts).toHaveLength(1);
    expect(checkRes.body.data.conflicts[0].booking._id).toBe(
      activeBooking._id.toString(),
    );

    const maintRes = await request(app)
      .patch(`/api/parking-slots/${earlySlot._id}`)
      .set(adminAuth())
      .send({ status: 'MAINTENANCE' });
    expect(maintRes.status).toBe(409);
  });

  it('allows setting a slot to MAINTENANCE when bookings are only cancelled or completed', async () => {
    const freeSlot = await ParkingSlot.create({
      slotNumber: 'M401',
      vehicleType: 'TWO_WHEELER',
      status: 'ACTIVE',
    });

    await Booking.create({
      customer: customer._id,
      vehicle: twoWheeler._id,
      parkingSlot: freeSlot._id,
      startTime: futureTime(20),
      endTime: futureTime(22),
      durationHours: 2,
      pricePerHour: 20,
      totalPrice: 40,
      status: 'CANCELLED',
    });

    const maintRes = await request(app)
      .patch(`/api/parking-slots/${freeSlot._id}`)
      .set(adminAuth())
      .send({ status: 'MAINTENANCE' });

    expect(maintRes.status).toBe(200);
    expect(maintRes.body.data.slot.status).toBe('MAINTENANCE');
  });
});
