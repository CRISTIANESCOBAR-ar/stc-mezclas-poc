import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 10000 // 10 segundos de límite para evitar hangs
});

export const inventoryService = {
    async getCottonBales() {
        const { data } = await api.get('/inventory/cotton-bales');
        return data.stock;
    },
    async optimizeBlend(payload) {
        const { data } = await api.post('/inventory/optimize', payload);
        return data.result;
    }
};

export const standardsService = {
    async getActiveRules() {
        const { data } = await api.get('/config/active-rules');
        return data.rules;
    }
};
