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
        let errorBody = null;
        try {
          errorBody = await response.json();
        } catch (e) {
          // JSON 파싱 실패 시 무시
        }
        const errorMsg = errorBody && errorBody.error
          ? `HTTP error! status: ${response.status} - ${errorBody.error}`
          : `HTTP error! status: ${response.status}`;
        throw new Error(errorMsg);
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

  async signup(id, pwd, email) {
    return this.request({ mode: 'signup', id, pwd, email }, 'GET');
  },

  async findId(email, firstChar) {
    return this.request({ mode: 'findId', email, firstChar }, 'GET');
  },

  async findPwd(id, email) {
    return this.request({ mode: 'findPwd', id, email }, 'GET');
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

  getPrayersAllGroups(groupIds) {
    // groupIds: comma separated string
    return this.request({ mode: 'getPrayersAllGroups', groupIds }, 'GET');
  },

  savePrayer(data) {
    return this.request({ ...data, mode: 'savePrayer' });
  },

  saveNote(data) {
    // data: { groupId, member, index, answer, comment }
    return this.request({ ...data, mode: 'saveNote' });
  },

  async addLog(data) {
    // data: { page, adminId, groupId, member, from, device, browser }
    return this.request({ ...data, mode: 'addLog' });
  },

  async logStay(data) {
    // data: { page, groupId, stay, time }
    return this.request({ ...data, mode: 'logStay' });
  }
};
