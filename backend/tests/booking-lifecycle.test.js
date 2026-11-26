/**
 * ParkEase — Comprehensive Booking Lifecycle Tests
 *
 * Covers all 9 lifecycle scenarios:
 * 1. Normal ENTRY → EXIT → booking auto-completes when cron runs
 * 2. Early EXIT → retain (no action) → re-entry ENTRY scan → final EXIT
 * 3. Early EXIT → release (PATCH /admin/:id/release) → slot becomes available
 * 4. Duplicate ENTRY scan rejected
 * 5. Duplicate EXIT scan rejected
 * 6. Re-entry after release rejected
 * 7. Re-entry after scheduled end rejected
 * 8. Another customer cannot book a retained slot (CONFIRMED overlap)
 * 9. MAINTENANCE slots remain unavailable
 *
 * Plus utility coverage:
 * - cancelBooking blocked after entry
 * - releaseBookingEarly API validation
 * - EARLY_RELEASED status filter in admin bookings list
 * - gateSessions array populated correctly on each cycle
 * - completeExpiredBookings job handles retained/multi-session bookings
 */

import 'dotenv/config';

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from 'vitest';

import app from '../src/app.js';
import User from '../src/module/auth/auth.model.js';
import Vehicle from '../src/module/vehicles/vehicle.model.js';
import ParkingSlot from '../src/module/parking-slot/parking-slot.model.js';
import Booking from '../src/module/booking/booking.model.js';
import { completeExpiredBookings } from '../src/module/booking/booking.job.js';

// ─── Shared test state ────────────────────────────────────────────────────────

let mongod;
let adminToken;
let customerToken;
let customer;
let otherCustomer;
let otherToken;
let vehicle;      // FOUR_WHEELER owned by `customer`
let otherVehicle; // FOUR_WHEELER owned by `otherCustomer`
let slot;         // reusable FOUR_WHEELER slot

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Admin
  await User.create({
    name: 'Lifecycle Admin',
    email: 'admin-lifecycle@test.com',
    password: 'Test@12345',
    role: 'admin',
    isVerified: true,
  });

  // Customers
  customer = await User.create({
    name: 'Lifecycle Customer',
    email: 'cust-lifecycle@test.com',
    password: 'Test@12345',
    role: 'customer',
    isVerified: true,
  });

  otherCustomer = await User.create({
    name: 'Other Lifecycle Customer',
    email: 'cust-other-lifecycle@test.com',
    password: 'Test@12345',
    role: 'customer',
    isVerified: true,
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin-lifecycle@test.com', password: 'Test@12345' });
  expect(adminLogin.status).toBe(200);
  adminToken = adminLogin.body.data.accessToken;

  const custLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'cust-lifecycle@test.com', password: 'Test@12345' });
  expect(custLogin.status).toBe(200);
  customerToken = custLogin.body.data.accessToken;

  const otherLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'cust-other-lifecycle@test.com', password: 'Test@12345' });
  expect(otherLogin.status).toBe(200);
  otherToken = otherLogin.body.data.accessToken;

  vehicle = await Vehicle.create({
    vehicleOwner: customer._id,
    vehicleNumber: 'LC01AA0001',
    vehicleType: 'FOUR_WHEELER',
  });

  otherVehicle = await Vehicle.create({
    vehicleOwner: otherCustomer._id,
    vehicleNumber: 'LC01BB0002',
    vehicleType: 'FOUR_WHEELER',
  });

  slot = await ParkingSlot.create({
    slotNumber: 'LC-A01',
    vehicleType: 'FOUR_WHEELER',
    status: 'ACTIVE',
  });
}, 30_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}, 30_000);

// Clean up bookings created by each test so the slot is free for the next test
afterEach(async () => {
  await Booking.deleteMany({});
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const adminAuth = () => ({ Authorization: `Bearer ${adminToken}` });
const custAuth  = () => ({ Authorization: `Bearer ${customerToken}` });
const otherAuth = () => ({ Authorization: `Bearer ${otherToken}` });

/** Create a booking whose window is currently active (startTime 5 min in the past). */
async function createActiveBooking({
  durationHours = 2,
  auth = custAuth(),
  vehicleId = vehicle._id.toString(),
  slotId = slot._id.toString(),
} = {}) {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end   = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

  const res = await request(app)
    .post('/api/bookings')
    .set(auth)
    .send({
      vehicleId,
      parkingSlotId: slotId,
      startTime: start.toISOString(),
      endTime:   end.toISOString(),
    });

  expect(res.status).toBe(201);
  const bookingId = res.body.data.booking._id;

  // Push startTime into the past so ENTRY scans are accepted
  await Booking.updateOne(
    { _id: bookingId },
    { $set: { startTime: new Date(Date.now() - 5 * 60 * 1000) } },
  );

  return { bookingId, endTime: end };
}

/** Generate a QR token for a booking (as the booking owner). */
async function generateQr(bookingId, auth = custAuth()) {
  const res = await request(app)
    .post(`/api/bookings/${bookingId}/qr`)
    .set(auth);
  expect(res.status).toBe(200);
  return res.body.data.qrToken;
}

/** Scan a QR token at the gate. */
async function scan(qrToken, action, expectedStatus = 200) {
  const res = await request(app)
    .post('/api/bookings/scan')
    .set(adminAuth())
    .send({ qrToken, action });
  expect(res.status).toBe(expectedStatus);
  return res.body;
}

/** Push a booking's endTime into the past to simulate expiry. */
async function expireBooking(bookingId, msAgo = 60 * 60 * 1000) {
  const past = new Date(Date.now() - msAgo);
  await Booking.updateOne(
    { _id: bookingId },
    {
      $set: {
        startTime: new Date(past.getTime() - 60 * 60 * 1000),
        endTime: past,
      },
    },
  );
}

// ─── Scenario 1: Normal ENTRY → EXIT ─────────────────────────────────────────

describe('Scenario 1 — Normal ENTRY → EXIT', () => {
  it('records entry, records exit, marks booking COMPLETED and clears QR', async () => {
    const { bookingId } = await createActiveBooking();

    // ENTRY
    const entryToken = await generateQr(bookingId);
    const entryBody  = await scan(entryToken, 'ENTRY');
    expect(entryBody.data.booking.entryAt).toBeTruthy();
    expect(entryBody.data.booking.exitAt).toBeNull();
    expect(entryBody.data.action).toBe('ENTRY');
    expect(entryBody.data.isEarlyExit).toBe(false);

    // Verify gateSessions populated
    const afterEntry = await Booking.findById(bookingId);
    expect(afterEntry.gateSessions).toHaveLength(1);
    expect(afterEntry.gateSessions[0].entryAt).toBeTruthy();
    expect(afterEntry.gateSessions[0].exitAt).toBeNull();

    // Customer generates Exit QR (replaces hash)
    const exitToken = await generateQr(bookingId);
    expect(exitToken).not.toBe(entryToken);

    // Move endTime to <= now to simulate exiting at/after scheduled end (normal non-early exit)
    await Booking.updateOne(
      { _id: bookingId },
      { $set: { endTime: new Date(Date.now() - 60 * 1000) } },
    );

    // EXIT
    const exitBody = await scan(exitToken, 'EXIT');
    expect(exitBody.data.booking.exitAt).toBeTruthy();
    expect(exitBody.data.booking.status).toBe('COMPLETED');
    expect(exitBody.data.isEarlyExit).toBe(false);

    // Verify gateSessions closed and QR cleared
    const afterExit = await Booking.findById(bookingId).select('+qrTokenHash');
    expect(afterExit.gateSessions).toHaveLength(1);
    expect(afterExit.gateSessions[0].exitAt).toBeTruthy();
    expect(afterExit.qrTokenHash).toBeUndefined();
  });
});

// ─── Scenario 2: Early EXIT → retain → re-entry → final EXIT ─────────────────

describe('Scenario 2 — Early EXIT → retain reservation → re-entry → final EXIT', () => {
  it('allows re-entry after early exit when reservation is retained', async () => {
    const { bookingId } = await createActiveBooking({ durationHours: 3 });

    // Cycle 1: ENTRY
    const entryToken1 = await generateQr(bookingId);
    await scan(entryToken1, 'ENTRY');

    // Cycle 1: early EXIT
    const exitToken1  = await generateQr(bookingId);
    const earlyExitBody = await scan(exitToken1, 'EXIT');
    expect(earlyExitBody.data.isEarlyExit).toBe(true);
    expect(earlyExitBody.data.booking.status).toBe('CONFIRMED'); // still CONFIRMED
    expect(earlyExitBody.data.booking.exitAt).toBeTruthy();

    // Admin chooses NOT to release — no PATCH /release called
    // Booking remains CONFIRMED + exitAt set → retained state

    // Verify gateSessions cycle 1 closed
    const afterEarlyExit = await Booking.findById(bookingId);
    expect(afterEarlyExit.gateSessions).toHaveLength(1);
    expect(afterEarlyExit.gateSessions[0].exitAt).toBeTruthy();
    expect(afterEarlyExit.status).toBe('CONFIRMED');

    // Re-entry: customer generates new QR (entryAt=null again after exit? No —
    // the ENTRY scan uses $or: [entryAt null, exitAt != null] so retained state works)
    const reentryToken = await generateQr(bookingId);
    const reentryBody  = await scan(reentryToken, 'ENTRY');
    expect(reentryBody.data.booking.entryAt).toBeTruthy();
    expect(reentryBody.data.booking.exitAt).toBeNull();
    expect(reentryBody.data.action).toBe('ENTRY');

    // Verify gateSessions now has 2 cycles
    const afterReentry = await Booking.findById(bookingId);
    expect(afterReentry.gateSessions).toHaveLength(2);
    expect(afterReentry.gateSessions[1].entryAt).toBeTruthy();
    expect(afterReentry.gateSessions[1].exitAt).toBeNull();

    // Final EXIT
    const finalExitToken = await generateQr(bookingId);
    const finalExitBody  = await scan(finalExitToken, 'EXIT');
    expect(finalExitBody.data.isEarlyExit).toBe(true); // still before endTime
    expect(finalExitBody.data.booking.exitAt).toBeTruthy();

    // Verify gateSessions cycle 2 closed
    const afterFinalExit = await Booking.findById(bookingId);
    expect(afterFinalExit.gateSessions).toHaveLength(2);
    expect(afterFinalExit.gateSessions[1].exitAt).toBeTruthy();
  });
});

// ─── Scenario 3: Early EXIT → release ────────────────────────────────────────

describe('Scenario 3 — Early EXIT → release remaining reservation', () => {
  it('marks booking EARLY_RELEASED, clears QR, and makes slot available for another booking', async () => {
    const { bookingId, endTime } = await createActiveBooking({ durationHours: 3 });

    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');

    const exitToken = await generateQr(bookingId);
    const earlyExit = await scan(exitToken, 'EXIT');
    expect(earlyExit.data.isEarlyExit).toBe(true);

    // Admin releases
    const releaseRes = await request(app)
      .patch(`/api/bookings/admin/${bookingId}/release`)
      .set(adminAuth());
    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.data.booking.status).toBe('EARLY_RELEASED');
    expect(releaseRes.body.data.booking.releasedAt).toBeTruthy();

    // DB confirms no QR hash
    const released = await Booking.findById(bookingId).select('+qrTokenHash');
    expect(released.status).toBe('EARLY_RELEASED');
    expect(released.qrTokenHash).toBeFalsy();

    // Customer cannot regenerate QR
    const qrAttempt = await request(app)
      .post(`/api/bookings/${bookingId}/qr`)
      .set(custAuth());
    expect(qrAttempt.status).toBe(400);

    // Slot is immediately available in availability check and can be booked by another customer
    const nextStart = new Date(Date.now() + 15 * 60 * 1000);
    const nextEnd = new Date(endTime.getTime());

    const availRes = await request(app)
      .get('/api/parking-slots/availability')
      .set(otherAuth())
      .query({
        vehicleType: 'FOUR_WHEELER',
        startTime: nextStart.toISOString(),
        endTime: nextEnd.toISOString(),
      });
    expect(availRes.status).toBe(200);
    const availableIds = availRes.body.data.slots.map((s) => s._id);
    expect(availableIds).toContain(slot._id.toString());

    const rebookRes = await request(app)
      .post('/api/bookings')
      .set(otherAuth())
      .send({
        vehicleId: otherVehicle._id.toString(),
        parkingSlotId: slot._id.toString(),
        startTime: nextStart.toISOString(),
        endTime: nextEnd.toISOString(),
      });
    expect(rebookRes.status).toBe(201);
  });

  it('appears in admin bookings list when filtered by EARLY_RELEASED', async () => {
    const { bookingId } = await createActiveBooking({ durationHours: 3 });

    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');
    const exitToken = await generateQr(bookingId);
    await scan(exitToken, 'EXIT');

    await request(app)
      .patch(`/api/bookings/admin/${bookingId}/release`)
      .set(adminAuth());

    const listRes = await request(app)
      .get('/api/bookings/admin')
      .set(adminAuth())
      .query({ status: 'EARLY_RELEASED' });
    expect(listRes.status).toBe(200);
    const ids = listRes.body.data.bookings.map((b) => b._id);
    expect(ids).toContain(bookingId);
  });
});

// ─── Scenario 4: Duplicate ENTRY rejected ─────────────────────────────────────

describe('Scenario 4 — Duplicate ENTRY scan rejected', () => {
  it('rejects a second ENTRY scan while customer is inside', async () => {
    const { bookingId } = await createActiveBooking();

    const token1 = await generateQr(bookingId);
    await scan(token1, 'ENTRY'); // first ENTRY ok

    // Generating a new QR replaces hash — old token is dead
    const token2 = await generateQr(bookingId);

    // token1 is now stale (hash replaced)
    await scan(token1, 'ENTRY', 400);

    // token2 would work for EXIT (checked-in), but not ENTRY again
    await scan(token2, 'ENTRY', 400); // already inside (exitAt = null)
  });
});

// ─── Scenario 5: Duplicate EXIT rejected ──────────────────────────────────────

describe('Scenario 5 — Duplicate EXIT scan rejected', () => {
  it('rejects a second EXIT scan after exit already recorded', async () => {
    const { bookingId } = await createActiveBooking();

    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');

    const exitToken = await generateQr(bookingId);
    await scan(exitToken, 'EXIT'); // first EXIT ok

    // Second EXIT with same token must fail
    await scan(exitToken, 'EXIT', 400);
  });
});

// ─── Scenario 6: Re-entry after release rejected ──────────────────────────────

describe('Scenario 6 — Re-entry after EARLY_RELEASED rejected', () => {
  it('rejects ENTRY scan after the booking has been released', async () => {
    const { bookingId } = await createActiveBooking({ durationHours: 3 });

    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');

    const exitToken = await generateQr(bookingId);
    await scan(exitToken, 'EXIT');

    // Admin releases
    await request(app)
      .patch(`/api/bookings/admin/${bookingId}/release`)
      .set(adminAuth());

    // Customer cannot generate QR
    const qrAttempt = await request(app)
      .post(`/api/bookings/${bookingId}/qr`)
      .set(custAuth());
    expect(qrAttempt.status).toBe(400);

    // Even if they somehow had an old QR token, the hash is cleared
    await scan(exitToken, 'ENTRY', 400);
  });
});

// ─── Scenario 7: Re-entry after scheduled end rejected ────────────────────────

describe('Scenario 7 — Re-entry after scheduled end rejected', () => {
  it('rejects ENTRY scan when booking window has expired', async () => {
    const { bookingId } = await createActiveBooking({ durationHours: 2 });

    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');

    // Perform a valid early exit so exitToken remains the active QR hash and exitAt is recorded
    const exitToken = await generateQr(bookingId);
    const earlyExit = await scan(exitToken, 'EXIT');
    expect(earlyExit.data.isEarlyExit).toBe(true);

    // Push endTime into the past (window has ended)
    await expireBooking(bookingId);

    // Expired + exited: QR generation should be blocked
    const qrAttempt = await request(app)
      .post(`/api/bookings/${bookingId}/qr`)
      .set(custAuth());
    expect(qrAttempt.status).toBe(400);

    // Even with the active qrTokenHash still stored, ENTRY scan must fail because endTime <= now
    await scan(exitToken, 'ENTRY', 400);
  });
});

// ─── Scenario 8: Another customer cannot book retained slot ───────────────────

describe('Scenario 8 — Retained slot unavailable to other customers', () => {
  it('rejects overlapping booking for the same slot while reservation is retained', async () => {
    // Customer 1 books the slot for 3 hours
    const { bookingId, endTime } = await createActiveBooking({ durationHours: 3 });

    // Customer 1 enters and exits early (slot is retained, still CONFIRMED)
    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');
    const exitToken = await generateQr(bookingId);
    await scan(exitToken, 'EXIT');

    // Confirm booking 1 is still CONFIRMED (retained)
    const b1 = await Booking.findById(bookingId);
    expect(b1.status).toBe('CONFIRMED');

    // Customer 2 tries to book the same slot overlapping the same window
    const overlapStart = new Date(Date.now() + 30 * 60 * 1000);
    const overlapEnd   = new Date(endTime.getTime() - 10 * 60 * 1000);

    const conflictRes = await request(app)
      .post('/api/bookings')
      .set(otherAuth())
      .send({
        vehicleId: otherVehicle._id.toString(),
        parkingSlotId: slot._id.toString(),
        startTime: overlapStart.toISOString(),
        endTime: overlapEnd.toISOString(),
      });

    // Must be rejected with 409 Conflict (or 400) due to CONFIRMED overlap
    expect([400, 409]).toContain(conflictRes.status);
  });
});

// ─── Scenario 9: MAINTENANCE slots remain unavailable ────────────────────────

describe('Scenario 9 — MAINTENANCE slots unavailable', () => {
  it('rejects new bookings on a MAINTENANCE slot', async () => {
    const maintenanceSlot = await ParkingSlot.create({
      slotNumber: 'LC-MAINT01',
      vehicleType: 'FOUR_WHEELER',
      status: 'MAINTENANCE',
    });

    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end   = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const res = await request(app)
      .post('/api/bookings')
      .set(custAuth())
      .send({
        vehicleId:     vehicle._id.toString(),
        parkingSlotId: maintenanceSlot._id.toString(),
        startTime:     start.toISOString(),
        endTime:       end.toISOString(),
      });

    expect([400, 409]).toContain(res.status);

    await ParkingSlot.deleteOne({ _id: maintenanceSlot._id });
  });
});

// ─── Additional: cancelBooking blocked after entry ────────────────────────────

describe('Cancel booking blocked after entry', () => {
  it('prevents cancellation once a gate entry has been recorded', async () => {
    const { bookingId } = await createActiveBooking();

    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');

    const cancelRes = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set(custAuth());
    expect(cancelRes.status).toBe(400);
  });
});

// ─── Additional: releaseBookingEarly validation ───────────────────────────────

describe('releaseBookingEarly validation', () => {
  it('rejects release if booking has not been exited yet', async () => {
    const { bookingId } = await createActiveBooking({ durationHours: 3 });

    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');

    // Try releasing while customer is still inside (exitAt = null)
    const releaseRes = await request(app)
      .patch(`/api/bookings/admin/${bookingId}/release`)
      .set(adminAuth());
    expect(releaseRes.status).toBe(400);
  });

  it('rejects double release', async () => {
    const { bookingId } = await createActiveBooking({ durationHours: 3 });

    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');
    const exitToken = await generateQr(bookingId);
    await scan(exitToken, 'EXIT');

    // First release succeeds
    const first = await request(app)
      .patch(`/api/bookings/admin/${bookingId}/release`)
      .set(adminAuth());
    expect(first.status).toBe(200);

    // Second release must fail
    const second = await request(app)
      .patch(`/api/bookings/admin/${bookingId}/release`)
      .set(adminAuth());
    expect(second.status).toBe(400);
  });

  it('rejects release when booking period has already ended', async () => {
    const { bookingId } = await createActiveBooking({ durationHours: 2 });

    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');

    // Set exitAt so it looks like customer exited
    await Booking.updateOne(
      { _id: bookingId },
      { $set: { exitAt: new Date(Date.now() - 10 * 60 * 1000) } },
    );

    // Expire the booking window
    await expireBooking(bookingId);

    const releaseRes = await request(app)
      .patch(`/api/bookings/admin/${bookingId}/release`)
      .set(adminAuth());
    expect(releaseRes.status).toBe(400);
  });
});

// ─── Additional: completeExpiredBookings cron job ─────────────────────────────

describe('completeExpiredBookings cron job', () => {
  it('completes expired CONFIRMED bookings that never entered', async () => {
    const { bookingId } = await createActiveBooking();
    await expireBooking(bookingId);

    await completeExpiredBookings();

    const booking = await Booking.findById(bookingId);
    expect(booking.status).toBe('COMPLETED');
  });

  it('completes expired CONFIRMED bookings that exited (retained) but window ended', async () => {
    const { bookingId } = await createActiveBooking({ durationHours: 2 });

    // Record entry and exit (retained — CONFIRMED + both entryAt/exitAt set)
    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');
    const exitToken = await generateQr(bookingId);
    await scan(exitToken, 'EXIT');

    // Confirm retained
    const retained = await Booking.findById(bookingId);
    expect(retained.status).toBe('CONFIRMED');

    // Expire the window
    await expireBooking(bookingId);

    await completeExpiredBookings();

    const completed = await Booking.findById(bookingId);
    expect(completed.status).toBe('COMPLETED');
  });

  it('completes expired CONFIRMED bookings where customer is still inside at expiry', async () => {
    const { bookingId } = await createActiveBooking({ durationHours: 2 });

    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');

    // Expire the window while still inside
    await expireBooking(bookingId);

    await completeExpiredBookings();

    const booking = await Booking.findById(bookingId);
    expect(booking.status).toBe('COMPLETED');
    // QR hash should be preserved (customer can still scan to exit)
    // (the job does NOT unset qrTokenHash for inside bookings)
  });

  it('does NOT re-complete EARLY_RELEASED bookings', async () => {
    const { bookingId } = await createActiveBooking({ durationHours: 3 });

    const entryToken = await generateQr(bookingId);
    await scan(entryToken, 'ENTRY');
    const exitToken = await generateQr(bookingId);
    await scan(exitToken, 'EXIT');

    await request(app)
      .patch(`/api/bookings/admin/${bookingId}/release`)
      .set(adminAuth());

    await expireBooking(bookingId);

    await completeExpiredBookings(); // must not throw or change status

    const booking = await Booking.findById(bookingId);
    expect(booking.status).toBe('EARLY_RELEASED'); // unchanged
  });
});

// ─── Additional: gateSessions accuracy across multiple cycles ─────────────────

describe('gateSessions array accuracy', () => {
  it('accurately records each cycle entry and exit timestamp', async () => {
    const { bookingId } = await createActiveBooking({ durationHours: 4 });

    // Cycle 1
    const t1Entry = await generateQr(bookingId);
    await scan(t1Entry, 'ENTRY');
    const t1Exit = await generateQr(bookingId);
    await scan(t1Exit, 'EXIT'); // isEarlyExit → retained

    // Cycle 2
    const t2Entry = await generateQr(bookingId);
    await scan(t2Entry, 'ENTRY');
    const t2Exit = await generateQr(bookingId);
    await scan(t2Exit, 'EXIT'); // second early exit → retained

    const booking = await Booking.findById(bookingId);
    expect(booking.gateSessions).toHaveLength(2);

    for (const session of booking.gateSessions) {
      expect(session.entryAt).toBeTruthy();
      expect(session.exitAt).toBeTruthy();
    }

    // Cycle 2 timestamps must be later than cycle 1
    expect(
      new Date(booking.gateSessions[1].entryAt).getTime(),
    ).toBeGreaterThan(
      new Date(booking.gateSessions[0].entryAt).getTime(),
    );
  });
});
