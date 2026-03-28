const Joi = require('joi');
const mongoose = require('mongoose');
const Favorite = require('../models/Favorite');
const Property = require('../models/Property');

const addFavoriteSchema = Joi.object({
  propertyId: Joi.string().trim().required(),
}).options({ stripUnknown: true });

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
};

const serializeFavorite = (favorite) => ({
  _id: favorite._id,
  userId: favorite.userId,
  property:
    typeof favorite.propertyId === 'object' && favorite.propertyId
      ? favorite.propertyId
      : null,
  propertyId:
    typeof favorite.propertyId === 'object' && favorite.propertyId
      ? favorite.propertyId._id
      : favorite.propertyId,
  createdAt: favorite.createdAt,
  updatedAt: favorite.updatedAt,
});

const canAccessPropertyForFavorite = (property, user) => {
  if (!property || !user) return false;
  if (property.status === 'approved') return true;
  if (user.role === 'admin') return true;
  return String(property.ownerId) === String(user.id);
};

// GET /api/favorites
exports.getMyFavorites = async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const skip = (page - 1) * limit;

    const [total, favorites] = await Promise.all([
      Favorite.countDocuments({ userId: req.user.id }),
      Favorite.find({ userId: req.user.id })
        .populate({
          path: 'propertyId',
          populate: [
            { path: 'ownerId', select: 'name email phone avatar' },
            { path: 'agentId', select: 'name email phone avatar' },
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const validFavorites = favorites.filter(
      (item) => item.propertyId && typeof item.propertyId === 'object'
    );

    res.status(200).json({
      status: 'success',
      results: validFavorites.length,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
      data: {
        favorites: validFavorites.map(serializeFavorite),
        propertyIds: validFavorites.map((item) => String(item.propertyId._id)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/favorites
exports.addFavorite = async (req, res, next) => {
  try {
    const { value, error } = addFavoriteSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(value.propertyId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid propertyId',
      });
    }

    const property = await Property.findById(value.propertyId);
    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found',
      });
    }

    if (!canAccessPropertyForFavorite(property, req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Property is not available for favorite',
      });
    }

    let favorite = await Favorite.findOne({
      userId: req.user.id,
      propertyId: value.propertyId,
    });

    if (!favorite) {
      favorite = await Favorite.create({
        userId: req.user.id,
        propertyId: value.propertyId,
      });
    }

    await favorite.populate({
      path: 'propertyId',
      populate: [
        { path: 'ownerId', select: 'name email phone avatar' },
        { path: 'agentId', select: 'name email phone avatar' },
      ],
    });

    return res.status(201).json({
      status: 'success',
      data: {
        favorite: serializeFavorite(favorite),
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      const existing = await Favorite.findOne({
        userId: req.user.id,
        propertyId: req.body?.propertyId,
      }).populate('propertyId');
      if (existing) {
        return res.status(200).json({
          status: 'success',
          data: {
            favorite: serializeFavorite(existing),
          },
        });
      }
    }
    next(err);
  }
};

// DELETE /api/favorites/:id
exports.removeFavorite = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid favorite id',
      });
    }

    const favorite = await Favorite.findOneAndDelete({
      userId: req.user.id,
      $or: [{ _id: id }, { propertyId: id }],
    });

    if (!favorite) {
      return res.status(404).json({
        status: 'error',
        message: 'Favorite not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        removedId: favorite._id,
        propertyId: favorite.propertyId,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/favorites/property/:propertyId/status
exports.getFavoriteStatus = async (req, res, next) => {
  try {
    const propertyId = String(req.params.propertyId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid propertyId',
      });
    }

    const favorite = await Favorite.findOne({
      userId: req.user.id,
      propertyId,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        isFavorite: Boolean(favorite),
        favoriteId: favorite?._id || null,
        propertyId,
      },
    });
  } catch (err) {
    next(err);
  }
};
