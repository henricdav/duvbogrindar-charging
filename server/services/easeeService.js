import axios from 'axios';

class EaseeService {
  constructor() {
    this.baseUrl = 'https://api.easee.com/api';
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Login to Easee API and get access token
   */
  async login() {
    try {
      const response = await axios.post(`${this.baseUrl}/accounts/login`, {
        userName: process.env.EASEE_USERNAME,
        password: process.env.EASEE_PASSWORD
      });

      this.accessToken = response.data.accessToken;
      this.refreshToken = response.data.refreshToken;
      // Tokens typically expire in 1 hour
      this.tokenExpiry = Date.now() + 3600000; // 1 hour from now

      console.log('Successfully logged in to Easee API');
      return this.accessToken;
    } catch (error) {
      console.error('Failed to login to Easee API:', error.response?.data || error.message);
      throw new Error('Easee authentication failed');
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshAccessToken() {
    try {
      const response = await axios.post(`${this.baseUrl}/accounts/refresh_token`, {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken
      });

      this.accessToken = response.data.accessToken;
      this.refreshToken = response.data.refreshToken;
      this.tokenExpiry = Date.now() + 3600000;

      console.log('Successfully refreshed Easee API token');
      return this.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error.response?.data || error.message);
      // If refresh fails, try to login again
      return await this.login();
    }
  }

  /**
   * Get valid access token, refreshing if needed
   */
  async getValidToken() {
    // If no token or token expired, login
    if (!this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry - 300000) {
      if (this.refreshToken) {
        return await this.refreshAccessToken();
      } else {
        return await this.login();
      }
    }
    return this.accessToken;
  }

  /**
   * Fetch hourly energy data for a charger
   * @param {string} chargerId - The charger ID
   * @param {string} from - ISO timestamp for start date
   * @param {string} to - ISO timestamp for end date
   * @returns {Array} Array of energy data entries
   * 
   * Expected response format from Easee API:
   * [
   *   { timestamp: "2024-01-15T00:00:00Z", value: 12.5 },
   *   ...
   * ]
   */
  async getHourlyEnergy(chargerId, from, to) {
    try {
      const token = await this.getValidToken();
      
      const response = await axios.get(
        `${this.baseUrl}/chargers/lifetime-energy/${chargerId}/hourly`,
        {
          params: { from, to },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = response.data;
      
      // Log the structure of the first entry to help with debugging
      if (data && data.length > 0) {
        console.log(`Easee API returned ${data.length} entries for charger ${chargerId}`);
        console.log(`First entry structure:`, JSON.stringify(data[0]));
      } else {
        console.log(`Easee API returned empty data for charger ${chargerId}`);
      }

      return data;
    } catch (error) {
      console.error(`Failed to fetch energy data for charger ${chargerId}:`, 
        error.response?.data || error.message);
      throw error;
    }
  }
}

// Singleton instance
const easeeService = new EaseeService();
export default easeeService;
