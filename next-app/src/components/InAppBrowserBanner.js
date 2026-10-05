'use client';

import { useEffect, useState } from 'react';

function detectInApp() {
    if (typeof navigator === 'undefined') return null;
    const ua = navigator.userAgent || '';
    if (/KAKAOTALK/i.test(ua)) return 'kakao';
    if (/NAVER\(inapp\)|NAVER/i.test(ua)) return 'naver';
    if (/Instagram|FBAV|FBAN|Line\/|Daum/i.test(ua)) return 'inapp';
    return null;
}

export const INAPP_HASH_PARAM = '__kakaohash';

// 인앱 탈출 후 쿼리로 전달된 해시(#members?groupId=...)를 복원
export function restoreCarriedHash() {
    try {
        const url = new URL(window.location.href);
        const carried = url.searchParams.get(INAPP_HASH_PARAM);
        if (carried) {
            url.searchParams.delete(INAPP_HASH_PARAM);
            window.history.replaceState(
                window.history.state,
                '',
                url.pathname + (url.search ? '?' + url.searchParams.toString() : '')
            );
            if (!window.location.hash) {
                window.location.hash = carried.startsWith('#') ? carried : `#${carried}`;
            }
        }
    } catch {
        /* 무시 */
    }
}

export default function InAppBrowserBanner() {
    const [app, setApp] = useState(null);
    const [dismissed, setDismissed] = useState(true);
    const [isAndroid, setIsAndroid] = useState(false);

    useEffect(() => {
        setApp(detectInApp());
        setDismissed(sessionStorage.getItem('prayteam_inapp_dismissed') === '1');
        setIsAndroid(/Android/i.test(navigator.userAgent || ''));
    }, []);

    if (!app || dismissed) return null;

    const openExternal = () => {
        try {
            const u = new URL(window.location.href);
            if (u.hash) {
                u.searchParams.set(INAPP_HASH_PARAM, u.hash);
                u.hash = '';
            }
            const target = u.toString().replace(/^https?:\/\//, '');
            window.location.href = `intent://${target}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
        } catch {
            /* 무시 */
        }
    };

    const dismiss = () => {
        sessionStorage.setItem('prayteam_inapp_dismissed', '1');
        setDismissed(true);
    };

    const appName = app === 'kakao' ? '카카오톡' : app === 'naver' ? '네이버' : '인앱';

    return (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-slate-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-slate-200">
            <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <p className="flex-1 text-[13px] font-bold leading-snug">
                    {appName} 인앱에서는 알림·공유 등 일부 기능이 제한됩니다.
                    {isAndroid ? ' 크롬으로 열면 정상 이용 가능합니다.' : ' Safari(외부 브라우저)로 열면 정상 이용 가능합니다.'}
                </p>
                <button
                    onClick={dismiss}
                    className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                    aria-label="닫기"
                >
                    ✕
                </button>
            </div>
            <div className="mt-2 flex gap-2">
                {isAndroid ? (
                    <button
                        onClick={openExternal}
                        className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-black text-white active:scale-[0.98]"
                    >
                        🌐 외부 브라우저로 열기
                    </button>
                ) : (
                    <p className="flex-1 text-center text-xs font-bold text-amber-700 dark:text-amber-300">
                        하단 ••• 메뉴 → Safari(외부 브라우저)로 열기를 눌러주세요
                    </p>
                )}
            </div>
        </div>
    );
}
