'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '@/components/Toast';

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success', duration = 3000) => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, duration);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
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
