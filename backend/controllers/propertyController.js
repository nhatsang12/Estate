const Property = require('../models/Property');
const User = require('../models/User');
const APIFeatures = require('../utils/apiFeatures');
const Joi = require('joi');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { queuePropertyEmbeddingRefresh } = require('../services/propertyEmbeddingService');

const markSoldSchema = Joi.object({
  soldAt: Joi.date().iso().optional(),
}).options({ stripUnknown: true });

const propertyVisibilitySchema = Joi.object({
  hidden: Joi.boolean().required(),
}).options({ stripUnknown: true });

const normalizeSaleFlags = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return;

  const status = String(payload.status || '').trim().toLowerCase();
  if (status === 'sold') {
    payload.isSold = true;
    if (!payload.soldAt) {
      payload.soldAt = new Date();
    }
    return;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isSold') && !payload.isSold) {
    payload.soldAt = null;
    if (payload.status === 'sold') {
      payload.status = 'approved';
    }
  }
};

const normalizeForKeyword = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const propertyToSearchText = (property = {}) =>
  normalizeForKeyword(
    [
      property.title,
      property.address,
      property.description,
      property.type,
      ...(Array.isArray(property.amenities) ? property.amenities : []),
    ]
      .filter(Boolean)
      .join(' ')
  );

const matchesKeyword = (property, normalizedKeyword, keywordTokens) => {
  if (!normalizedKeyword) return true;
  const haystack = propertyToSearchText(property);
  if (!haystack) return false;
  if (haystack.includes(normalizedKeyword)) return true;
  return keywordTokens.every((token) => haystack.includes(token));
};

exports.getAllProperties = async (req, res, next) => {
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
    const keyword = String(queryParams.search || queryParams.locationText || '').trim();

    delete queryParams.search;
    delete queryParams.locationText;

    const limit = parseInt(queryParams.limit, 10) || 10;
    const page = parseInt(queryParams.page, 10) || 1;

    if (keyword) {
      const normalizedKeyword = normalizeForKeyword(keyword);
      const keywordTokens = normalizedKeyword.split(' ').filter(Boolean);

      const features = new APIFeatures(Property.find(filter), queryParams)
        .filter()
        .sort()
        .limitFields();
      const candidates = await features.query;
      const matchedProperties = candidates.filter((property) =>
        matchesKeyword(property, normalizedKeyword, keywordTokens)
      );
      const total = matchedProperties.length;
      const startIndex = Math.max(0, (page - 1) * limit);
      const paginatedProperties = matchedProperties.slice(startIndex, startIndex + limit);

      return res.status(200).json({
        status: 'success',
        results: paginatedProperties.length,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        currentPage: page,
        data: {
          properties: paginatedProperties,
        },
      });
    }

    // ✅ Đếm tổng TRƯỚC khi paginate — dùng cùng filter
    const countFeatures = new APIFeatures(Property.find(filter), queryParams).filter();
    const total = await countFeatures.query.countDocuments();

    const features = new APIFeatures(Property.find(filter), queryParams)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const properties = await features.query;

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

    normalizeSaleFlags(req.body);

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

    // Fire-and-forget embedding refresh so new listings become searchable in vector retrieval.
    queuePropertyEmbeddingRefresh(newProperty._id);

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

    normalizeSaleFlags(req.body);

    const property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!property) {
      return res.status(404).json({ status: 'error', message: 'No property found with that ID' });
    }

    // Refresh embedding after edits to keep semantic search in sync with latest content.
    queuePropertyEmbeddingRefresh(property._id);

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

// PATCH /api/properties/:id/mark-sold
exports.markPropertyAsSold = async (req, res, next) => {
  try {
    const { value, error } = markSoldSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'No property found with that ID',
      });
    }

    if (property.status !== 'sold' || !property.isSold) {
      property.status = 'sold';
      property.isSold = true;
      property.soldAt = value.soldAt ? new Date(value.soldAt) : new Date();
      property.rejectionReason = '';
      await property.save({ validateBeforeSave: false });
    }

    res.status(200).json({
      status: 'success',
      message: 'Property has been marked as sold',
      data: {
        property,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/properties/:id/visibility
exports.setPropertyVisibility = async (req, res, next) => {
  try {
    const { value, error } = propertyVisibilitySchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'No property found with that ID',
      });
    }

    if (property.status === 'sold' || property.isSold) {
      return res.status(400).json({
        status: 'error',
        message: 'Sold property cannot change visibility',
      });
    }

    if (value.hidden) {
      if (property.status !== 'approved' && property.status !== 'hidden') {
        return res.status(400).json({
          status: 'error',
          message: 'Only approved property can be hidden',
        });
      }
      property.status = 'hidden';
    } else {
      if (property.status !== 'hidden' && property.status !== 'approved') {
        return res.status(400).json({
          status: 'error',
          message: 'Only hidden property can be shown again',
        });
      }
      property.status = 'approved';
    }

    await property.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: value.hidden ? 'Property has been hidden' : 'Property is visible again',
      data: {
        property,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/properties/sales/stats/me
exports.getMySalesStats = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const soldQuery = {
      ownerId,
      $or: [{ isSold: true }, { status: 'sold' }, { soldAt: { $ne: null } }],
    };

    const [summaryRows, recentSold] = await Promise.all([
      Property.aggregate([
        { $match: soldQuery },
        {
          $group: {
            _id: '$ownerId',
            totalSoldProperties: { $sum: 1 },
            totalSoldValue: { $sum: '$price' },
            latestSoldAt: { $max: '$soldAt' },
          },
        },
      ]),
      Property.find(soldQuery)
        .sort({ soldAt: -1, updatedAt: -1 })
        .limit(8)
        .select('_id title price soldAt status isSold address'),
    ]);

    const summary = summaryRows[0] || {};

    res.status(200).json({
      status: 'success',
      data: {
        totalSoldProperties: Number(summary.totalSoldProperties || 0),
        totalSoldValue: Number(summary.totalSoldValue || 0),
        latestSoldAt: summary.latestSoldAt || null,
        recentSold,
      },
    });
  } catch (err) {
    next(err);
  }
};
