const pool = require('../config/db');

// Submit new feedback
const submitFeedback = async(req, res) => {
    const { customer_name, rating, comment, category } = req.body;
    if (!customer_name || !rating) {
        return res.status(400).json({ message: 'Customer name and rating are required.' });
    }
    try {
        const [result] = await pool.query(
            'INSERT INTO feedback (customer_name, rating, comment, category) VALUES (?, ?, ?, ?)', [customer_name, rating, comment, category]
        );

        // Emit real-time update for feedback submission
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('feedback-updated', {
                type: 'feedback_submitted',
                feedbackId: result.insertId,
                customer_name,
                rating,
                category,
                timestamp: new Date()
            });
            io.emit('feedback-updated', {
                type: 'feedback_submitted',
                feedbackId: result.insertId,
                customer_name,
                rating,
                category,
                timestamp: new Date()
            });
        }

        res.status(201).json({ message: 'Feedback submitted successfully', feedbackId: result.insertId });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all feedback
const getAllFeedback = async(req, res) => {
    try {
        const [feedback] = await pool.query('SELECT * FROM feedback ORDER BY feedback_time DESC');
        res.status(200).json(feedback);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get feedback metrics (average rating, total reviews, satisfied customers)
const getFeedbackMetrics = async(req, res) => {
    try {
        // Total reviews
        const [totalReviewsResult] = await pool.query('SELECT COUNT(*) AS totalReviews FROM feedback');
        const totalReviews = totalReviewsResult[0].totalReviews || 0;

        // Average rating
        const [averageRatingResult] = await pool.query('SELECT AVG(rating) AS averageRating FROM feedback');
        const averageRating = parseFloat(averageRatingResult[0].averageRating || 0).toFixed(1);

        // Satisfied customers (e.g., 4 or 5 stars)
        const [satisfiedCustomersResult] = await pool.query('SELECT COUNT(*) AS satisfiedCustomers FROM feedback WHERE rating >= 4');
        const satisfiedCustomers = totalReviews > 0 ? ((satisfiedCustomersResult[0].satisfiedCustomers || 0) / totalReviews * 100).toFixed(0) : 0;

        // Rating distribution
        const [ratingDistributionResult] = await pool.query(`
            SELECT 
                rating,
                COUNT(*) as count
            FROM feedback 
            GROUP BY rating 
            ORDER BY rating DESC
        `);

        const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratingDistributionResult.forEach(row => {
            ratingDistribution[row.rating] = row.count;
        });

        res.status(200).json({
            totalReviews,
            averageRating,
            satisfiedCustomers: `${satisfiedCustomers}%`,
            ratingDistribution
        });
    } catch (error) {
        console.error('Error fetching feedback metrics:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete feedback by id (admin only)
const deleteFeedback = async(req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM feedback WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Emit real-time update for feedback deletion
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('feedback-updated', {
                type: 'feedback_deleted',
                feedbackId: id,
                timestamp: new Date()
            });
            io.emit('feedback-updated', {
                type: 'feedback_deleted',
                feedbackId: id,
                timestamp: new Date()
            });
        }

        res.status(200).json({ message: 'Feedback deleted successfully' });
    } catch (error) {
        console.error('Error deleting feedback:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    submitFeedback,
    getAllFeedback,
    getFeedbackMetrics,
    deleteFeedback,
};