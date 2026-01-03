/* ============================================================
 * PrayTeam PWA Service Worker (2025 iOS + Auto Update 대응)
 * ------------------------------------------------------------
 * ✅ Android / Desktop Chrome / Edge / Safari(macOS)
 * ✅ iOS Safari (홈화면 추가)
 * ✅ 자동 업데이트(버전 변경 시 새 SW 즉시 활성화)
 * ✅ 푸시 수신 + 클릭 동작
 * ✅ 디버깅 로그 강화
 * ============================================================ */
const APP_NAME = "PrayTeam";
const APP_URL = "https://praygroup.creat1324.com";
const ICON_URL = "/images/android-chrome-192x192.png";

// ✅ 자동으로 버전 생성
const SW_VERSION = "v20260103-1625";
const CACHE_NAME = `${APP_NAME}-v${SW_VERSION}`;

// ✅ 캐싱할 기본 파일 목록
const PRECACHE = ['./'];

/* ------------------------------------------------------------
 * INSTALL : 최초 설치 시 캐싱 + 즉시 업데이트
 * ------------------------------------------------------------ */
self.addEventListener("install", (event) => {
  console.log(`[SW] 🚀 설치됨 - ${CACHE_NAME}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of PRECACHE) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            await cache.put(url, res.clone());
            console.log(`[SW] ✅ 캐싱 완료: ${url}`);
          } else {
            console.warn(`[SW] ⚠️ 캐싱 실패 (HTTP ${res.status}): ${url}`);
          }
        } catch (err) {
          console.warn(`[SW] ⚠️ 캐싱 예외 발생: ${url}`, err);
        }
      }
    })
  );
  self.skipWaiting();
});

/* ------------------------------------------------------------
 * ACTIVATE : 오래된 캐시 삭제 + 즉시 제어권 획득
 * ------------------------------------------------------------ */
self.addEventListener("activate", (event) => {
  console.log(`[SW] ✅ 활성화 완료 - ${CACHE_NAME}`);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => {
            console.log(`[SW] 🧹 오래된 캐시 삭제: ${oldKey}`);
            return caches.delete(oldKey);
          })
      )
    )
  );
  self.clients.claim();
});

/* ------------------------------------------------------------
 * FETCH : 오프라인 지원용 기본 캐싱 전략
 * ------------------------------------------------------------ */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            // ⚙️ HTML, CSS, JS, PNG 등만 캐싱
            if (req.url.startsWith(self.location.origin)) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return res;
          })
          .catch(() => cached) // 오프라인 시 캐시로 대체
    )
  );
});

/* ------------------------------------------------------------
 * PUSH : 서버에서 수신한 알림 표시
 * ------------------------------------------------------------ */
self.addEventListener("push", (event) => {
  console.log("[SW] 🔔 Push 이벤트 수신됨");

  if (!event.data) {
    console.warn("[SW] ⚠️ Push 데이터 없음");
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "🙏 새 기도제목", message: "새로운 기도제목이 등록되었습니다." };
  }

  const title = payload.title || "새로운 기도제목";
  const body = payload.message || payload.body || "새로운 기도제목이 등록되었습니다.";

  const options = {
    body,
    icon: ICON_URL,
    badge: ICON_URL,
    data: { url: payload.url || APP_URL },
    vibrate: [200, 100, 200],
    actions: [
      { action: "open", title: "📖 열기" },
      { action: "close", title: "닫기" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log("[SW] ✅ 알림 표시됨:", title))
      .catch((err) => console.error("[SW] ❌ 알림 표시 실패:", err))
  );
});

/* ------------------------------------------------------------
 * NOTIFICATION CLICK : 클릭 시 앱으로 이동
 * ------------------------------------------------------------ */
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] 🖱️ 알림 클릭:", event.notification);
  event.notification.close();

  const targetUrl = event.notification.data?.url || APP_URL;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 🔹 이미 열린 창이 있으면 포커스
      for (const client of clientList) {
        if (client.url.startsWith(APP_URL) && "focus" in client) {
          console.log("[SW] 🔄 기존 창 포커싱");
          return client.focus();
        }
      }
      // 🔹 없으면 새 창 열기
      console.log("[SW] 🆕 새 창 열기:", targetUrl);
      return clients.openWindow(targetUrl);
    })
  );
});

/* ------------------------------------------------------------
 * NOTIFICATION CLOSE : 닫힘 이벤트 (옵션)
 * ------------------------------------------------------------ */
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] 🔕 알림 닫힘:", event.notification?.title);
});

/* ------------------------------------------------------------
 * ERROR HANDLING : 전역 오류 로깅
 * ------------------------------------------------------------ */
self.addEventListener("error", (e) => {
  console.error("[SW] ❌ 오류 발생:", e.message);
});

/* ------------------------------------------------------------
 * UPDATE FLOW : 새 SW 업데이트 자동 적용
 * ------------------------------------------------------------
 * - Netlify에 새 sw.js 배포 시, 즉시 새 버전 활성화
 * - 사용 중 페이지에서도 30초 이내 새 버전 반영
 * ------------------------------------------------------------ */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] ⚡ 새 버전 강제 활성화 요청 수신");
    self.skipWaiting();
  }
});
