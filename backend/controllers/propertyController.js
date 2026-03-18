const Property = require('../models/Property');
const User = require('../models/User');
const APIFeatures = require('../utils/apiFeatures');
const { uploadToCloudinary } = require('../utils/cloudinary');

exports.getAllProperties = async (req, res, next) => {
  try {
    let filter = {};

    // Permission Logic:
    // 1. Admin: Can see ALL (status is not restricted by default).
    // 2. Provider: Can see ALL 'approved' + THEIR OWN 'pending'/'rejected' (handled via ?ownerId query usually, or we enforce strict view here).
    // 3. Public/User: Can ONLY see 'approved'.

    // Determine Role (req.user might be undefined if public route)
    const role = req.user ? req.user.role : 'public';

    if (role === 'admin') {
        // Admin sees everything, no status filter enforced implicitly.
        // They can filter manually via ?status=pending
    } else if (role === 'provider') {
        // Provider Logic is tricky in a single GET list.
        // Usually, the "My Properties" dashboard uses ?ownerId=ME.
        // The Public Listing page should only show 'approved'.
        
        // If the query specifically requests "my properties" (e.g., ?ownerId=ME), allow all statuses.
        // Otherwise (browsing marketplace), enforce status=approved.
        
        if (req.query.ownerId && req.query.ownerId.toString() === req.user.id.toString()) {
            // Viewing own properties -> No status filter needed (can see pending/rejected)
            filter.ownerId = req.query.ownerId;
        } else {
            // Browsing marketplace -> Approved only
            filter.status = 'approved';
        }
    } else {
        // Public / User -> Approved only
        filter.status = 'approved';
    }

    const queryParams = { ...req.query };
    const keyword = queryParams.search || queryParams.locationText;
    if (keyword) {
      const regex = new RegExp(keyword, 'i');
      filter.$or = [
        { title: regex },
        { address: regex },
        { description: regex },
        { amenities: regex },
        { type: regex },
      ];
    }
    delete queryParams.search;
    delete queryParams.locationText;
    delete queryParams.ownerId; // ownerId already applied to filter above

    // Merge custom permission filter with query params
    // APIFeatures will handle the rest of req.query (like price, sort, etc.)
    // We pass the Model.find(filter) to start with our constraints
    
    const features = new APIFeatures(Property.find(filter), queryParams)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const properties = await features.query;

    res.status(200).json({
      status: 'success',
      results: properties.length,
      data: {
        properties,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
        .populate('ownerId', 'name email phone avatar')
        .populate('agentId', 'name email phone avatar');

    if (!property) {
      return res.status(404).json({ status: 'error', message: 'No property found with that ID' });
    }

    // Permission Check for Detail View
    // Public/User can only see 'approved' property details.
    // Owner/Admin can see pending/rejected.
    const role = req.user ? req.user.role : 'public';
    const isOwner = req.user && property.ownerId._id.toString() === req.user.id;

    if (property.status !== 'approved' && role !== 'admin' && !isOwner) {
         return res.status(404).json({ status: 'error', message: 'Property is not available.' }); // Hide unapproved from public
    }

    res.status(200).json({
      status: 'success',
      data: {
        property,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.createProperty = async (req, res, next) => {
  try {
    // Assign ownerId to current user (Provider)
    if (req.user.role !== 'admin') {
      req.body.ownerId = req.user.id;
    }

    // ─── SUBSCRIPTION QUOTA CHECK (Critical DNA Hook) ────────
    // Before creating a property, check User.listingsCount against
    // the allowed quota of their User.subscriptionPlan
    if (req.user.role !== 'admin') {
      const owner = await User.findById(req.user.id);
      if (!owner.canCreateListing()) {
        return res.status(403).json({
          status: 'error',
          message: `Listing quota reached. Your "${owner.subscriptionPlan}" plan allows ${owner.getListingLimit()} listings. Please upgrade your plan.`,
        });
      }
    }

    // Default status is 'pending' from Schema, but Admin can set to 'approved' directly
    if (req.user.role === 'admin' && req.body.status) {
        // Admin can set status
    } else {
        // Provider -> Pending
        req.body.status = 'pending';
    }

    // Handle Image Upload
    if (req.files && req.files.images) {
        const imagePromises = req.files.images.map(file => uploadToCloudinary(file.buffer));
        const imageUrls = await Promise.all(imagePromises);
        req.body.images = imageUrls;
    }

    // Handle Ownership Documents Upload
    if (req.files && req.files.ownershipDocuments) {
        const docPromises = req.files.ownershipDocuments.map(file => uploadToCloudinary(file.buffer));
        const docUrls = await Promise.all(docPromises);
        req.body.ownershipDocuments = docUrls;
    }

    const newProperty = await Property.create(req.body);

    // ─── INCREMENT LISTINGS COUNT ────────────────────────────
    if (req.user.role !== 'admin') {
      await User.findByIdAndUpdate(req.user.id, { $inc: { listingsCount: 1 } });
    }

    res.status(201).json({
      status: 'success',
      data: {
        property: newProperty,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProperty = async (req, res, next) => {
  try {
    // ── Handle existingImages: URLs the user wants to keep ──
    let existingImages = null;
    if (req.body.existingImages !== undefined) {
      // Parse if it's a JSON string (from FormData)
      if (typeof req.body.existingImages === 'string') {
        try {
          existingImages = JSON.parse(req.body.existingImages);
        } catch {
          existingImages = [];
        }
      } else if (Array.isArray(req.body.existingImages)) {
        existingImages = req.body.existingImages;
      }
      delete req.body.existingImages;
    }

    // Upload new images if provided
    let newImageUrls = [];
    if (req.files && req.files.images) {
        const imagePromises = req.files.images.map(file => uploadToCloudinary(file.buffer));
        newImageUrls = await Promise.all(imagePromises);
    }

    // Build final images array
    if (existingImages !== null || newImageUrls.length > 0) {
      // If existingImages was provided, use it as base; otherwise keep current images
      const keptImages = existingImages !== null ? existingImages : undefined;
      if (keptImages !== undefined) {
        req.body.images = [...keptImages, ...newImageUrls];
      } else if (newImageUrls.length > 0) {
        req.body.$push = { ...(req.body.$push || {}), images: { $each: newImageUrls } };
      }
    }

    if (req.files && req.files.ownershipDocuments) {
        const docPromises = req.files.ownershipDocuments.map(file => uploadToCloudinary(file.buffer));
        const docUrls = await Promise.all(docPromises);
        req.body.$push = { ...(req.body.$push || {}), ownershipDocuments: { $each: docUrls } };
    }

    const property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!property) {
      return res.status(404).json({ status: 'error', message: 'No property found with that ID' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        property,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);

    if (!property) {
      return res.status(404).json({ status: 'error', message: 'No property found with that ID' });
    }

    // Decrement the owner's listingsCount
    await User.findByIdAndUpdate(property.ownerId, { $inc: { listingsCount: -1 } });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

exports.getPropertiesWithin = async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return res.status(400).json({ message: 'Please provide latitutde and longitude in the format lat,lng.' });
  }

  const properties = await Property.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
    status: 'approved' // Geo search should mostly be for public finding homes
  });

  res.status(200).json({
    status: 'success',
    results: properties.length,
    data: {
      properties,
    },
  });
};

exports.getRecommendations = async (req, res, next) => {
  try {
    const propertyId = req.params.id;
    const currentProperty = await Property.findById(propertyId);

    if (!currentProperty) {
      return res.status(404).json({ status: 'error', message: 'Property not found' });
    }

    const recommendations = await Property.find({
      _id: { $ne: propertyId },
      type: currentProperty.type,
      status: 'approved', // Only recommend approved properties
      price: { 
          $gte: currentProperty.price * 0.7, 
          $lte: currentProperty.price * 1.3 
      }
    }).limit(3);

    res.status(200).json({
      status: 'success',
      data: {
        recommendations
      }
    });
  } catch (err) {
    next(err);
  }
};
