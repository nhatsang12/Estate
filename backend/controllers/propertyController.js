const Property = require('../models/Property');
const User = require('../models/User');
const APIFeatures = require('../utils/apiFeatures');
const { uploadToCloudinary } = require('../utils/cloudinary');

exports.getAllProperties = async (req, res, next) => {
   console.log('>>> getAllProperties v2 - có total'); 
  try {
    let filter = {};

    const role = req.user ? req.user.role : 'public';

    if (role === 'admin') {
      // Admin sees everything
    } else if (role === 'provider') {
      if (req.query.ownerId && req.query.ownerId.toString() === req.user.id.toString()) {
        filter.ownerId = req.query.ownerId;
      } else {
        filter.status = 'approved';
      }
    } else {
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
    // ✅ Đếm tổng TRƯỚC khi paginate — dùng cùng filter
    const countFeatures = new APIFeatures(Property.find(filter), queryParams).filter();
    const total = await countFeatures.query.countDocuments();

    const features = new APIFeatures(Property.find(filter), queryParams)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const properties = await features.query;

    const limit = parseInt(queryParams.limit) || 10;
    const page  = parseInt(queryParams.page)  || 1;

    res.status(200).json({
      status: 'success',
      results: properties.length,        // số item trang hiện tại
      total,                             // ✅ tổng thực sự (vd: 10)
      totalPages: Math.ceil(total / limit), // ✅ tổng số trang (vd: 2)
      currentPage: page,
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

    const role = req.user ? req.user.role : 'public';
    const isOwner = req.user && property.ownerId._id.toString() === req.user.id;

    if (property.status !== 'approved' && role !== 'admin' && !isOwner) {
      return res.status(404).json({ status: 'error', message: 'Property is not available.' });
    }

    res.status(200).json({
      status: 'success',
      data: { property },
    });
  } catch (err) {
    next(err);
  }
};

exports.createProperty = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      req.body.ownerId = req.user.id;
    }

    if (req.user.role !== 'admin') {
      const owner = await User.findById(req.user.id);
      if (!owner) {
        return res.status(404).json({
          status: 'error',
          message: 'Owner account not found',
        });
      }
      if (owner && typeof owner.ensureSubscriptionValidity === 'function') {
        await owner.ensureSubscriptionValidity();
      }
      const effectivePlan = owner?.getEffectiveSubscriptionPlan?.() || owner?.subscriptionPlan || 'Free';
      if (!owner.canCreateListing()) {
        return res.status(403).json({
          status: 'error',
          message: `Listing quota reached. Your "${effectivePlan}" plan allows ${owner.getListingLimit()} listings. Please upgrade your plan.`,
        });
      }
    }

    if (req.user.role === 'admin' && req.body.status) {
      // Admin can set status
    } else {
      req.body.status = 'pending';
    }

    if (req.files && req.files.images) {
      const imagePromises = req.files.images.map(file => uploadToCloudinary(file.buffer));
      const imageUrls = await Promise.all(imagePromises);
      req.body.images = imageUrls;
    }

    if (req.files && req.files.ownershipDocuments) {
      const docPromises = req.files.ownershipDocuments.map(file => uploadToCloudinary(file.buffer));
      const docUrls = await Promise.all(docPromises);
      req.body.ownershipDocuments = docUrls;
    }

    const newProperty = await Property.create(req.body);

    if (req.user.role !== 'admin') {
      await User.findByIdAndUpdate(req.user.id, { $inc: { listingsCount: 1 } });
    }

    res.status(201).json({
      status: 'success',
      data: { property: newProperty },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProperty = async (req, res, next) => {
  try {
    let existingImages = null;
    if (req.body.existingImages !== undefined) {
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

    let newImageUrls = [];
    if (req.files && req.files.images) {
      const imagePromises = req.files.images.map(file => uploadToCloudinary(file.buffer));
      newImageUrls = await Promise.all(imagePromises);
    }

    if (existingImages !== null || newImageUrls.length > 0) {
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
      data: { property },
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
    return res.status(400).json({ message: 'Please provide latitude and longitude in the format lat,lng.' });
  }

  const properties = await Property.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
    status: 'approved',
  });

  res.status(200).json({
    status: 'success',
    results: properties.length,
    data: { properties },
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
      status: 'approved',
      price: {
        $gte: currentProperty.price * 0.7,
        $lte: currentProperty.price * 1.3,
      },
    }).limit(3);

    res.status(200).json({
      status: 'success',
      data: { recommendations },
    });
  } catch (err) {
    next(err);
  }
};

exports.getFilterOptions = async (req, res, next) => {
  try {
    const filters = {
      types: [
        { value: 'apartment', label: 'Căn hộ' },
        { value: 'villa', label: 'Biệt thự' },
        { value: 'house', label: 'Nhà phố' },
        { value: 'studio', label: 'Studio' },
        { value: 'office', label: 'Văn phòng' },
      ],
      tabs: ['Cho Thuê', 'Mua Bán', 'Dự Án Mới', 'Thương Mại'],
      bedrooms: ['1', '2', '3', '4', '5+'],
      bathrooms: ['1', '2', '3', '4', '5+']
    };

    res.status(200).json({
      status: 'success',
      data: { filters }
    });
  } catch (err) {
    next(err);
  }
};
