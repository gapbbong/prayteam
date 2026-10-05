export function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// SW 등록 보장: ready만 무한정 기다리지 않고, 미등록이면 직접 등록 시도.
// 등록 자체가 실패하면(404/MIME/권한) 진짜 에러가 바로 드러남.
export async function ensurePushRegistration(timeoutMs = 10000) {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        throw new Error('이 브라우저는 푸시 알림을 지원하지 않습니다');
    }
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
    }
    await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('서비스워커 활성화 대기 초과 (앱 재시작 후 재시도)')), timeoutMs)
        )
    ]);
    return reg;
}
