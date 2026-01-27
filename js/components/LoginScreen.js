// js/components/LoginScreen.js
const { useState } = React;
const { Lock, ArrowRight, AlertCircle } = lucide;

window.LoginScreen = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        try {
            const res = await fetch('/api.php?action=login', {
                method: 'POST',
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (data.success) {
                onLogin(password);
            } else {
                setStatus('error');
                setErrorMsg('Неверный пароль');
            }
        } catch (e) {
            setStatus('error');
            setErrorMsg('Ошибка подключения к API');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
            <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                        <i data-lucide="lock" className="text-indigo-400 w-8 h-8"></i>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Wite-Hik Access</h1>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="password" value={password} onChange={e => {setPassword(e.target.value); setStatus('idle')}} 
                        placeholder="Пароль доступа" autoFocus
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all" />
                    
                    {status === 'error' && (
                        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                           <span>{errorMsg}</span>
                        </div>
                    )}
                    <button type="submit" disabled={status === 'loading'} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                        {status === 'loading' ? 'Вход...' : 'Войти'}
                    </button>
                </form>
            </div>
        </div>
    );
};