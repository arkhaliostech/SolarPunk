// Middleware to check if user has admin privileges
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Only founder and core_team can access admin features
    const adminRoles = ['founder', 'core_team'];
    
    if (!adminRoles.includes(req.user.role)) {
        return res.status(403).json({ 
            error: 'Admin privileges required',
            requiredRoles: adminRoles,
            yourRole: req.user.role
        });
    }

    next();
}

// Middleware to check if user is founder only
function requireFounder(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'founder') {
        return res.status(403).json({ 
            error: 'Founder privileges required',
            yourRole: req.user.role
        });
    }

    next();
}

// Check role level
function hasRole(userRole, requiredRole) {
    const roleHierarchy = {
        'founder': 4,
        'core_team': 3,
        'contributor': 2,
        'viewer': 1
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

module.exports = {
    requireAdmin,
    requireFounder,
    hasRole
};