/**
 * Google Apps Script API Client
 * Wraps all calls to the backend via Netlify proxy to avoid CORS.
 */

const PROXY_URL = '/api/proxy';

export const gasClient = {
  async request(params, method = 'POST', timeoutMs = 25000) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const url = method === 'GET'
        ? `${PROXY_URL}?${new URLSearchParams(params).toString()}`
        : PROXY_URL;

      const fetchOptions = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method === 'GET' ? null : JSON.stringify(params),
      };
      if (controller) fetchOptions.signal = controller.signal;
      const response = await fetch(url, fetchOptions);

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
      if (error && error.name === 'AbortError') {
        const timeoutError = new Error('서버 응답이 없습니다. 네트워크를 확인 후 다시 시도해주세요.');
        console.error('GAS Client Request Timeout:', params && params.mode);
        // 타임아웃은 재시도되는 경우가 많아 빨간 오버레이를 띄우지 않음 (토스트로만 안내)
        throw timeoutError;
      }
      console.error('GAS Client Request Failed:', error);
      // Trigger global error event for our Error Overlay (SSR-safe)
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('app-error', { detail: error.message }));
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  },

  // Auth
  async login(id, pwd, timeoutMs = 45000) {
    return this.request({ mode: 'login', id, pwd }, 'GET', timeoutMs);
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
    // GAS handleSaveSub expects { groupId, subscription }
    return this.request({
      mode: 'saveSub',
      groupId,
      subscription,
    });
  },

  async deleteSub({ groupId, endpoint }) {
    return this.request({
      mode: 'deleteSub',
      groupId,
      endpoint,
    });
  },

  async getGroups(userId, timeoutMs = 45000) {
    return this.request({ mode: 'getGroups', adminId: userId }, 'GET', timeoutMs);
  },

  async getGroupById(groupId) {
    return this.request({ mode: 'getGroupById', groupId }, 'GET');
  },

  async addGroup(adminId, groupName, members = []) {
    return this.request({ mode: 'addGroup', adminId, groupName, members });
  },

  async addMember(groupId, memberName) {
    return this.request({ mode: 'addMember', groupId, newMember: memberName });
  },

  // Prayers
  getPrayers(groupId, member, timeoutMs) {
    return this.request({ mode: 'getPrayers', groupId, member }, 'GET', timeoutMs);
  },

  getPrayersAll(groupId, timeoutMs = 60000) {
    return this.request({ mode: 'getPrayersAll', groupId }, 'GET', timeoutMs);
  },

  getPrayersAllGroups(groupIds, timeoutMs = 60000) {
    // groupIds: comma separated string
    return this.request({ mode: 'getPrayersAllGroups', groupIds }, 'GET', timeoutMs);
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
  },

  // Push: GAS를 거치지 않고 Next /api/notify로 직접 발송
  async notify({ groupId, title, message, icon }) {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, title, message, icon }),
    });
    if (!response.ok) {
      throw new Error(`Notify failed: ${response.status}`);
    }
    return response.json();
  }
};
