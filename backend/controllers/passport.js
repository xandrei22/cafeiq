const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { sendWelcomeEmail } = require('../utils/emailService');

module.exports = (passport, db) => {
    // Store just the identifier (or a small key object)
    passport.serializeUser((user, done) => done(null, user && (user.id || user.customer_id || user.userId)));

    // Be defensive: sessions can persist across deploys or schema changes.
    // Never throw; if anything looks wrong, treat as no session (done(null, false)).
    passport.deserializeUser(async(id, done) => {
        try {
            // Handle unexpected shapes (e.g., object stored instead of primitive)
            const customerId = (id && typeof id === 'object') ? (id.id || id.customer_id || id.userId) : id;
            if (!customerId) {
                return done(null, false);
            }

            const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [customerId]);
            if (!rows || rows.length === 0) {
                return done(null, false); // no customer found – invalidate quietly
            }
            return done(null, rows[0]);
        } catch (err) {
            // Log but do not take down the request chain
            console.error('Passport deserializeUser error:', err);
            return done(null, false);
        }
    });

    // Only configure Google OAuth if credentials are provided
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        passport.use(new GoogleStrategy({
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback'
            },
            async(accessToken, refreshToken, profile, done) => {
                try {
                    // Check if a customer exists with this Google ID
                    const [rows] = await db.query('SELECT * FROM customers WHERE google_id = ?', [profile.id]);
                    if (rows.length > 0) {
                        rows[0].isNewGoogleUser = false;
                        return done(null, rows[0]);
                    }

                    const email = profile.emails[0].value;
                    const full_name = profile.displayName;
                    const google_id = profile.id;
                    // Generate username from email (before @)
                    const username = email.split('@')[0];
                    // Set a placeholder password
                    const password = 'GOOGLE_AUTH';

                    // Check if an account with this email exists but is not a Google account
                    const [existingEmail] = await db.query('SELECT * FROM customers WHERE email = ?', [email]);
                    if (existingEmail.length > 0 && existingEmail[0].password !== 'GOOGLE_AUTH') {
                        // Prevent Google login and show error
                        const error = new Error('This email is already registered with a password. Please log in using your email and password.');
                        error.code = 'EMAIL_REGISTERED_PASSWORD';
                        return done(error, false);
                    }

                    console.log('Attempting to insert new Google customer:', { google_id, email, full_name, username });
                    const [result] = await db.query(
                        'INSERT INTO customers (google_id, email, full_name, username, password, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [google_id, email, full_name, username, password]
                    );
                    console.log('Insert result:', result);

                    // Award welcome points if enabled
                    const { awardWelcomePoints } = require('../utils/welcomePointsService');
                    try {
                        const welcomeResult = await awardWelcomePoints(result.insertId, email, full_name);
                        console.log('Welcome points result (Google):', welcomeResult);
                    } catch (welcomeError) {
                        console.error('Error awarding welcome points (Google):', welcomeError);
                        // Don't fail the signup if welcome points fail
                    }

                    // Send welcome email
                    try {
                        await sendWelcomeEmail(email, full_name);
                    } catch (emailError) {
                        console.error('Error sending welcome email (Google signup):', emailError);
                    }

                    const [customer] = await db.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
                    customer[0].isNewGoogleUser = true;
                    return done(null, customer[0]);
                } catch (err) {
                    return done(err);
                }
            }));
    } else {
        console.log('⚠️  Google OAuth not configured - skipping Google authentication setup');
    }
};