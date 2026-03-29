const fs = require('fs');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { execFileSync } = require('child_process');
const connectDB = require('../config/db');
const User = require('../models/User');
const Property = require('../models/Property');

dotenv.config({ override: process.env.NODE_ENV !== 'production' });

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SOURCE_IMAGE_DIR = path.join(ROOT_DIR, 'images');
const TEMP_IMAGE_DIR = path.join(os.tmpdir(), 'estate-seed-compressed');
const CLOUDINARY_MAX_IMAGE_BYTES = 10 * 1024 * 1024;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CITY_CONFIG = [
  {
    city: 'Hà Nội',
    district: ['Ba Đình', 'Cầu Giấy', 'Tây Hồ', 'Thanh Xuân', 'Hoàn Kiếm'],
    ward: ['Phường Kim Mã', 'Phường Dịch Vọng', 'Phường Quảng An', 'Phường Nhân Chính', 'Phường Hàng Bạc'],
    streets: ['Đào Tấn', 'Trần Duy Hưng', 'Xuân Diệu', 'Lê Văn Lương', 'Tràng Tiền'],
    center: { lng: 105.83416, lat: 21.02776 },
  },
  {
    city: 'Hồ Chí Minh',
    district: ['Quận 1', 'Quận 3', 'Quận 7', 'Thủ Đức', 'Bình Thạnh'],
    ward: ['Phường Bến Nghé', 'Phường Võ Thị Sáu', 'Phường Tân Phú', 'Phường An Phú', 'Phường 22'],
    streets: ['Nguyễn Huệ', 'Điện Biên Phủ', 'Nguyễn Lương Bằng', 'Xa lộ Hà Nội', 'Xô Viết Nghệ Tĩnh'],
    center: { lng: 106.62965, lat: 10.8231 },
  },
  {
    city: 'Đà Nẵng',
    district: ['Hải Châu', 'Sơn Trà', 'Ngũ Hành Sơn', 'Thanh Khê', 'Liên Chiểu'],
    ward: ['Phường Thạch Thang', 'Phường An Hải Bắc', 'Phường Mỹ An', 'Phường Thanh Khê Tây', 'Phường Hòa Minh'],
    streets: ['Bạch Đằng', 'Võ Nguyên Giáp', 'Ngũ Hành Sơn', 'Hàm Nghi', 'Nguyễn Tất Thành'],
    center: { lng: 108.20217, lat: 16.05441 },
  },
];

const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'studio', 'office'];

const AMENITY_POOL = [
  'Hồ bơi',
  'Phòng gym',
  'WiFi',
  'Điều hoà',
  'Bãi đỗ xe',
  'Ban công',
  'Bảo vệ 24/7',
];

const TITLE_PREFIX = {
  apartment: 'Căn hộ cao cấp',
  house: 'Nhà phố hiện đại',
  villa: 'Biệt thự sang trọng',
  studio: 'Studio tiện nghi',
  office: 'Văn phòng thương mại',
};

const LIFESTYLE_TEXT = [
  'Không gian sống rộng rãi, đón nắng tự nhiên và thông gió tốt.',
  'Thiết kế hiện đại với nội thất cao cấp, tối ưu công năng sử dụng.',
  'Khu dân cư an ninh, gần trung tâm thương mại, bệnh viện và trường học quốc tế.',
  'Phù hợp để an cư lâu dài hoặc đầu tư gia tăng giá trị với tiềm năng tăng giá ổn định.',
  'Hệ thống tiện ích nội khu đầy đủ, đáp ứng tiêu chuẩn sống cao cấp.',
];

const randomFrom = (items, index) => items[index % items.length];

const formatAddress = (cityConfig, index) => {
  const district = randomFrom(cityConfig.district, index);
  const ward = randomFrom(cityConfig.ward, index + 1);
  const street = randomFrom(cityConfig.streets, index + 2);
  const streetNo = 10 + (index % 180);
  return `${streetNo} ${street}, ${ward}, ${district}, ${cityConfig.city}, Việt Nam`;
};

const createCoordinates = (center, index) => {
  const lngOffset = ((index % 15) - 7) * 0.0032;
  const latOffset = ((index % 11) - 5) * 0.0028;
  return [Number((center.lng + lngOffset).toFixed(6)), Number((center.lat + latOffset).toFixed(6))];
};

const pickAmenities = (index) => {
  const count = 3 + (index % 3);
  const amenities = [];
  for (let i = 0; i < count; i += 1) {
    const amenity = AMENITY_POOL[(index + i * 2) % AMENITY_POOL.length];
    if (!amenities.includes(amenity)) amenities.push(amenity);
  }
  return amenities;
};

const createPropertyDescription = ({ city, district, type, bedrooms, bathrooms, area, price }, index) => {
  const line1 = `${TITLE_PREFIX[type]} tọa lạc tại ${district}, ${city}, diện tích ${area}m², gồm ${bedrooms} phòng ngủ và ${bathrooms} phòng tắm.`;
  const line2 = LIFESTYLE_TEXT[index % LIFESTYLE_TEXT.length];
  const line3 = `Mức giá chào bán ${price.toLocaleString('vi-VN')} VND, pháp lý rõ ràng và sẵn sàng giao dịch nhanh.`;
  const line4 = 'Tài sản phù hợp cho khách hàng tìm kiếm chất lượng sống cao, vị trí kết nối thuận tiện và giá trị đầu tư bền vững.';
  return `${line1}\n${line2}\n${line3}\n${line4}`;
};

const ensureSourceImages = () => {
  if (!fs.existsSync(SOURCE_IMAGE_DIR)) {
    throw new Error(`Cannot find source image folder: ${SOURCE_IMAGE_DIR}`);
  }

  for (let i = 0; i < 600; i += 1) {
    const fileName = `img_${i}.jpg`;
    const fromPath = path.join(SOURCE_IMAGE_DIR, fileName);
    if (!fs.existsSync(fromPath)) {
      throw new Error(`Missing source image: ${fromPath}`);
    }
  }
};

const quoteForPowerShell = (value) => `'${String(value).replace(/'/g, "''")}'`;

const compressJpegOnWindows = (inputPath, outputPath, quality) => {
  const psScript = [
    'Add-Type -AssemblyName System.Drawing',
    `$inputPath=${quoteForPowerShell(inputPath)}`,
    `$outputPath=${quoteForPowerShell(outputPath)}`,
    '$img=[System.Drawing.Image]::FromFile($inputPath)',
    "$codec=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }",
    '$enc=[System.Drawing.Imaging.Encoder]::Quality',
    '$ep=New-Object System.Drawing.Imaging.EncoderParameters(1)',
    `$ep.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter($enc,[long]${Number(quality)})`,
    '$img.Save($outputPath,$codec,$ep)',
    '$img.Dispose()',
  ].join('; ');

  execFileSync('powershell', ['-NoProfile', '-Command', psScript], {
    stdio: 'ignore',
  });
};

const getUploadReadyImagePath = (sourcePath, index) => {
  const sourceSize = fs.statSync(sourcePath).size;
  if (sourceSize <= CLOUDINARY_MAX_IMAGE_BYTES) {
    return { uploadPath: sourcePath, tempPath: null };
  }

  if (process.platform !== 'win32') {
    throw new Error(
      `Image ${path.basename(sourcePath)} exceeds 10MB and auto-compress currently supports Windows only.`
    );
  }

  if (!fs.existsSync(TEMP_IMAGE_DIR)) {
    fs.mkdirSync(TEMP_IMAGE_DIR, { recursive: true });
  }

  const qualities = [65, 55, 50, 45, 40, 35];
  let lastCandidate = null;

  for (const quality of qualities) {
    const candidatePath = path.join(TEMP_IMAGE_DIR, `img_${index}_q${quality}.jpg`);
    compressJpegOnWindows(sourcePath, candidatePath, quality);
    lastCandidate = candidatePath;

    const candidateSize = fs.statSync(candidatePath).size;
    if (candidateSize <= CLOUDINARY_MAX_IMAGE_BYTES) {
      return { uploadPath: candidatePath, tempPath: candidatePath };
    }
  }

  throw new Error(
    `Failed to compress ${path.basename(sourcePath)} below 10MB. Last output: ${lastCandidate || 'N/A'}`
  );
};

const uploadImageToCloudinary = async (filePath, index) => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'real-estate-seed',
    public_id: `img_${index}`,
    overwrite: true,
    unique_filename: false,
    resource_type: 'image',
  });
  return result.secure_url;
};

const uploadSeedImagesToCloudinary = async () => {
  ensureSourceImages();
  const uploadedUrls = [];
  const concurrency = 5;
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= 600) return;

      const filePath = path.join(SOURCE_IMAGE_DIR, `img_${index}.jpg`);
      const { uploadPath, tempPath } = getUploadReadyImagePath(filePath, index);
      try {
        const url = await uploadImageToCloudinary(uploadPath, index);
        uploadedUrls[index] = url;
      } finally {
        if (tempPath && fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }

      if ((index + 1) % 50 === 0 || index === 599) {
        console.log(`Uploaded ${index + 1}/600 images to Cloudinary...`);
      }
    }
  };

  const workers = [];
  for (let i = 0; i < concurrency; i += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);

  if (uploadedUrls.length !== 600 || uploadedUrls.some((item) => !item)) {
    throw new Error('Cloudinary upload did not return 600 valid URLs.');
  }

  return uploadedUrls;
};

const createUsers = async (cloudinaryImageUrls) => {
  const now = new Date();
  const monthLater = new Date(now);
  monthLater.setMonth(monthLater.getMonth() + 1);

  const userDocs = await User.create([
    {
      name: 'Nguyen Van User 01',
      email: 'user01@estate.com',
      password: 'User@123456',
      role: 'user',
      address: 'Quận 1, Hồ Chí Minh',
      phone: '0901000001',
    },
    {
      name: 'Le Thi User 02',
      email: 'user02@estate.com',
      password: 'User@123456',
      role: 'user',
      address: 'Cầu Giấy, Hà Nội',
      phone: '0901000002',
    },
    {
      name: 'Tran Van User 03',
      email: 'user03@estate.com',
      password: 'User@123456',
      role: 'user',
      address: 'Hải Châu, Đà Nẵng',
      phone: '0901000003',
    },
    {
      name: 'Provider Free',
      email: 'provider.free@estate.com',
      password: 'Provider@123456',
      role: 'provider',
      address: 'Quận 3, Hồ Chí Minh',
      phone: '0912000001',
      isVerified: true,
      kycStatus: 'verified',
      kycDocuments: [cloudinaryImageUrls[0], cloudinaryImageUrls[1]],
      subscriptionPlan: 'Free',
    },
    {
      name: 'Provider Pro',
      email: 'provider.pro@estate.com',
      password: 'Provider@123456',
      role: 'provider',
      address: 'Ba Đình, Hà Nội',
      phone: '0912000002',
      isVerified: true,
      kycStatus: 'verified',
      kycDocuments: [cloudinaryImageUrls[2], cloudinaryImageUrls[3]],
      subscriptionPlan: 'Pro',
      subscriptionStartedAt: now,
      subscriptionExpiresAt: monthLater,
    },
    {
      name: 'Provider ProPlus',
      email: 'provider.proplus@estate.com',
      password: 'Provider@123456',
      role: 'provider',
      address: 'Sơn Trà, Đà Nẵng',
      phone: '0912000003',
      isVerified: true,
      kycStatus: 'verified',
      kycDocuments: [cloudinaryImageUrls[4], cloudinaryImageUrls[5]],
      subscriptionPlan: 'ProPlus',
      subscriptionStartedAt: now,
      subscriptionExpiresAt: monthLater,
    },
    {
      name: 'Estate Admin',
      email: 'admin@estate.com',
      password: 'Admin@123456',
      role: 'admin',
      address: 'Hà Nội, Việt Nam',
      phone: '0999000000',
      isVerified: true,
      kycStatus: 'verified',
    },
  ]);

  const providers = userDocs.filter((u) => u.role === 'provider');
  return { userDocs, providers };
};

const createProperties = async (providers, cloudinaryImageUrls) => {
  const minPrice = 10_000_000_000;
  const maxPrice = 150_000_000_000;
  const total = 150;
  const priceStep = (maxPrice - minPrice) / (total - 1);

  const docs = [];
  for (let i = 0; i < total; i += 1) {
    const cityConfig = CITY_CONFIG[i % CITY_CONFIG.length];
    const owner = providers[i % providers.length];
    const type = PROPERTY_TYPES[i % PROPERTY_TYPES.length];
    const price = Math.round(minPrice + priceStep * i);
    const bedrooms = type === 'studio' ? 1 : 2 + (i % 4);
    const bathrooms = 1 + (i % 3);
    const area = 70 + (i % 9) * 25;
    const yearBuilt = 2010 + (i % 15);
    const district = randomFrom(cityConfig.district, i);
    const address = formatAddress(cityConfig, i);
    const images = [
      cloudinaryImageUrls[i * 4],
      cloudinaryImageUrls[i * 4 + 1],
      cloudinaryImageUrls[i * 4 + 2],
      cloudinaryImageUrls[i * 4 + 3],
    ];

    const title = `${TITLE_PREFIX[type]} ${district} #${i + 1}`;
    const description = createPropertyDescription(
      {
        city: cityConfig.city,
        district,
        type,
        bedrooms,
        bathrooms,
        area,
        price,
      },
      i
    );

    docs.push({
      title,
      description,
      price,
      address,
      location: {
        type: 'Point',
        coordinates: createCoordinates(cityConfig.center, i),
      },
      type,
      bedrooms,
      bathrooms,
      area,
      furnished: i % 2 === 0,
      yearBuilt,
      amenities: pickAmenities(i),
      images,
      ownershipDocuments: [],
      ownerId: owner._id,
      status: 'approved',
      rejectionReason: '',
    });
  }

  await Property.insertMany(docs);
};

const updateProviderListingCounts = async (providers) => {
  for (const provider of providers) {
    const count = await Property.countDocuments({ ownerId: provider._id });
    await User.updateOne({ _id: provider._id }, { $set: { listingsCount: count } });
  }
};

const run = async () => {
  await connectDB();

  console.log('Dropping entire database...');
  await mongoose.connection.dropDatabase();

  console.log('Uploading 600 local images to Cloudinary...');
  const cloudinaryImageUrls = await uploadSeedImagesToCloudinary();

  console.log('Creating users/providers/admin...');
  const { providers } = await createUsers(cloudinaryImageUrls);

  console.log('Creating 150 diversified properties...');
  await createProperties(providers, cloudinaryImageUrls);

  console.log('Updating provider listing counts...');
  await updateProviderListingCounts(providers);

  const userCount = await User.countDocuments();
  const propertyCount = await Property.countDocuments();
  const providerCount = await User.countDocuments({ role: 'provider' });

  console.log('Seed completed successfully.');
  console.log(`Users total: ${userCount} (providers: ${providerCount})`);
  console.log(`Properties total: ${propertyCount}`);
};

run()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Reset/seed failed:', error.message);
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      // no-op
    }
    process.exit(1);
  });
