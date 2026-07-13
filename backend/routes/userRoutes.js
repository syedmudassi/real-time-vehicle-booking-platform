import express from 'express'
import authMiddleware from '../middlewares/auth.js'
import {
	getProfile,
	updateProfile,
	login,
	register,
	checkEmail,
	verifyStatus,
	verifyEmail,
	resendVerificationEmail,
	forgotPassword,
	resetPassword,
} from '../controllers/userController.js'

const userRouter = express.Router();

userRouter.get('/me', authMiddleware, getProfile);
userRouter.put('/me', authMiddleware, updateProfile);
userRouter.get('/check-email', checkEmail);
userRouter.get('/verify-status', verifyStatus);
userRouter.get('/verify-email', verifyEmail);
userRouter.post('/resend-verification', resendVerificationEmail);
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/reset-password', resetPassword);
userRouter.post('/login', login);
userRouter.post('/register', register);

export default userRouter;