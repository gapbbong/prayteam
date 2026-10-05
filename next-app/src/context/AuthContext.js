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
                    const parsed = JSON.parse(savedCreds);
                    // 신형(b64) + 구형(평문) 모두 읽기
                    let id = parsed.id;
                    let pwd = parsed.pwd;
                    if (parsed.b64) {
                        try {
                            const decoded = JSON.parse(atob(parsed.b64));
                            id = decoded.id;
                            pwd = decoded.pwd;
                        } catch { /* 구형으로 폴백 */ }
                    }
                    if (id && pwd) {
                        const normId = String(id).toLowerCase().trim();
                        // [FIX] 낙관적 자동로그인: 검증 응답(약 10초)을 기다리지 않고 먼저 진입.
                        // 그룹 목록과 검증을 병렬로 수행해 첫 화면 시간을 단축.
                        setUser({ id: normId, name: normId, adminId: normId });
                        setLoading(false);
                        try {
                            const result = await gasClient.login(normId, pwd);
                            if (result.success) {
                                setUser({
                                    id: normId,
                                    name: result.name || normId,
                                    adminId: result.adminId || normId
                                });
                                // Session is valid
                            } else {
                                // Invalid credentials
                                localStorage.removeItem('prayteam_creds');
                                setUser(null);
                            }
                        } catch {
                            // 네트워크 실패 시에는 낙관적 세션 유지 (그룹 로딩이 자체 재시도함)
                        }
                        return;
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
            const normId = String(id || '').toLowerCase().trim();
            const result = await gasClient.login(normId, pwd);
            if (result.success) {
                const userData = {
                    id: normId,
                    name: result.name || normId,
                    adminId: result.adminId || normId
                };
                setUser(userData);
                // 자동로그인용 저장 (평문 노출 방지: base64 난독화 + 구형 키 정리)
                try {
                    localStorage.setItem('prayteam_creds', JSON.stringify({ b64: btoa(JSON.stringify({ id: normId, pwd })) }));
                } catch {
                    localStorage.setItem('prayteam_creds', JSON.stringify({ id: normId, pwd }));
                }
                localStorage.setItem('prayteam_user', JSON.stringify(userData)); // Backward compatibility
                return { success: true };
            } else {
                throw new Error(result.message || '로그인에 실패했습니다.');
            }
        } catch (error) {
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                window.dispatchEvent(new CustomEvent('app-error', { detail: error.message }));
            }
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
