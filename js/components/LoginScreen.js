// js/components/LoginScreen.js
const { useState } = React;
const { Lock, ArrowRight, AlertCircle, Wand2 } = lucide;

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
                setTimeout(() => onLogin(password), 500); // Small delay for effect
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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0"></div>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse-slow"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse-slow" style={{animationDelay: '1s'}}></div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-10 rounded-3xl w-full max-w-md shadow-2xl relative z-10 animate-fade-in">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
                         <window.Icon name="wand-2" className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">Wite-Hik</h1>
                    <p className="text-slate-400 mt-3 font-medium">Конструктор макетов</p>
                </div>

                {/* Error Banner */}
                {status === 'error' && (
                    <div className="bg-red-500/10 text-red-300 p-4 rounded-xl mb-6 text-sm text-center border border-red-500/20 flex items-center justify-center gap-2">
                        <window.Icon name="alert-circle" className="w-4 h-4" />
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Пароль доступа</label>
                        <input 
                            type="password" 
                            className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl px-5 py-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder-slate-600"
                            value={password}
                            onChange={e => {setPassword(e.target.value); setStatus('idle')}}
                            placeholder="Введите пароль"
                            autoFocus
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={status === 'loading'}
                        className="w-full py-4 text-lg bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-colors shadow-xl shadow-blue-900/20 mt-4 flex items-center justify-center gap-2"
                    >
                        {status === 'loading' ? (
                            'Вход...'
                        ) : (
                            <>
                                Войти <window.Icon name="arrow-right" className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
                
                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-500">
                        Restricted Access System
                    </p>
                </div>
            </div>
        </div>
    );
};