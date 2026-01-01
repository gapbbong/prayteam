'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { gasClient } from '@/lib/gasClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        const savedUser = localStorage.getItem('prayteam_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (id, pwd) => {
        try {
            const result = await gasClient.login(id, pwd);
            if (result.success) {
                const userData = {
                    id: id,
                    name: result.name || id,
                    adminId: result.adminId || id
                };
                setUser(userData);
                localStorage.setItem('prayteam_user', JSON.stringify(userData));
                return { success: true };
            } else {
                throw new Error(result.message || '로그인에 실패했습니다.');
            }
        } catch (error) {
            window.dispatchEvent(new CustomEvent('app-error', { detail: error.message }));
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('prayteam_user');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
