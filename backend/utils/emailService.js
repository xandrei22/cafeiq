const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter using environment variables or disable email if not configured
let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // Verify transporter configuration
    transporter.verify(function(error, success) {
        if (error) {
            console.error('Email configuration error:', error);
            console.log('Email service disabled - check EMAIL_USER and EMAIL_PASS environment variables');
            transporter = null;
        } else {
            console.log('Email server is ready to send messages');
        }
    });
} else {
    console.log('Email service disabled - EMAIL_USER and EMAIL_PASS not configured');
}

// Function to send welcome email
const sendWelcomeEmail = async(email, fullName) => {
    try {
        if (!transporter) {
            console.log('Email service not available - skipping welcome email to:', email);
            return;
        }

        console.log('Attempting to send welcome email to:', email);

        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@coffeeshop.com',
            to: email,
            subject: 'Welcome to Our Coffee Shop - Your Journey Begins! 🎉',
            html: `
                <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <!-- Header with Logo -->
          <div style="text-align: center; padding: 20px 0; background-color: #8B4513; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Our Coffee Shop!</h1>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Dear ${fullName},</p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">We're absolutely thrilled to welcome you to our coffee shop family! ☕</p>

            <!-- Features Section -->
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #8B4513; margin-top: 0;">Your Account Benefits</h2>
              <ul style="list-style-type: none; padding: 0;">
                <li style="margin: 15px 0; padding-left: 25px; position: relative;">
                  <span style="color: #8B4513; position: absolute; left: 0;">✓</span>
                  <strong>QR Code Menu Access</strong> - Scan table QR codes for instant menu access
                </li>
                <li style="margin: 15px 0; padding-left: 25px; position: relative;">
                  <span style="color: #8B4513; position: absolute; left: 0;">✓</span>
                  <strong>AI-Powered Recommendations</strong> - Get personalized drink suggestions
                </li>
                <li style="margin: 15px 0; padding-left: 25px; position: relative;">
                  <span style="color: #8B4513; position: absolute; left: 0;">✓</span>
                  <strong>Loyalty Rewards</strong> - Earn points with every purchase
                </li>
                <li style="margin: 15px 0; padding-left: 25px; position: relative;">
                  <span style="color: #8B4513; position: absolute; left: 0;">✓</span>
                  <strong>Real-time Order Tracking</strong> - Track your order status live
                </li>
              </ul>
            </div>

            <!-- Special Welcome Offer -->
            <div style="background-color: #8B4513; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="margin-top: 0;">Special Welcome Offer! 🎁</h3>
              <p style="margin-bottom: 0;">Get 20% off your first order when you use the code: <strong>WELCOME20</strong></p>
            </div>

            <!-- Contact Information -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px;">Need help? We're here for you!</p>
              <p style="color: #666; font-size: 14px;">
                📞 Phone: (123) 456-7890<br>
                ✉️ Email: support@coffeeshop.com<br>
                🌐 Website: www.coffeeshop.com
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee;">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>© 2024 Our Coffee Shop. All rights reserved.</p>
          </div>
        </div>
      `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully:', {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected
        });
    } catch (error) {
        console.error('Error sending welcome email:', error.message);
        // Don't throw error - just log it so it doesn't crash the application
    }
};

// Function to send reset password email
const sendResetPasswordEmail = async(email, fullName, resetLink) => {
    try {
        if (!transporter) {
            console.log('Email service not available - skipping password reset email to:', email);
            return;
        }

        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@coffeeshop.com',
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                  <div style="text-align: center; padding: 20px 0; background-color: #8B4513; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset Request</h1>
                  </div>
                  <div style="padding: 30px 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">Dear ${fullName},</p>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to reset it. This link will expire in 1 hour.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${resetLink}" style="background-color: #8B4513; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 18px;">Reset Password</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">If you did not request a password reset, you can safely ignore this email.</p>
                  </div>
                  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee;">
                    <p>This is an automated message, please do not reply to this email.</p>
                    <p>© 2024 Our Coffee Shop. All rights reserved.</p>
                  </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending reset password email:', error.message);
        // Don't throw error - just log it
    }
};

/**
 * Send a low-stock alert email
 * @param {string} to - Recipient email address
 * @param {Array} items - Array of low-stock inventory items
 */
async function sendLowStockAlert(to, items) {
    try {
        if (!transporter) {
            console.log('Email service not available - skipping low stock alert');
            return;
        }

        const itemList = items.map(item => `${item.name} (${item.quantity} ${item.unit})`).join('<br>');
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@coffeeshop.com',
            to,
            subject: 'Low Stock Alert',
            html: `<h3>Low Stock Alert</h3><p>The following items are low in stock:</p><p>${itemList}</p>`
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending low stock alert:', error.message);
    }
}

/**
 * Send event status email to customer
 * @param {string} to - Customer email
 * @param {string} status - 'accepted' or 'rejected'
 * @param {object} event - Event details
 */
async function sendEventStatusEmail(to, status, event) {
    try {
        if (!transporter) {
            console.log('Email service not available - skipping event status email');
            return;
        }

        const subject = `Your Coffee Shop Event Request has been ${status}`;
        const statusText = status === 'accepted' ? 'accepted' : 'rejected';
        const html = `
            <h2>Event Request ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</h2>
            <p>Dear Customer,</p>
            <p>Your event request for <b>${event.event_date}</b> at <b>${event.address}</b> for <b>${event.cups}</b> cups of coffee has been <b>${statusText}</b> by the admin.</p>
            <p>Contact Number: ${event.contact_number}</p>
            <p>Thank you for choosing our Coffee Shop!</p>
        `;
        await transporter.sendMail({
            from: process.env.EMAIL_USER || 'noreply@coffeeshop.com',
            to,
            subject,
            html,
        });
    } catch (error) {
        console.error('Error sending event status email:', error.message);
    }
}

/**
 * Generic email sending function
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 */
async function sendEmail(options) {
    try {
        if (!transporter) {
            console.log('Email service not available - skipping email to:', options.to);
            return;
        }

        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@coffeeshop.com',
            to: options.to,
            subject: options.subject,
            html: options.html
        };

        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', options.to);
    } catch (error) {
        console.error('Error sending email:', error.message);
        throw error;
    }
}

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendResetPasswordEmail,
    sendLowStockAlert,
    sendEventStatusEmail
};