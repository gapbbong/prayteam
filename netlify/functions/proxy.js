// 🔹 proxy.js (CommonJS 버전)
const fetch = require("node-fetch");
const { CONFIG } = require("./config.js");
const GAS_URL = CONFIG.GAS_URL;

exports.handler = async function (event) {
  let query = event.rawQuery ? "?" + event.rawQuery : "";
  const method = event.httpMethod || "GET";
  const options = { method };
  if (method === "POST") {
    const bodyData = JSON.parse(event.body || "{}");
    const queryParams = Object.keys(bodyData).map(key => `${key}=${encodeURIComponent(bodyData[key])}`).join('&');
    query = queryParams ? "?" + queryParams : "";
    options.body = JSON.stringify(bodyData);
  }


  // ✅ CORS preflight 처리
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

  try {
    const response = await fetch(`${GAS_URL}${query}`, options);
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
