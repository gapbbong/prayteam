'use client';

import { useState, useCallback } from 'react';
import { gasClient } from '@/lib/gasClient';

const VAPID_PUBLIC_KEY = "BI18lvSQsbHQtOQq7r7E5kx_nHAC9pvHdjgN16yTd2cs38vQgbniDUiOnV6ja8OceKY9ku_q2RyC1owPsfghJeE";

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function useNotifications() {
    const [permission, setPermission] = useState(
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
    );

    const subscribe = useCallback(async (groupId) => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push messaging is not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            console.log('Subscribed!', sub);

            // Save subscription to GAS
            await gasClient.saveSub({
                groupId: groupId,
                subscription: sub
            });

            setPermission(Notification.permission);
            return sub;
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            window.dispatchEvent(new CustomEvent('app-error', { detail: '알림 설정에 실패했습니다: ' + error.message }));
        }
    }, []);

    const requestPermission = useCallback(async (groupId) => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            alert('이 브라우저는 알림을 지원하지 않습니다.');
            return;
        }

        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm === 'granted') {
                await subscribe(groupId);
            }
        } catch (err) {
            console.error('Permission request failed', err);
        }
    }, [subscribe]);

    return { permission, requestPermission, subscribe };
}
