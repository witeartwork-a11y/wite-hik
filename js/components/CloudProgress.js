window.CloudProgress = ({ progress, isVisible }) => {
    if (!isVisible || !progress.total) return null;
    
    const percentage = Math.round((progress.done / progress.total) * 100);
    
    return (
        <div className="fixed bottom-4 left-4 bg-slate-900 border border-indigo-500 rounded-lg p-4 shadow-lg max-w-xs z-50 fade-in">
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Сохранение в облако</h3>
                    <span className="text-xs text-indigo-400 font-mono">{progress.done}/{progress.total}</span>
                </div>
                
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
                
                <div className="text-xs text-slate-400">
                    <p className="truncate">{progress.current || 'Инициализация...'}</p>
                    <p className="text-slate-500 mt-1">{percentage}% завершено</p>
                </div>
            </div>
        </div>
    );
};
