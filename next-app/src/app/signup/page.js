import SignupForm from '@/components/SignupForm';

export default function SignupPage() {
    return (
        <main className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center bg-white">
            <header className="text-center mb-8 space-y-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                    PRAY <span className="text-blue-600">TEAM</span>
                </h1>
                <p className="text-slate-500 font-bold text-lg italic">반드시 응답하시는 하나님</p>
            </header>
            <SignupForm />
        </main>
    );
}
