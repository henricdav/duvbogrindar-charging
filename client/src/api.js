import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// API functions
export const getChargers = async () => {
  const response = await apiClient.get('/chargers');
  return response.data;
};

export const getEnergyData = async (chargerId, from, to) => {
  const response = await apiClient.get(`/chargers/${chargerId}/energy`, {
    params: { from, to }
  });
  return response.data;
};

export const getCostData = async (chargerId, from, to) => {
  const response = await apiClient.get(`/chargers/${chargerId}/cost`, {
    params: { from, to }
  });
  return response.data;
};

export const exportCostData = async (chargerId, from, to) => {
  const response = await apiClient.get(`/chargers/${chargerId}/cost/export`, {
    params: { from, to },
    responseType: 'blob'
  });
  return response.data;
};

export const getPrices = async (from, to) => {
  const response = await apiClient.get('/prices', {
    params: { from, to }
  });
  return response.data;
};

export const getPricingConfig = async () => {
  const response = await apiClient.get('/settings/pricing');
  return response.data;
};

export const updatePricingConfig = async (config) => {
  const response = await apiClient.put('/settings/pricing', config);
  return response.data;
};

export const fetchDataManually = async (fromDate = null, toDate = null) => {
  const payload = {};
  if (fromDate && toDate) {
    payload.from = fromDate;
    payload.to = toDate;
  }
  const response = await apiClient.post('/cron/update-data', payload);
  return response.data;
};

export default apiClient;
