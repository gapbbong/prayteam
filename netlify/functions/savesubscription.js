// ✅ Netlify Functions: saveSubscription.js
const { CONFIG } = require("./config.js");
const GAS_URL = CONFIG.GAS_URL;

exports.handler = async function (event) {
  console.log("🟢 [saveSubscription] 호출됨");

  try {
    const { subscription, groupId } = JSON.parse(event.body);
    console.log("📦 수신 데이터:", { groupId, endpoint: subscription?.endpoint });

    // ✅ Google Apps Script로 전달
    const response = await fetch(`${GAS_URL}?mode=saveSub&groupId=${groupId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    const text = await response.text();
    console.log("📩 GAS 응답(raw):", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, raw: text };
    }

    console.log("✅ [saveSubscription] 최종 응답:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("❌ [saveSubscription] 오류:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: err.message }),
    };
  }
}
