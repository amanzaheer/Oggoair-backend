const axios = require('axios');

const DUFFEL_BASE_URL = process.env.DUFFEL_BASE_URL || 'https://api.duffel.com';
const DUFFEL_VERSION = process.env.DUFFEL_VERSION || 'v1';

function getClient() {
    const apiKey = process.env.DUFFEL_API_KEY;
    if (!apiKey) {
        throw new Error('DUFFEL_API_KEY is not set');
    }
    const instance = axios.create({
        baseURL: DUFFEL_BASE_URL,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Duffel-Version': DUFFEL_VERSION
        },
        timeout: 15000
    });
    return instance;
}

async function listOrders(params) {
    const client = getClient();
    const response = await client.get('/air/orders', { params });
    return response.data;
}

async function getOrder(orderId) {
    const client = getClient();
    const response = await client.get(`/air/orders/${orderId}`);
    return response.data;
}

module.exports = {
    listOrders,
    getOrder
};


