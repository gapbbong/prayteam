// ✅ Node 환경 (서버 함수용)
exports.CONFIG = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbz5HczNlxR78sms3REhXJ33UoEYAIWcdUzDDBCmYZ8wlU8lF9qJcndBKT1CysJwFpVu/exec"
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
