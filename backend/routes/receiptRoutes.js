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
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Upload receipt for order verification
router.post('/upload-receipt', upload.single('receipt'), async(req, res) => {
    try {
        const { orderId } = req.body;
        const receiptFile = req.file;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        if (!receiptFile) {
            return res.status(400).json({
                success: false,
                message: 'Receipt file is required'
            });
        }

        // Verify order exists
        const [orderRows] = await db.query(
            'SELECT * FROM orders WHERE order_id = ?', [orderId]
        );

        if (orderRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orderRows[0];

        // Check if order is already verified
        if (order.payment_status === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Order payment is already verified'
            });
        }

        // Update order with receipt information
        const receiptPath = `/uploads/receipts/${receiptFile.filename}`;

        await db.query(
            'UPDATE orders SET receipt_path = ?, payment_status = "pending_verification", updated_at = NOW() WHERE order_id = ?', [receiptPath, orderId]
        );

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            // Emit to specific order room
            io.to(`order-${orderId}`).emit('payment-updated', {
                orderId,
                paymentStatus: 'pending_verification',
                timestamp: new Date()
            });
            // Emit to staff and admin rooms
            io.to('staff-room').emit('payment-updated', {
                orderId,
                paymentStatus: 'pending_verification',
                timestamp: new Date()
            });
            io.to('admin-room').emit('payment-updated', {
                orderId,
                paymentStatus: 'pending_verification',
                timestamp: new Date()
            });
            // Broadcast to all customers
            io.emit('payment-updated', {
                orderId,
                paymentStatus: 'pending_verification',
                timestamp: new Date()
            });
        }

        // Log the receipt upload activity
        await db.query(`
      INSERT INTO activity_logs (user_id, user_type, action, details, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
            order.customer_id || null,
            'customer',
            'receipt_uploaded',
            JSON.stringify({
                order_id: orderId,
                receipt_filename: receiptFile.filename,
                payment_method: order.payment_method
            }),
            req.ip || 'unknown',
            req.get('User-Agent') || 'unknown'
        ]);

        res.json({
            success: true,
            message: 'Receipt uploaded successfully. Payment verification is pending.',
            orderId: orderId,
            receiptPath: receiptPath
        });

    } catch (error) {
        console.error('Receipt upload error:', error);

        // Clean up uploaded file if there was an error
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Failed to upload receipt. Please try again.'
        });
    }
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