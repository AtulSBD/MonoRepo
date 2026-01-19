import express from 'express';
import {
    changePassword,
    resetPassword,
    confirmResetPassword,
    validateToken,
    getToken
} from '../controllers/password.controller';

const router = express.Router();

router.post('/change', changePassword);
router.post('/reset', resetPassword);
router.post('/confirm_reset',confirmResetPassword)
router.post('/validate_token',validateToken)
router.post('/get_token',getToken)


export default router;
