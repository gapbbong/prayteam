// ✅ notify.js - FCM Web Push 발송용 (CommonJS 완성형)
const webpush = require("web-push");
const fetch = require("node-fetch");
const { CONFIG } = require("./config.js");

// 🔑 VAPID 키 (record.html의 applicationServerKey와 publicKey 반드시 동일!)
const vapidKeys = {
  publicKey: "BI18lvSQsbHQtOQq7r7E5kx_nHAC9pvHdjgN16yTd2cs38vQgbniDUiOnV6ja8OceKY9ku_q2RyC1owPsfghJeE",              
  privateKey: "KQ0kaZqVbLbQqZn6dF-hD6Fazr0xHfn8xXLPfx3xL5A"
};

webpush.setVapidDetails(
  "mailto:admin@prayteam.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// ✅ Netlify Function entry point
exports.handler = async function (event) {
  try {
    const { title, message, icon, groupId } = JSON.parse(event.body || "{}");

    if (!groupId) {
      console.error("❌ groupId 누락");
      return { statusCode: 400, body: JSON.stringify({ error: "missing groupId" }) };
    }

    // 1️⃣ 그룹의 구독목록 가져오기
    const subsUrl = `${CONFIG.GAS_URL}?mode=getSubs&groupId=${groupId}`;
    const res = await fetch(subsUrl);
    const subs = await res.json();

    if (!Array.isArray(subs) || subs.length === 0) {
      console.log("⚠️ 구독자 없음");
      return { statusCode: 200, body: JSON.stringify({ success: false, message: "no subscribers" }) };
    }

    console.log(`📢 푸시 알림 시작: ${groupId} (${subs.length}명)`);

    let successCount = 0, failCount = 0;
    const results = [];

    // 2️⃣ 각 구독자에게 푸시 발송
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub, JSON.stringify({
          title,
          message,
          icon,
          groupId
        }));
        successCount++;
      } catch (err) {
        failCount++;
        const code = err.statusCode || err.code || "unknown";
        console.error("❌ 푸시 실패:", code, err.message);
        results.push({ endpoint: sub.endpoint, code, error: err.message });

        // 🔥 410 Gone → 만료된 구독 자동 삭제
        if (code === 410 || code === 404) {
          console.log("🗑️ 만료된 구독 제거 요청:", sub.endpoint);
          try {
            await fetch(`${CONFIG.GAS_URL}?mode=deleteSub`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: sub.endpoint })
            });
          } catch (delErr) {
            console.warn("⚠️ 구독 삭제 실패:", delErr.message);
          }
        }

        // 🚫 403 Unauthorized → 키 불일치 가능성 표시
        if (code === 403) {
          console.warn("🚫 인증 불일치 (VAPID 키 또는 도메인 확인 필요)");
        }
      }
    }

    // 3️⃣ 결과 요약
    console.log(`✅ 발송 완료: ${successCount}명 성공 / ${failCount}명 실패`);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, successCount, failCount, results })
    };

  } catch (err) {
    console.error("❌ notify.js 실행 오류:", err.message);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: err.message }) };
  }
};
