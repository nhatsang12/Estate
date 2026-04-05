const DEFAULT_ORIGIN = 'http://localhost:3000';

const getAllowedOrigins = () => {
  const raw = String(process.env.CLIENT_URL || DEFAULT_ORIGIN);
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
};

module.exports = {
  getAllowedOrigins,
  isOriginAllowed,
};
