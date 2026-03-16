const KYC_PYTHON_SERVICE_URL =
  process.env.KYC_PYTHON_SERVICE_URL || 'http://localhost:8001/process';
const KYC_HTTP_TIMEOUT_MS = Number(process.env.KYC_HTTP_TIMEOUT_MS || 120000);
const KYC_HTTP_RETRY_ON_TIMEOUT =
  (process.env.KYC_HTTP_RETRY_ON_TIMEOUT || 'true').toLowerCase() === 'true';
const MATCH_THRESHOLD = Number(process.env.KYC_MATCH_THRESHOLD || 0.88);
const ADDRESS_MATCH_THRESHOLD = Number(process.env.KYC_ADDRESS_MATCH_THRESHOLD || 0.7);
const OCR_CONFIDENCE_THRESHOLD = Number(process.env.KYC_OCR_CONFIDENCE_THRESHOLD || 0.6);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const unique = (values) => [...new Set(values.filter(Boolean))];

const stripVietnameseTones = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

const normalizeForCompare = (value = '') =>
  stripVietnameseTones(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const normalizeDigits = (value = '') => String(value || '').replace(/\D/g, '');

const normalizeDate = (value = '') => {
  const match = String(value || '').match(/([0-3]?\d[\/.\-][01]?\d[\/.\-](?:\d{2}|\d{4}))/);
  if (!match) return '';
  return match[1].replace(/[.\-]/g, '/');
};

const normalizeConfidence = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric > 1) return clamp(numeric / 100, 0, 1);
  return clamp(numeric, 0, 1);
};

const average = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const pickFirstNonEmpty = (...values) => values.find((value) => String(value || '').trim()) || '';

const normalizeServiceExtractedData = (data = {}) => ({
  fullName: String(data.fullName || data.full_name || data.name || '').trim(),
  idNumber: normalizeDigits(data.idNumber || data.id_number || ''),
  dateOfBirth: normalizeDate(data.dateOfBirth || data.date_of_birth || data.dob || ''),
  permanentAddress: String(
    data.permanentAddress || data.permanent_address || data.address || ''
  ).trim(),
  placeOfOrigin: String(data.placeOfOrigin || data.place_of_origin || '').trim(),
});

const normalizeFieldConfidences = (fieldConfidences = {}) => {
  const normalized = {};
  Object.entries(fieldConfidences || {}).forEach(([key, value]) => {
    normalized[key] = Number(normalizeConfidence(value).toFixed(4));
  });
  return normalized;
};

const callPythonKycService = async (buffer, sideLabel) => {
  const callOnce = async (timeoutMs) => {
    const payload = {
      image_base64: buffer.toString('base64'),
      side_label: sideLabel,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(KYC_PYTHON_SERVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`KYC Python service timed out after ${timeoutMs}ms`);
      }
      throw new Error(`Unable to call KYC Python service: ${error.message}`);
    } finally {
      clearTimeout(timeout);
    }

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      const upstreamMessage =
        responseBody?.message || responseBody?.detail || `HTTP ${response.status}`;
      throw new Error(`KYC Python service error: ${upstreamMessage}`);
    }

    if (responseBody?.status !== 'success') {
      throw new Error('KYC Python service returned an invalid success payload');
    }

    return responseBody;
  };

  try {
    return await callOnce(KYC_HTTP_TIMEOUT_MS);
  } catch (error) {
    const isTimeout = String(error.message || '').includes('timed out');
    if (isTimeout && KYC_HTTP_RETRY_ON_TIMEOUT) {
      return callOnce(Math.max(KYC_HTTP_TIMEOUT_MS, 120000));
    }
    throw error;
  }
};

const mergeParsedData = (frontParsed = {}, backParsed = {}) => {
  const frontId = normalizeDigits(frontParsed.idNumber || '');
  const backId = normalizeDigits(backParsed.idNumber || '');
  const frontDob = normalizeDate(frontParsed.dateOfBirth || '');
  const backDob = normalizeDate(backParsed.dateOfBirth || '');

  return {
    fullName: pickFirstNonEmpty(frontParsed.fullName, backParsed.fullName),
    idNumber: pickFirstNonEmpty(frontId, backId),
    dateOfBirth: pickFirstNonEmpty(frontDob, backDob),
    permanentAddress: pickFirstNonEmpty(
      backParsed.permanentAddress,
      frontParsed.permanentAddress,
      backParsed.placeOfOrigin,
      frontParsed.placeOfOrigin
    ),
    placeOfOrigin: pickFirstNonEmpty(backParsed.placeOfOrigin, frontParsed.placeOfOrigin),
    idConsistency: frontId && backId ? frontId === backId : false,
    dobConsistency: frontDob && backDob ? frontDob === backDob : false,
    perSide: {
      front: frontParsed,
      back: backParsed,
    },
  };
};

const levenshteinDistance = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1).fill(0));
  for (let i = 0; i <= b.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
};

const similarityScore = (source, target) => {
  const normalizedSource = normalizeForCompare(source);
  const normalizedTarget = normalizeForCompare(target);

  if (!normalizedSource || !normalizedTarget) return 0;
  if (normalizedSource === normalizedTarget) return 1;

  const distance = levenshteinDistance(normalizedSource, normalizedTarget);
  const maxLength = Math.max(normalizedSource.length, normalizedTarget.length);
  return maxLength ? 1 - distance / maxLength : 0;
};

const buildStringFieldComparison = (expected, extracted, threshold) => {
  const normalizedExpected = String(expected || '').trim();
  const normalizedExtracted = String(extracted || '').trim();

  if (!normalizedExpected || !normalizedExtracted) {
    return {
      expected: normalizedExpected || null,
      extracted: normalizedExtracted || null,
      score: 0,
      threshold,
      match: false,
    };
  }

  const score = similarityScore(normalizedExpected, normalizedExtracted);
  return {
    expected: normalizedExpected,
    extracted: normalizedExtracted,
    score: Number(score.toFixed(4)),
    threshold,
    match: score >= threshold,
  };
};

const buildIdComparison = ({ parsedData, declaredIdNumber }) => {
  const extractedId = normalizeDigits(parsedData?.idNumber || '');
  const frontId = normalizeDigits(parsedData?.perSide?.front?.idNumber || '');
  const backId = normalizeDigits(parsedData?.perSide?.back?.idNumber || '');
  const declaredId = normalizeDigits(declaredIdNumber || '');

  if (declaredId) {
    const match = declaredId === extractedId;
    return {
      expected: declaredId,
      extracted: extractedId || null,
      score: match ? 1 : 0,
      threshold: MATCH_THRESHOLD,
      match,
      comparedWith: 'declaredIdNumber',
    };
  }

  if (frontId && backId) {
    const match = frontId === backId;
    return {
      expected: frontId,
      extracted: backId,
      score: match ? 1 : 0,
      threshold: MATCH_THRESHOLD,
      match,
      comparedWith: 'frontBackConsistency',
    };
  }

  if (extractedId) {
    return {
      expected: null,
      extracted: extractedId,
      score: 1,
      threshold: MATCH_THRESHOLD,
      match: true,
      comparedWith: 'ocrExtractionOnly',
    };
  }

  return {
    expected: null,
    extracted: null,
    score: 0,
    threshold: MATCH_THRESHOLD,
    match: false,
    comparedWith: 'unavailable',
  };
};

exports.runOcrOnBuffer = async (buffer, sideLabel) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Invalid image buffer for OCR processing');
  }

  const responseBody = await callPythonKycService(buffer, sideLabel);
  const extractedData = normalizeServiceExtractedData(responseBody.extracted_data || {});
  const confidence = normalizeConfidence(responseBody.confidence_score);

  return {
    side: sideLabel,
    text: String(responseBody.raw_text || '').trim(),
    confidence: Number(confidence.toFixed(4)),
    wordCount: String(responseBody.raw_text || '')
      .split(/\s+/)
      .filter(Boolean).length,
    extractedData,
    fieldConfidences: normalizeFieldConfidences(responseBody.field_confidences || {}),
    processingMeta: responseBody.processing_meta || {},
  };
};

exports.buildKycExtractedData = ({ frontOcrResult, backOcrResult, ocrErrors = [] }) => {
  const frontParsed = frontOcrResult?.extractedData || {};
  const backParsed = backOcrResult?.extractedData || {};
  const mergedParsed = mergeParsedData(frontParsed, backParsed);
  const confidenceValues = [frontOcrResult?.confidence, backOcrResult?.confidence].filter(
    (value) => typeof value === 'number' && Number.isFinite(value)
  );

  return {
    raw: {
      front: {
        text: frontOcrResult?.text || '',
        confidence: frontOcrResult?.confidence ?? 0,
        wordCount: frontOcrResult?.wordCount ?? 0,
        fieldConfidences: frontOcrResult?.fieldConfidences || {},
        processingMeta: frontOcrResult?.processingMeta || {},
      },
      back: {
        text: backOcrResult?.text || '',
        confidence: backOcrResult?.confidence ?? 0,
        wordCount: backOcrResult?.wordCount ?? 0,
        fieldConfidences: backOcrResult?.fieldConfidences || {},
        processingMeta: backOcrResult?.processingMeta || {},
      },
    },
    parsed: mergedParsed,
    ocrQuality: {
      averageConfidence: Number(average(confidenceValues).toFixed(4)),
      confidenceThreshold: OCR_CONFIDENCE_THRESHOLD,
      errors: ocrErrors,
      pythonServiceUrl: KYC_PYTHON_SERVICE_URL,
    },
  };
};

exports.buildKycComparisonResult = ({
  user,
  extractedData,
  declaredIdNumber = '',
}) => {
  const parsedData = extractedData?.parsed || {};
  const extractedName = parsedData.fullName || '';
  const nameField = buildStringFieldComparison(user?.name || '', extractedName, MATCH_THRESHOLD);
  const idField = buildIdComparison({ parsedData, declaredIdNumber });
  const scores = [nameField.score, idField.score];

  return {
    baseline: {
      name: user?.name || null,
      declaredIdNumber: normalizeDigits(declaredIdNumber || '') || null,
    },
    fields: {
      name: nameField,
      idNumber: idField,
    },
    thresholds: {
      fieldMatch: MATCH_THRESHOLD,
      ocrConfidence: OCR_CONFIDENCE_THRESHOLD,
    },
    overallScore: Number(average(scores).toFixed(4)),
  };
};

exports.decideKycOutcome = ({ comparisonResult, extractedData }) => {
  const nameField = comparisonResult?.fields?.name || {};
  const idField = comparisonResult?.fields?.idNumber || {};
  const averageConfidence = Number(extractedData?.ocrQuality?.averageConfidence || 0);
  const hasOcrErrors = Boolean(extractedData?.ocrQuality?.errors?.length);
  const frontFieldConfidence = extractedData?.raw?.front?.fieldConfidences || {};
  const backFieldConfidence = extractedData?.raw?.back?.fieldConfidences || {};
  const criticalFieldConfidence = {
    fullName: Math.max(
      normalizeConfidence(frontFieldConfidence.fullName),
      normalizeConfidence(backFieldConfidence.fullName)
    ),
    idNumber: Math.max(
      normalizeConfidence(frontFieldConfidence.idNumber),
      normalizeConfidence(backFieldConfidence.idNumber)
    ),
  };

  const reasons = [];
  if (!nameField.match) reasons.push('Name mismatch');
  if (!idField.match) reasons.push('ID number mismatch');
  if (averageConfidence < OCR_CONFIDENCE_THRESHOLD) {
    reasons.push(
      `OCR confidence too low (${averageConfidence.toFixed(3)} < ${OCR_CONFIDENCE_THRESHOLD})`
    );
  }
  if (!extractedData?.parsed?.fullName) reasons.push('Unable to extract full name');
  if (!extractedData?.parsed?.idNumber) reasons.push('Unable to extract ID number');
  if (criticalFieldConfidence.fullName < OCR_CONFIDENCE_THRESHOLD) {
    reasons.push(
      `Full name confidence too low (${criticalFieldConfidence.fullName.toFixed(3)} < ${OCR_CONFIDENCE_THRESHOLD})`
    );
  }
  if (criticalFieldConfidence.idNumber < OCR_CONFIDENCE_THRESHOLD) {
    reasons.push(
      `ID number confidence too low (${criticalFieldConfidence.idNumber.toFixed(3)} < ${OCR_CONFIDENCE_THRESHOLD})`
    );
  }
  if (hasOcrErrors) reasons.push('OCR processing issue');

  const criticalFieldsMatch = nameField.match === true && idField.match === true;
  const highConfidence = averageConfidence >= OCR_CONFIDENCE_THRESHOLD;
  const criticalFieldConfidencePass =
    criticalFieldConfidence.fullName >= OCR_CONFIDENCE_THRESHOLD &&
    criticalFieldConfidence.idNumber >= OCR_CONFIDENCE_THRESHOLD;

  if (criticalFieldsMatch && highConfidence && criticalFieldConfidencePass && !hasOcrErrors) {
    return {
      kycStatus: 'verified',
      isVerified: true,
      kycRejectionReason: '',
      decisionNotes: [],
    };
  }

  return {
    kycStatus: 'rejected',
    isVerified: false,
    kycRejectionReason: unique(reasons).join(', ') || 'KYC rejected by automated checks',
    decisionNotes: unique(reasons),
  };
};
