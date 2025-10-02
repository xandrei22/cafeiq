function ensureAuthenticated(req, res, next) {
    // Check for any type of user authentication
    if (req.session.adminUser || req.session.staffUser || req.session.customerUser) {
        return next();
    }

    // For API routes, return JSON error instead of redirect
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    res.redirect('/login');
}

module.exports = {
    ensureAuthenticated
};