const Property = require('../models/Property');

// Check if the user is the owner of the property
exports.verifyOwnership = async (req, res, next) => {
    try {
        // 1. Get Property ID from params
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ status: 'error', message: 'No property found with that ID' });
        }

        // 2. Check if user is admin (Admins can edit anything)
        if (req.user.role === 'admin') {
            return next();
        }

        // 3. Check if user is the owner (Provider)
        // Note: ownerId is an ObjectId, so we compare strings or use .equals()
        if (property.ownerId.toString() !== req.user.id) {
            return res.status(403).json({ 
                status: 'error', 
                message: 'You do not have permission to modify this property. You are not the owner.' 
            });
        }

        // Grant access
        next();
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

// Check if the provider is verified
exports.verifyProviderStatus = (req, res, next) => {
    if (req.user.role === 'provider' && !req.user.isVerified) {
        return res.status(403).json({
            status: 'error',
            message: 'Your provider account is not verified yet. Please wait for admin approval.'
        });
    }
    next();
};
