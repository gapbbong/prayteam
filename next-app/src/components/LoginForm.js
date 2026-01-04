'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingDots from '@/components/LoadingDots';

export default function LoginForm() {
    const router = useRouter();
    const { login } = useAuth();
    const [id, setId] = useState('');
    const [pwd, setPwd] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!id || !pwd) {
            setError('아이디와 비밀번호를 입력해 주세요.');
            return;
        }

        setLoading(true);
        setError('');

        const result = await login(id, pwd);

        if (!result.success) {
            setError(result.error || '로그인에 실패했습니다. 정보를 확인해 주세요.');
            setLoading(false);
        }
        // If success, AuthContext will update user and Home page will re-render
    };

    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl flex-shrink-0 animate-bounce-subtle">
                    <span className="text-4xl">🙏</span>
                </div>
                <div className="flex-1 text-left">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">반갑습니다^^</h2>
                    <p className="text-slate-500 mt-1 font-medium">기도팀 서비스에 오신 것을 환영합니다</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 ml-1">아이디</label>
                    <input
                        type="text"
                        value={id}
                        onChange={(e) => setId(e.target.value.toLowerCase())}
                        disabled={loading}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-medium text-slate-800 disabled:opacity-50"
                        placeholder="아이디를 입력하세요"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 ml-1">비밀번호</label>
                    <input
                        type="password"
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                        disabled={loading}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-medium text-slate-800 disabled:opacity-50"
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in shake-1">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-red-700 text-sm font-bold leading-tight">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:scale-100 disabled:hover:shadow-xl"
                >
                    {loading ? (
                        <LoadingDots label="" />
                    ) : (
                        "로그인"
                    )}
                </button>

                <div className="flex justify-center gap-4 text-sm font-bold text-slate-400 mt-4">
                    <button
                        type="button"
                        onClick={() => router.push('/find-id')}
                        className="hover:text-blue-600 transition-colors"
                    >
                        아이디 찾기
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                        type="button"
                        onClick={() => router.push('/find-pwd')}
                        className="hover:text-blue-600 transition-colors"
                    >
                        비밀번호 찾기
                    </button>
                </div>
            </form>
        </div>
    );
}
