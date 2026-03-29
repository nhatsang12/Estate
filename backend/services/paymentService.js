const axios = require('axios');
const CryptoJS = require('crypto-js');

const VNPAY_VERSION = '2.1.0';
const VNPAY_COMMAND = 'pay';
const VNPAY_ORDER_TYPE = 'other';
const VNPAY_LOCALE = process.env.VNPAY_LOCALE || 'vn';

const PLAN_PRICING = {
  Pro: {
    VNPay: Number(process.env.PRICING_PRO_VNPAY_VND || 19990000),
    PayPal: Number(process.env.PRICING_PRO_PAYPAL_USD || 9.99),
  },
  ProPlus: {
    VNPay: Number(process.env.PRICING_PROPLUS_VNPAY_VND || 99990000),
    PayPal: Number(process.env.PRICING_PROPLUS_PAYPAL_USD || 19.99),
  },
};

const isNilOrEmpty = (value) => value === undefined || value === null || value === '';
const isVNPayParam = (key) =>
  String(key).startsWith('vnp_') &&
  key !== 'vnp_SecureHash' &&
  key !== 'vnp_SecureHashType';

const encodeVNPayComponent = (value) =>
  encodeURIComponent(String(value)).replace(/%20/g, '+');

const normalizeVNPayOrderInfo = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const collectVNPayHashParams = (params = {}) =>
  Object.keys(params).reduce((acc, key) => {
    const value = params[key];
    if (!isVNPayParam(key) || isNilOrEmpty(value)) return acc;
    acc[key] = String(value);
    return acc;
  }, {});

// VNPay: sort alphabetically by key before concatenating key=value.
const sortAndEncodeParams = (params = {}) => {
  const filtered = collectVNPayHashParams(params);
  const sorted = {};

  Object.keys(filtered)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .forEach((key) => {
      sorted[key] = encodeVNPayComponent(filtered[key]);
    });

  return sorted;
};

const buildQueryString = (params) =>
  Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&');

const normalizeVNPayStatusCode = (value) => String(value ?? '').trim();
const isVNPaySuccessCode = (value) => {
  const normalized = normalizeVNPayStatusCode(value);
  return normalized === '00' || normalized === '0';
};

const buildVNPayHashContext = (params = {}) => {
  const filteredParams = collectVNPayHashParams(params);
  const sortedParams = sortAndEncodeParams(filteredParams);
  const signData = buildQueryString(sortedParams);

  return {
    filteredParams,
    sortedParams,
    signData,
  };
};

const createSecureHash = (signData, hashSecret) =>
  CryptoJS.HmacSHA512(signData, hashSecret).toString(CryptoJS.enc.Hex);

const normalizeIpAddress = (ipAddress) => {
  if (!ipAddress) return '127.0.0.1';
  if (ipAddress.includes(',')) return ipAddress.split(',')[0].trim();
  if (ipAddress.startsWith('::ffff:')) return ipAddress.replace('::ffff:', '');
  if (ipAddress === '::1') return '127.0.0.1';
  return ipAddress;
};

const formatVNPayDate = (date = new Date()) => {
  const utcMillis = date.getTime() + date.getTimezoneOffset() * 60000;
  const gmt7Date = new Date(utcMillis + 7 * 60 * 60000);

  const pad = (value) => String(value).padStart(2, '0');

  return (
    gmt7Date.getFullYear() +
    pad(gmt7Date.getMonth() + 1) +
    pad(gmt7Date.getDate()) +
    pad(gmt7Date.getHours()) +
    pad(gmt7Date.getMinutes()) +
    pad(gmt7Date.getSeconds())
  );
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

const getPlanAmount = (subscriptionPlan, paymentMethod, customAmount) => {
  if (customAmount !== undefined && customAmount !== null) {
    const parsed = Number(customAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error('Invalid amount');
    }
    return parsed;
  }

  const planPricing = PLAN_PRICING[subscriptionPlan];
  if (!planPricing || !Number.isFinite(planPricing[paymentMethod])) {
    throw new Error(`Unsupported pricing for ${subscriptionPlan} via ${paymentMethod}`);
  }
  return planPricing[paymentMethod];
};

const getPayPalAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const paypalApiBase = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are missing');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await axios.post(
    `${paypalApiBase}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: Number(process.env.PAYPAL_HTTP_TIMEOUT_MS || 20000),
    }
  );

  if (!response.data?.access_token) {
    throw new Error('Unable to get PayPal access token');
  }

  return response.data.access_token;
};

exports.getPlanAmount = getPlanAmount;

exports.createVNPayUrl = async ({
  userId,
  transactionId,
  subscriptionPlan,
  amount,
  orderInfo,
  ipAddress,
}) => {
  const vnpTmnCode = (process.env.VNPAY_TMNCODE || '').trim();
  const vnpHashSecret = process.env.VNPAY_HASHSECRET || '';
  const vnpUrl = (process.env.VNPAY_URL || '').trim();
  const vnpReturnUrl = (process.env.VNPAY_RETURN_URL || '').trim();

  if (!vnpTmnCode || !vnpHashSecret || !vnpUrl || !vnpReturnUrl) {
    throw new Error('VNPay environment variables are missing');
  }

  const planAmount = getPlanAmount(subscriptionPlan, 'VNPay', amount);
  const amountInMinorUnit = Math.round(Number(planAmount) * 100);
  if (!Number.isInteger(amountInMinorUnit) || amountInMinorUnit <= 0) {
    throw new Error('Invalid VNPay amount');
  }

  const createDate = new Date();
  const expireDate = addMinutes(createDate, Number(process.env.VNPAY_EXPIRE_MINUTES || 15));
  const txnRef = String(transactionId);
  if (!/^[a-zA-Z0-9]+$/.test(txnRef)) {
    throw new Error('Invalid VNPay transaction reference');
  }
  const normalizedIpAddress = normalizeIpAddress(ipAddress);
  if (
    !/^[0-9a-fA-F:.]{7,45}$/.test(normalizedIpAddress)
  ) {
    throw new Error('Invalid VNPay ip address');
  }
  const createDateString = formatVNPayDate(createDate);
  const expireDateString = formatVNPayDate(expireDate);

  if (!/^\d{14}$/.test(createDateString) || !/^\d{14}$/.test(expireDateString)) {
    throw new Error('Invalid VNPay date format');
  }

  const normalizedOrderInfo = normalizeVNPayOrderInfo(
    orderInfo || `EstateManager ${subscriptionPlan} subscription user ${userId}`
  );
  if (!normalizedOrderInfo) {
    throw new Error('Invalid VNPay order info');
  }

  const vnpParams = {
    vnp_Version: VNPAY_VERSION,
    vnp_Command: VNPAY_COMMAND,
    vnp_TmnCode: vnpTmnCode,
    vnp_Amount: amountInMinorUnit,
    vnp_CreateDate: createDateString,
    vnp_CurrCode: 'VND',
    vnp_IpAddr: normalizedIpAddress,
    vnp_Locale: VNPAY_LOCALE,
    vnp_OrderInfo: normalizedOrderInfo,
    vnp_OrderType: VNPAY_ORDER_TYPE,
    vnp_ReturnUrl: vnpReturnUrl,
    vnp_TxnRef: txnRef,
    vnp_ExpireDate: expireDateString,
  };

  const requiredVNPayFields = [
    'vnp_Version',
    'vnp_Command',
    'vnp_TmnCode',
    'vnp_Amount',
    'vnp_CurrCode',
    'vnp_TxnRef',
    'vnp_OrderInfo',
    'vnp_OrderType',
    'vnp_Locale',
    'vnp_ReturnUrl',
    'vnp_IpAddr',
    'vnp_CreateDate',
    'vnp_ExpireDate',
  ];

  const missingFields = requiredVNPayFields.filter((key) => isNilOrEmpty(vnpParams[key]));
  if (missingFields.length) {
    throw new Error(`VNPay missing required params: ${missingFields.join(', ')}`);
  }

  const { filteredParams, sortedParams, signData } = buildVNPayHashContext(vnpParams);
  const secureHash = createSecureHash(signData, vnpHashSecret);

  const shouldDebug =
    String(process.env.VNPAY_DEBUG || '').toLowerCase() === 'true' ||
    process.env.NODE_ENV === 'development';
  if (shouldDebug) {
    const hiddenRawSecret = process.env.VNPAY_HASHSECRET;
    const maskedSecret =
      vnpHashSecret.length > 8
        ? `${vnpHashSecret.slice(0, 4)}...${vnpHashSecret.slice(-4)}`
        : '***';
    console.log('[VNPay][Debug][createVNPayUrl] ===== HASH TRACE START =====');
    console.log('[VNPay][Debug][createVNPayUrl] tmnCode=', vnpTmnCode);
    console.log('[VNPay][Debug][createVNPayUrl] hashSecret(masked)=', maskedSecret, '(len=', vnpHashSecret.length, ')');
    console.log('[VNPay][Debug][createVNPayUrl] process.env.VNPAY_HASHSECRET(raw)=', hiddenRawSecret);
    console.log('[VNPay][Debug][createVNPayUrl] process.env.VNPAY_HASHSECRET(raw JSON)=', JSON.stringify(hiddenRawSecret));
    console.log('[VNPay][Debug][createVNPayUrl] rawVnpParams=', vnpParams);
    console.log('[VNPay][Debug][createVNPayUrl] rawVnpParams(JSON)=', JSON.stringify(vnpParams));
    console.log('[VNPay][Debug][createVNPayUrl] filteredHashParams=', filteredParams);
    console.log('[VNPay][Debug][createVNPayUrl] filteredHashParams(JSON)=', JSON.stringify(filteredParams));
    console.log('[VNPay][Debug][createVNPayUrl] sortedEncodedParams=', sortedParams);
    console.log('[VNPay][Debug][createVNPayUrl] sortedEncodedParams(JSON)=', JSON.stringify(sortedParams));
    console.log('[VNPay][Debug][createVNPayUrl] sortedKeys=', Object.keys(sortedParams));
    console.log('[VNPay][Debug][createVNPayUrl] signData(EXACT)=', signData);
    console.log('[VNPay][Debug][createVNPayUrl] signData(EXACT JSON)=', JSON.stringify(signData));
    console.log('[VNPay][Debug][createVNPayUrl] signDataLength=', signData.length);
    console.log('[VNPay][Debug][createVNPayUrl] secureHash=', secureHash);
    console.log('[VNPay][Debug][createVNPayUrl] ===== HASH TRACE END =====');
  }

  const separator = vnpUrl.includes('?') ? '&' : '?';
  const paymentUrl = `${vnpUrl}${separator}${signData}&vnp_SecureHash=${secureHash}`;

  return {
    paymentUrl,
    txnRef,
    amount: planAmount,
    signData,
    requestParams: vnpParams,
    signedParams: sortedParams,
  };
};

exports.verifyVNPayReturn = (queryParams) => {
  const params = { ...queryParams };
  const providedSecureHash = params.vnp_SecureHash;

  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const sortedParams = sortAndEncodeParams(params);
  const signData = buildQueryString(sortedParams);
  const vnpHashSecret = process.env.VNPAY_HASHSECRET || '';
  console.log(
    '[VNPay][Temp] Raw process.env.VNPAY_HASHSECRET before hashing:',
    process.env.VNPAY_HASHSECRET
  );
  const secureHash = createSecureHash(signData, vnpHashSecret);

  const isValid =
    Boolean(providedSecureHash) &&
    secureHash.toLowerCase() === String(providedSecureHash).toLowerCase();

  const responseCode = normalizeVNPayStatusCode(params.vnp_ResponseCode);
  const transactionStatus = normalizeVNPayStatusCode(params.vnp_TransactionStatus);
  const hasTransactionStatus = transactionStatus !== '';
  const isSuccess =
    isValid &&
    isVNPaySuccessCode(responseCode) &&
    (!hasTransactionStatus || isVNPaySuccessCode(transactionStatus));

  return {
    isValid,
    isSuccess,
    responseCode,
    transactionStatus,
    transactionRef: params.vnp_TxnRef ? String(params.vnp_TxnRef) : '',
    gatewayTransactionId: params.vnp_TransactionNo
      ? String(params.vnp_TransactionNo)
      : '',
    secureHash,
    rawParams: queryParams,
  };
};

exports.createPayPalOrder = async ({
  userId,
  transactionId,
  subscriptionPlan,
  amount,
  returnUrl,
  cancelUrl,
}) => {
  const paypalApiBase = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
  const planAmount = getPlanAmount(subscriptionPlan, 'PayPal', amount);
  const token = await getPayPalAccessToken();

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: String(transactionId),
        custom_id: String(transactionId),
        description: `EstateManager ${subscriptionPlan} subscription for user ${userId}`,
        amount: {
          currency_code: 'USD',
          value: Number(planAmount).toFixed(2),
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
      },
    },
  };

  const response = await axios.post(`${paypalApiBase}/v2/checkout/orders`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': String(transactionId),
    },
    timeout: Number(process.env.PAYPAL_HTTP_TIMEOUT_MS || 20000),
  });

  const links = response.data?.links || [];
  const approvalLink =
    links.find((link) => link.rel === 'payer-action')?.href ||
    links.find((link) => link.rel === 'approve')?.href ||
    '';

  if (!response.data?.id || !approvalLink) {
    throw new Error('Unable to create PayPal order');
  }

  return {
    orderId: response.data.id,
    approvalUrl: approvalLink,
    amount: planAmount,
    response: response.data,
  };
};

exports.capturePayPalOrder = async (orderId) => {
  if (!orderId) throw new Error('PayPal orderId is required');

  const paypalApiBase = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
  const token = await getPayPalAccessToken();

  const response = await axios.post(
    `${paypalApiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: Number(process.env.PAYPAL_HTTP_TIMEOUT_MS || 20000),
    }
  );

  const status = String(response.data?.status || '');
  const captureStatuses =
    response.data?.purchase_units?.flatMap((unit) =>
      (unit?.payments?.captures || []).map((capture) => String(capture?.status || ''))
    ) || [];
  const hasCompletedCapture = captureStatuses.some((captureStatus) => captureStatus === 'COMPLETED');

  return {
    isSuccess: status === 'COMPLETED' || hasCompletedCapture,
    status,
    response: response.data,
  };
};
