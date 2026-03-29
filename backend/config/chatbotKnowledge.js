const { loadChatbotKnowledge } = require('./chatbotKnowledgeLoader');

const KNOWLEDGE = loadChatbotKnowledge();

module.exports = {
  ROUTE_KNOWLEDGE: Array.isArray(KNOWLEDGE.routeKnowledge) ? KNOWLEDGE.routeKnowledge : [],
  COMMON_WORKFLOWS: Array.isArray(KNOWLEDGE.commonWorkflows) ? KNOWLEDGE.commonWorkflows : [],
};

