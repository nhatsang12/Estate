const parseJsonValue = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : value;
};

const normalizePropertyPayload = (req, res, next) => {
  if (!req.body) return next();

  if (typeof req.body.location === 'string') {
    const parsedLocation = parseJsonValue(req.body.location);
    if (parsedLocation) {
      req.body.location = parsedLocation;
    }
  }

  const coord0 = req.body['location[coordinates][0]'];
  const coord1 = req.body['location[coordinates][1]'];
  const locationType = req.body['location[type]'];
  if (
    (!req.body.location || typeof req.body.location !== 'object') &&
    (coord0 !== undefined || coord1 !== undefined)
  ) {
    req.body.location = {
      type: locationType || 'Point',
      coordinates: [coord0, coord1],
    };
  }

  if (req.body.location && Array.isArray(req.body.location.coordinates)) {
    req.body.location.coordinates = req.body.location.coordinates.map((value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : value;
    });
  }

  Object.keys(req.body).forEach((key) => {
    if (key.startsWith('location[') || key.startsWith('location.')) {
      delete req.body[key];
    }
  });

  if (typeof req.body.amenities === 'string') {
    const parsedAmenities = parseJsonValue(req.body.amenities);
    if (Array.isArray(parsedAmenities)) {
      req.body.amenities = parsedAmenities;
    } else if (typeof parsedAmenities === 'string') {
      const trimmed = parsedAmenities.trim();
      if (!trimmed) {
        req.body.amenities = [];
      } else if (trimmed.includes(',')) {
        req.body.amenities = trimmed
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      } else {
        req.body.amenities = [trimmed];
      }
    }
  }

  if (typeof req.body.furnished === 'string') {
    req.body.furnished = req.body.furnished === 'true';
  }

  ['price', 'bedrooms', 'bathrooms', 'area', 'yearBuilt'].forEach((field) => {
    if (req.body[field] !== undefined) {
      const normalized = normalizeNumber(req.body[field]);
      if (normalized === undefined) {
        delete req.body[field];
      } else {
        req.body[field] = normalized;
      }
    }
  });

  delete req.body['location[coordinates][0]'];
  delete req.body['location[coordinates][1]'];
  delete req.body['location[type]'];

  return next();
};

module.exports = normalizePropertyPayload;
