import { gasClient } from '@/lib/gasClient';

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

// 저장 후 푸시 발송 제어 (10분 쿨다운: 같은 멤버의 연속 저장은 조용히 저장)
// GAS는 저장만 하고 발송은 여기서 결정하므로, 규칙 변경은 프론트 배포로 반영됨.
const NOTIFY_COOLDOWN_MS = 10 * 60 * 1000;

export async function maybeNotifyPrayerSave({ groupId, member, message }) {
    if (typeof window === 'undefined' || !groupId || !member) return false;
    try {
        const key = `prayteam_lastnotify_${groupId}_${member}`;
        const last = parseInt(localStorage.getItem(key) || '0', 10);
        if (Date.now() - last < NOTIFY_COOLDOWN_MS) return false;
        await gasClient.notify({
            groupId,
            title: `${member} 기도 업데이트`,
            message: message || '기도제목 업데이트'
        });
        localStorage.setItem(key, String(Date.now()));
        return true;
    } catch (e) {
        console.warn('Notify skipped/failed:', e?.message || e);
        return false;
    }
}
