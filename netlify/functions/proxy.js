// 🔹 proxy.js (CommonJS 버전)
const fetch = require("node-fetch");
const { CONFIG } = require("./config.js");
const GAS_URL = CONFIG.GAS_URL;

exports.handler = async function (event) {
  const method = event.httpMethod || "GET";

  // ✅ CORS preflight 처리 (body 파싱보다 먼저)
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "OK",
    };
  }

  let query = "";

  if (event.rawQuery) {
    query = "?" + event.rawQuery;
  } else if (event.queryStringParameters) {
    const qp = new URLSearchParams(event.queryStringParameters).toString();
    if (qp) query = "?" + qp;
  }

  const options = { method };
  if (method === "POST") {
    // GAS는 e.postData.contents(JSON body)에서 mode를 읽으므로
    // body를 쿼리로 펼치지 않는다 (중첩객체 깨짐 + URI肥大 방지)
    let bodyData = {};
    try {
      bodyData = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ success: false, message: "invalid JSON body" }),
      };
    }
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(bodyData);
  }

  const targetUrl = `${GAS_URL}${query}`;
  // 비밀번호 등 민감 쿼리 마스킹 후 로깅
  console.log(`[Proxy] Forwarding ${method} to: ${targetUrl.replace(/(pwd|password)=[^&]*/gi, '$1=***')}`);

  try {
    const response = await fetch(targetUrl, options);
    const text = await response.text();

    let body;
    try {
      body = JSON.stringify(JSON.parse(text));
    } catch {
      body = JSON.stringify({ message: text });
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body,
    };
  } catch (err) {
    console.error("❌ Proxy Error:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
