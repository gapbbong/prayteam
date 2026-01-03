// ✅ Node 환경 (서버 함수용)
exports.CONFIG = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbzxjl8ZO8sCMGY7WNXGT0H4VxlTHYYqd-HVPEVOEGMg9fvdmaF1fRH4amG_9CnY2DP5/exec"
};

// ✅ Netlify Function이 호출될 때 실행되는 handler 정의
exports.handler = async () => {
  const js = `
    window.CONFIG = {
      GAS_URL: "${exports.CONFIG.GAS_URL}"
    };
    console.log('✅ CONFIG loaded from Netlify Function');
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/javascript" },
    body: js
  };
};
