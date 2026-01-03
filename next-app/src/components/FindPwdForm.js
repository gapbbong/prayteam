'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { gasClient } from '@/lib/gasClient';
import LoadingDots from '@/components/LoadingDots';

export default function FindPwdForm() {
    const router = useRouter();
    const [id, setId] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [foundPwd, setFoundPwd] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setFoundPwd(null);

        if (!id || !email) {
            setError('아이디와 이메일을 모두 입력해주세요.');
            return;
        }
        if (!email.includes('@') || !email.includes('.')) {
            setError('올바른 이메일 형식이 아닙니다.');
            return;
        }

        setLoading(true);
        try {
            const res = await gasClient.findPwd(id, email);
            if (res.success && res.password) {
                setFoundPwd(res.password);
            } else {
                setError(res.message || '일치하는 정보를 찾을 수 없습니다.');
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
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">비밀번호 찾기</h2>
                <p className="text-slate-500 mt-1 font-medium text-sm">가입 시 등록한 아이디와 이메일로<br />비밀번호를 확인합니다.</p>
            </div>

            {!foundPwd ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600 ml-1">아이디</label>
                        <input
                            type="text"
                            value={id}
                            onChange={(e) => setId(e.target.value.toLowerCase())}
                            disabled={loading}
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-medium text-slate-800 disabled:opacity-50"
                            placeholder="아이디 입력"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600 ml-1">이메일</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-medium text-slate-800 disabled:opacity-50"
                            placeholder="등록한 이메일 입력"
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
                        className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                    >
                        {loading ? <LoadingDots label="" /> : '비밀번호 찾기'}
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push('/')}
                        className="w-full py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                    >
                        취소
                    </button>
                </form>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-6 text-center">
                        <p className="text-slate-500 font-bold mb-2">회원님의 비밀번호는</p>
                        <p className="text-2xl font-black text-red-600 tracking-wider mb-2">{foundPwd}</p>
                        <p className="text-slate-400 text-xs mt-2 font-medium">입니다.<br />보안을 위해 확인 후 로그인을 진행해주세요.</p>
                    </div>

                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        로그인하러 가기
                    </button>
                </div>
            )}
        </div>
    );
}
