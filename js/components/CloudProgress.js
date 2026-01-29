window.CloudProgress = ({ progress, isVisible }) => {
    if (!isVisible || !progress.total) return null;
    
    const percentage = Math.round((progress.done / progress.total) * 100);
    
    return (
        <div className="notification fade-in">
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Сохранение в облако</h3>
                    <span className="text-xs text-indigo-400 font-mono">{progress.done}/{progress.total}</span>
                </div>
                
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
                </div>
                
                <div className="text-xs text-slate-400">
                    <p className="truncate">{progress.current || 'Инициализация...'}</p>
                    <p className="text-slate-500 mt-1">{percentage}% завершено</p>
                </div>
            </div>
        </div>
    );
};
