import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

export const getPrices = async (from, to) => {
  const response = await apiClient.get('/prices', {
    params: { from, to }
  });
  return response.data;
};

export default apiClient;
