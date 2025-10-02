const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const customerController = require('../controllers/customerController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const passport = require('passport');

// Admin routes
router.post('/admin/login', adminController.login);
router.get('/admin/check-session', adminController.checkSession);
router.post('/admin/logout', adminController.logout);

// Staff routes (can be used by both admin and staff)
router.post('/staff/login', adminController.staffLogin);
router.get('/staff/check-session', adminController.checkStaffSession);
router.post('/staff/logout', adminController.staffLogout);
router.post('/staff/forgot-password', adminController.staffForgotPassword);
router.post('/staff/reset-password', adminController.staffResetPassword);

// Customer routes
router.post('/customer/signup', customerController.signup);
router.post('/customer/login', customerController.login);
router.get('/customer/check-session', customerController.checkSession);
router.post('/customer/logout', customerController.logout);

// Forgot password and reset password routes
router.post('/customer/forgot-password', customerController.forgotPassword);
router.post('/customer/reset-password', customerController.resetPassword);

// Google OAuth - Start authentication
router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth - Callback
router.get('/auth/google/callback',
    (req, res, next) => {
        passport.authenticate('google', {
            session: true
        }, (err, user, info) => {
            if (err) {
                // If the error is about email already registered, redirect with a message
                if (err.code === 'EMAIL_REGISTERED_PASSWORD') {
                    return res.redirect('http://localhost:5173/login?error=EMAIL_REGISTERED_PASSWORD');
                }
                // For other errors, redirect with a generic error
                return res.redirect('http://localhost:5173/login?error=GOOGLE_AUTH_ERROR');
            }
            if (!user) {
                return res.redirect('http://localhost:5173/login?error=GOOGLE_AUTH_ERROR');
            }
            req.logIn(user, (loginErr) => {
                if (loginErr) {
                    console.error('Google login error:', loginErr);
                    return res.redirect('http://localhost:5173/login?error=GOOGLE_AUTH_ERROR');
                }

                // Set customer session with correct key
                req.session.customerUser = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    role: 'customer'
                };

                console.log('Google OAuth successful - Session set:', req.session.customerUser);

                req.session.save(() => {
                    const isNew = user && user.isNewGoogleUser;
                    console.log('Redirecting user - isNew:', isNew);
                    if (isNew) {
                        res.redirect('http://localhost:5173/customer/dashboard?google=new');
                    } else {
                        res.redirect('http://localhost:5173/customer/dashboard');
                    }
                });
            });
        })(req, res, next);
    }
);

// Error handling for routes
router.use((err, req, res, next) => {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Route error occurred' });
});

module.exports = router;