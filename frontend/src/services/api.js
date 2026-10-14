import { requestJson } from './apiClient.js';

export const inventoryService = {
  async getCottonBales() {
    return (await requestJson('/inventory/cotton-bales', { signal: AbortSignal.timeout(10000) })).stock;
  },
  async optimizeBlend(payload) {
    return (await requestJson('/inventory/optimize', { method: 'POST', body: payload, signal: AbortSignal.timeout(10000) })).result;
  },
};

export const standardsService = {
  async getActiveRules() {
    return (await requestJson('/config/active-rules', { signal: AbortSignal.timeout(10000) })).rules;
  },
};
