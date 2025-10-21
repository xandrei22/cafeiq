const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/receipts');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const orderId = req.body.orderId || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `receipt_${orderId}_${timestamp}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit to tolerate large screenshots
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPG, PNG, GIF).'));
        }
    }
});

// Upload receipt for order verification
router.post('/upload-receipt', (req, res) => {
    upload.single('receipt')(req, res, async(err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : (err.message || 'Upload failed');
            return res.status(400).json({ success: false, message });
        }
        try {
            const { orderId } = req.body;
            const receiptFile = req.file;

            if (!orderId) {
                return res.status(400).json({ success: false, message: 'Order ID is required' });
            }

            if (!receiptFile) {
                return res.status(400).json({ success: false, message: 'Receipt file is required' });
            }

            // Verify order exists
            const [orderRows] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
            if (orderRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            const order = orderRows[0];
            if (order.payment_status === 'paid') {
                return res.status(400).json({ success: false, message: 'Order payment is already verified' });
            }

            const receiptPath = `/uploads/receipts/${receiptFile.filename}`;
            await db.query('UPDATE orders SET receipt_path = ?, payment_status = "pending_verification", updated_at = NOW() WHERE order_id = ?', [receiptPath, orderId]);

            // Verify the update was successful
            const [verifyUpdate] = await db.query('SELECT order_id, status, payment_status FROM orders WHERE order_id = ?', [orderId]);
            console.log('🔍 Receipt upload verification:', { orderId, order: verifyUpdate[0] });

            const io = req.app.get('io');
            if (io) {
                console.log('📤 Emitting receipt upload events for order:', orderId);
                console.log('📤 Order status:', order.status, 'Payment status: pending_verification');

                // Emit payment-updated events
                io.to(`order-${orderId}`).emit('payment-updated', { orderId, paymentStatus: 'pending_verification', timestamp: new Date() });
                io.to('staff-room').emit('payment-updated', { orderId, paymentStatus: 'pending_verification', timestamp: new Date() });
                io.to('admin-room').emit('payment-updated', { orderId, paymentStatus: 'pending_verification', timestamp: new Date() });
                io.emit('payment-updated', { orderId, paymentStatus: 'pending_verification', timestamp: new Date() });

                // Emit order-updated events to trigger frontend refresh
                const orderUpdateData = {
                    orderId,
                    status: order.status, // Keep the current order status
                    paymentStatus: 'pending_verification',
                    timestamp: new Date()
                };

                console.log('📤 Emitting order-updated events:', orderUpdateData);

                // Emit with a small delay to ensure database update is committed
                setTimeout(() => {
                    io.to(`order-${orderId}`).emit('order-updated', orderUpdateData);
                    io.to('staff-room').emit('order-updated', orderUpdateData);
                    io.to('admin-room').emit('order-updated', orderUpdateData);
                    io.emit('order-updated', orderUpdateData);

                    // Emit again after a longer delay as a fallback
                    setTimeout(() => {
                        io.to(`order-${orderId}`).emit('order-updated', orderUpdateData);
                        io.to('staff-room').emit('order-updated', orderUpdateData);
                        io.to('admin-room').emit('order-updated', orderUpdateData);
                        io.emit('order-updated', orderUpdateData);
                        console.log('📤 Fallback events emitted');
                    }, 1000);

                    console.log('📤 All events emitted successfully');
                }, 100);
            } else {
                console.log('❌ Socket.IO not available');
            }

            try {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS activity_logs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NULL,
                        user_type VARCHAR(32) NULL,
                        action VARCHAR(128) NOT NULL,
                        details TEXT NULL,
                        ip_address VARCHAR(64) NULL,
                        user_agent VARCHAR(255) NULL,
                        created_at DATETIME NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                `);
                await db.query(`
                    INSERT INTO activity_logs (user_id, user_type, action, details, ip_address, user_agent, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `, [
                    order.customer_id || null,
                    'customer',
                    'receipt_uploaded',
                    JSON.stringify({ order_id: orderId, receipt_filename: receiptFile.filename, payment_method: order.payment_method }),
                    req.ip || 'unknown',
                    req.get('User-Agent') || 'unknown'
                ]);
            } catch (logErr) {
                console.warn('activity_logs write skipped:', logErr && logErr.message);
            }

            res.json({ success: true, message: 'Receipt uploaded successfully. Payment verification is pending.', orderId, receiptPath });
        } catch (error) {
            console.error('Receipt upload error:', error);
            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            res.status(500).json({ success: false, message: error.message || 'Failed to upload receipt. Please try again.' });
        }
    });
});

// Get receipt for admin verification
router.get('/receipt/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;

        const [orderRows] = await db.query(
            'SELECT receipt_path, payment_status FROM orders WHERE order_id = ?', [orderId]
        );

        if (orderRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orderRows[0];

        if (!order.receipt_path) {
            return res.status(404).json({
                success: false,
                message: 'No receipt found for this order'
            });
        }

        // Serve the receipt image
        const receiptPath = path.join(__dirname, '..', order.receipt_path);

        if (!fs.existsSync(receiptPath)) {
            return res.status(404).json({
                success: false,
                message: 'Receipt file not found'
            });
        }

        res.sendFile(receiptPath);

    } catch (error) {
        console.error('Get receipt error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve receipt'
        });
    }
});

module.exports = router;