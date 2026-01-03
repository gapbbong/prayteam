'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { gasClient } from '@/lib/gasClient';
import LoadingDots from '@/components/LoadingDots';

export default function SignupForm() {
    const router = useRouter();
    const { login } = useAuth();
    const [id, setId] = useState('');
    const [pwd, setPwd] = useState('');
    const [pwdConfirm, setPwdConfirm] = useState('');
    const [email, setEmail] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!id || !pwd || !pwdConfirm || !email) {
            setError('모든 정보를 입력해주세요.');
            return;
        }
        if (!email.includes('@') || !email.includes('.')) {
            setError('올바른 이메일 형식이 아닙니다. (@와 . 포함)');
            return;
        }
        if (pwd !== pwdConfirm) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }
        if (pwd.length < 4) {
            setError('비밀번호는 4자리 이상이어야 합니다.');
            return;
        }

        setLoading(true);
        try {
            const res = await gasClient.signup(id, pwd, email);
            if (res.success) {
                // Auto Login
                const loginRes = await login(id, pwd);
                if (loginRes.success) {
                    router.push('/');
                } else {
                    alert('회원가입은 완료되었으나 자동 로그인에 실패했습니다. 로그인해 주세요.');
                    router.push('/');
                }
            } else {
                setError(res.message || '회원가입에 실패했습니다.');
            }
        } catch (err) {
            console.error(err);
            setError(err.message || '서버 통신 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">새 계정 만들기</h2>
                <p className="text-slate-500 mt-1 font-medium text-sm">기도팀 관리자(리더) 계정을 생성합니다</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1">아이디</label>
                    <input
                        type="text"
                        value={id}
                        onChange={(e) => setId(e.target.value.toLowerCase())}
                        disabled={loading}
                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl outline-none transition-all font-medium text-slate-800 disabled:opacity-50"
                        placeholder="아이디 입력"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1">비밀번호</label>
                    <input
                        type="password"
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                        disabled={loading}
                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl outline-none transition-all font-medium text-slate-800 disabled:opacity-50"
                        placeholder="비밀번호 (4자리 이상)"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1">비밀번호 확인</label>
                    <input
                        type="password"
                        value={pwdConfirm}
                        onChange={(e) => setPwdConfirm(e.target.value)}
                        disabled={loading}
                        className={`w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl outline-none transition-all font-medium text-slate-800 disabled:opacity-50 ${pwd && pwdConfirm && pwd !== pwdConfirm ? 'border-red-300 focus:border-red-500' : 'focus:border-blue-500 focus:bg-white'
                            }`}
                        placeholder="비밀번호 재입력"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1">이메일 (필수)</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl outline-none transition-all font-medium text-slate-800 disabled:opacity-50"
                        placeholder="email@example.com"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 animate-in shake-1">
                        <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        <p className="text-red-700 text-xs font-bold">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black text-lg shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                >
                    {loading ? <LoadingDots label="" /> : '가입하기'}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button
                    onClick={() => router.push('/')}
                    className="text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                >
                    ← 로그인으로 돌아가기
                </button>
            </div>
        </div>
    );
}
