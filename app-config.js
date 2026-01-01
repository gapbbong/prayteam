// 🔹 config.js — 기도그룹 PWA 공용 설정
(() => {
  // 🔸 현재 시각 기반 자동 버전 (YYYY.MM.DD-HH:mm)
  const now = new Date();
  const pad = n => n.toString().padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const version = `${yyyy}.${mm}.${dd}-${hh}:${mi}`;

  // 🔸 전역 CONFIG 등록
  window.CONFIG = {
    // ✅ Netlify Functions 프록시를 통해 GAS와 통신
    GAS_URL: "/.netlify/functions/proxy",

    // ✅ (선택) 알림 관련 서버리스 함수 경로
    NOTIFY_URL: "/.netlify/functions/notify",

    // ✅ 서비스 이름(표시용)
    APP_NAME: "기도그룹",

    // ✅ 자동 생성 버전 (캐시 무력화용)
    VERSION: version
  };

  // 🔸 콘솔 표시 (가독성 개선)
  console.log(
    `%c✅ CONFIG loaded: ${CONFIG.APP_NAME} v${CONFIG.VERSION}`,
    "color:#9f9; font-weight:bold;"
  );
})();
