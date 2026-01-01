/**
 * Google Apps Script API Client
 * Wraps all calls to the backend via Netlify proxy to avoid CORS.
 */

const PROXY_URL = '/api/proxy';

export const gasClient = {
  async request(params, method = 'POST') {
    try {
      const url = method === 'GET'
        ? `${PROXY_URL}?${new URLSearchParams(params).toString()}`
        : PROXY_URL;

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method === 'GET' ? null : JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GAS Client Request Failed:', error);
      // Trigger global error event for our Error Overlay
      window.dispatchEvent(new CustomEvent('app-error', { detail: error.message }));
      throw error;
    }
  },

  // Auth
  async login(id, pwd) {
    return this.request({ mode: 'login', id, pwd }, 'GET');
  },

  async saveSub({ groupId, subscription }) {
    return this.request({
      mode: 'saveSub',
      groupId,
      endpoint: subscription.endpoint,
      subJson: JSON.stringify(subscription)
    });
  },

  async getGroups(userId) {
    return this.request({ mode: 'getGroups', adminId: userId }, 'GET');
  },

  async addGroup(adminId, groupName) {
    return this.request({ mode: 'addGroup', adminId, groupName });
  },

  async addMember(groupId, memberName) {
    return this.request({ mode: 'addMember', groupId, memberName });
  },

  // Prayers
  getPrayers(groupId, member) {
    return this.request({ mode: 'getPrayers', groupId, member }, 'GET');
  },

  savePrayer(data) {
    return this.request({ ...data, mode: 'savePrayer' });
  },

  saveNote(data) {
    // data: { groupId, member, index, answer, comment }
    return this.request({ ...data, mode: 'saveNote' });
  }
};
