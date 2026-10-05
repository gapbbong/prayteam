'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import Toast from '@/components/Toast';

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);
    const timerRef = useRef(null);

    const showToast = useCallback((message, type = 'success', duration = 3000, large = false) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setToast({ message, type, large });
        timerRef.current = setTimeout(() => {
            setToast(null);
            timerRef.current = null;
        }, duration);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    large={toast.large}
                    onClose={() => setToast(null)}
                />
            )}
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
