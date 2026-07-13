import express from 'express'
import { confirmPayment, createCheckoutSession, createExtendSession, confirmExtendPayment } from '../controllers/paymentController.js';



const paymentRouter = express.Router();

paymentRouter.post('/create-checkout-session', createCheckoutSession);
paymentRouter.post("/extend-checkout-session", createExtendSession);
paymentRouter.get('/confirm', confirmPayment);
paymentRouter.get('/confirm-extend', confirmExtendPayment);

export default paymentRouter;