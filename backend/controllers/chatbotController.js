const Joi = require('joi');
const ragChatbotService = require('../services/ragChatbotService');
const chatbotMemoryService = require('../services/chatbotMemoryService');

const historyItemSchema = Joi.object({
  role: Joi.string().valid('user', 'assistant').required(),
  content: Joi.string().trim().min(1).max(2000).required(),
});

const chatbotQuerySchema = Joi.object({
  question: Joi.string().trim().min(1).max(2000),
  prompt: Joi.string().trim().min(1).max(2000),
  history: Joi.array().items(historyItemSchema).max(20).default([]),
}).options({ stripUnknown: true });

exports.queryChatbot = async (req, res, next) => {
  try {
    const { value, error } = chatbotQuerySchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    const question = String(value.question || value.prompt || '').trim();
    if (!question) {
      return res.status(400).json({
        status: 'error',
        message: 'Question is required',
      });
    }

    const memoryContext = await chatbotMemoryService.getMemoryContextForChat(req.user?._id);
    const fallbackHistory = value.history || [];
    const effectiveHistory =
      Array.isArray(memoryContext.recentMessages) && memoryContext.recentMessages.length > 0
        ? memoryContext.recentMessages
        : fallbackHistory;

    const result = await ragChatbotService.answerQuestion({
      question,
      history: effectiveHistory,
      memorySummary: memoryContext.summary || '',
      preferenceProfile: memoryContext.preferenceProfile || {},
      user: req.user || null,
    });

    await chatbotMemoryService.recordChatbotTurn({
      userId: req.user?._id,
      userQuestion: question,
      assistantAnswer: result.answer,
      detectedCriteria: result.detectedCriteria || {},
      intent: result.intent || 'unknown',
    });

    const { detectedCriteria, ...responseData } = result;

    return res.status(200).json({
      status: 'success',
      data: responseData,
    });
  } catch (error) {
    if (typeof next === 'function') {
      return next(error);
    }
    return res.status(500).json({
      status: 'error',
      message: error?.message || 'Internal Server Error',
    });
  }
};

exports.getMemory = async (req, res, next) => {
  try {
    const memory = await chatbotMemoryService.getMemoryContextForChat(req.user?._id);
    return res.status(200).json({
      status: 'success',
      data: memory,
    });
  } catch (error) {
    if (typeof next === 'function') {
      return next(error);
    }
    return res.status(500).json({
      status: 'error',
      message: error?.message || 'Internal Server Error',
    });
  }
};

exports.clearMemory = async (req, res, next) => {
  try {
    const memory = await chatbotMemoryService.clearMemory(req.user?._id);
    return res.status(200).json({
      status: 'success',
      data: memory,
    });
  } catch (error) {
    if (typeof next === 'function') {
      return next(error);
    }
    return res.status(500).json({
      status: 'error',
      message: error?.message || 'Internal Server Error',
    });
  }
};
