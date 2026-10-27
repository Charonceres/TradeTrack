/**
 * TradeTrack Frontend API Client
 * Connects the UI to the TradeTrack Backend (Node.js & SQLite)
 */

(function (window) {
  // Determine backend URL automatically
  const isDirectFile = window.location.protocol === 'file:';
  const isLiveServer = window.location.port === '5500' || window.location.port === '3000' || window.location.port === '8080';
  const API_BASE = (isDirectFile || isLiveServer)
    ? 'http://localhost:5000/api'
    : '/api';

  class ApiService {
    constructor(baseUrl) {
      this.baseUrl = baseUrl;
      this.connected = false;
      this.listeners = [];
    }

    onConnectionChange(callback) {
      this.listeners.push(callback);
    }

    setConnected(status) {
      if (this.connected !== status) {
        this.connected = status;
        this.listeners.forEach(cb => cb(status));
      }
    }

    async request(endpoint, options = {}) {
      const url = `${this.baseUrl}${endpoint}`;
      const defaultHeaders = {
        'Accept': 'application/json'
      };

      if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
      }

      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...defaultHeaders,
            ...options.headers
          }
        });

        if (!response.ok) {
          let errorMsg = `Server error ${response.status}`;
          try {
            const errData = await response.json();
            if (errData && errData.message) errorMsg = errData.message;
          } catch (_) {}
          throw new Error(errorMsg);
        }

        this.setConnected(true);
        return await response.json();
      } catch (error) {
        // If connection fails
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
          this.setConnected(false);
        }
        throw error;
      }
    }

    // Health
    async checkHealth() {
      try {
        const res = await this.request('/health');
        this.setConnected(true);
        return res;
      } catch (e) {
        this.setConnected(false);
        return null;
      }
    }

    // Trades
    async getTrades(params = {}) {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.direction && params.direction !== 'all') query.append('direction', params.direction);
      if (params.result && params.result !== 'all') query.append('result', params.result);
      if (params.market && params.market !== 'all') query.append('market', params.market);
      if (params.strategy && params.strategy !== 'all') query.append('strategy', params.strategy);
      if (params.sort) query.append('sort', params.sort);

      const qs = query.toString() ? `?${query.toString()}` : '';
      const res = await this.request(`/trades${qs}`);
      return res.data;
    }

    async getTrade(id) {
      const res = await this.request(`/trades/${id}`);
      return res.data;
    }

    async createTrade(tradeData) {
      const res = await this.request('/trades', {
        method: 'POST',
        body: tradeData
      });
      return res.data;
    }

    async updateTrade(id, tradeData) {
      const res = await this.request(`/trades/${id}`, {
        method: 'PUT',
        body: tradeData
      });
      return res.data;
    }

    async deleteTrade(id) {
      return await this.request(`/trades/${id}`, {
        method: 'DELETE'
      });
    }

    getExportCsvUrl() {
      return `${this.baseUrl}/trades/export/csv`;
    }

    async resetSampleTrades() {
      const res = await this.request('/trades/reset', { method: 'POST' });
      return res.data;
    }

    // Notes / Reflections
    async getNotes(params = {}) {
      const query = new URLSearchParams();
      if (params.category && params.category !== 'all') query.append('category', params.category);
      if (params.search) query.append('search', params.search);

      const qs = query.toString() ? `?${query.toString()}` : '';
      const res = await this.request(`/notes${qs}`);
      return res;
    }

    async createNote(noteData) {
      const res = await this.request('/notes', {
        method: 'POST',
        body: noteData
      });
      return res.data;
    }

    async deleteNote(id) {
      return await this.request(`/notes/${id}`, {
        method: 'DELETE'
      });
    }

    // Analytics
    async getAnalytics() {
      const res = await this.request('/analytics/summary');
      return res.data;
    }

    // Settings & Profile
    async getProfile() {
      const res = await this.request('/settings/profile');
      return res.data;
    }

    async updateProfile(profileData) {
      const res = await this.request('/settings/profile', {
        method: 'PUT',
        body: profileData
      });
      return res.data;
    }

    // Risk
    async calculateRisk(riskData) {
      const res = await this.request('/risk/calculate', {
        method: 'POST',
        body: riskData
      });
      return res.data;
    }

    async saveRisk(riskData) {
      const res = await this.request('/risk/save', {
        method: 'POST',
        body: riskData
      });
      return res.data;
    }

    // Market
    async getMarketStatus() {
      const res = await this.request('/market/status');
      return res.data;
    }

    async getMarketQuotes() {
      const res = await this.request('/market/quotes');
      return res.data;
    }
  }

  window.api = new ApiService(API_BASE);
})(window);
