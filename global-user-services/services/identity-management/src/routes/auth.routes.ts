import express from 'express';
import { changeEmailController, changeEmailSupportController, login, logout, newsletterSignUp, refreshToken, register, resendEmail, verifyEmail } from '../controllers/auth.controller';
import { changeEmailLimiter, loginLimiter } from '../services/auth.service';

const router = express.Router();

router.post('/signup', register);
router.get('/verify_email', verifyEmail)
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/refresh_token', refreshToken);
router.post('/newsletter_signup', newsletterSignUp);
 router.post('/resend_verification_email', resendEmail);
router.post('/change-email', changeEmailLimiter, changeEmailController);
router.post('/change-email-support', changeEmailLimiter, changeEmailSupportController);

export default router;