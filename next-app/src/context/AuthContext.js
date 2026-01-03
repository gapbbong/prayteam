'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { gasClient } from '@/lib/gasClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const savedCreds = localStorage.getItem('prayteam_creds');
            if (savedCreds) {
                try {
                    const { id, pwd } = JSON.parse(savedCreds);
                    if (id && pwd) {
                        // Auto login attempt
                        const result = await gasClient.login(id, pwd);
                        if (result.success) {
                            const userData = {
                                id: id,
                                name: result.name || id,
                                adminId: result.adminId || id
                            };
                            setUser(userData);
                            // Session is valid
                        } else {
                            // Invalid credentials
                            localStorage.removeItem('prayteam_creds');
                        }
                    }
                } catch (error) {
                    console.error('Auto login failed', error);
                    // On error, we might want to stay logged out
                }
            }
            setLoading(false);
        };
        initAuth();
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
                // Save credentials for auto-login
                localStorage.setItem('prayteam_creds', JSON.stringify({ id, pwd }));
                localStorage.setItem('prayteam_user', JSON.stringify(userData)); // Backward compatibility
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
        localStorage.removeItem('prayteam_creds');
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
