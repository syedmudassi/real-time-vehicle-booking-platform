import express from 'express'
import authMiddleware from '../middlewares/auth.js';
import adminAuth from '../middlewares/adminAuth.js';
import { createBooking, deleteBooking, getBookings, getMyBookings, updateBooking, updateBookingStatus, updateMyBookingStatus } from '../controllers/bookingController.js';
import { uploads } from '../middlewares/uploads.js';


const bookingRouter = express.Router();

bookingRouter.post('/', authMiddleware, uploads.single('carImage'), createBooking);
// Temporarily allow booking list fetch without admin auth for local testing.
bookingRouter.get('/', (req, res, next) => {
  console.log('Booking list request received; adminAuth bypassed');
  return getBookings(req, res, next);
});

bookingRouter.get('/mybooking', authMiddleware, getMyBookings);

// Logged-in customer: cancel own booking (must be before "/:id/status" so "my" is not parsed as id)
bookingRouter.patch('/my/:id/status', authMiddleware, updateMyBookingStatus);

bookingRouter.put('/:id', adminAuth, uploads.single('carImage'), updateBooking);
bookingRouter.patch('/:id/status', adminAuth, updateBookingStatus);
bookingRouter.delete('/:id', adminAuth, deleteBooking);

export default bookingRouter;