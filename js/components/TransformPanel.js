
window.TransformPanel = ({ 
    transform, 
    onUpdateTransform, 
    dpi, 
    onDPIChange, 
    activeProductId,
    isActive
}) => {
    if (!isActive) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                <window.Icon name="mouse-pointer-click" className="w-8 h-8 opacity-50 mb-2" />
                <p className="text-sm">Выберите мокап, чтобы настроить его положение</p>
            </div>
        );
    }

    const t = {
        x: Number.isFinite(transform?.x) ? transform.x : 0,
        y: Number.isFinite(transform?.y) ? transform.y : 0,
        scale: Math.min(10, Math.max(0.05, Number.isFinite(transform?.scale) ? transform.scale : 0.5)),
        rotation: Number.isFinite(transform?.rotation) ? transform.rotation : 0,
    };

    const rotateBy = (deg) => {
        const nextRotation = (t.rotation || 0) + deg;
        onUpdateTransform({ ...t, rotation: nextRotation });
    };

    return (
        <div className="flex flex-col gap-4 p-4 text-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase">Трансформация</h3>
            
            {/* Навигация (Стрелки) */}
            <div className="flex justify-center">
                <div className="grid grid-cols-3 grid-rows-3 gap-0.5 bg-slate-800/80 border border-slate-700 rounded-lg p-1 shadow-lg">
                    <button onClick={() => onUpdateTransform({ ...t, y: t.y - 10 })} className="p-2 col-start-2 row-start-1 text-slate-200 hover:text-white bg-slate-700/50 rounded" title="Сместить вверх">
                        <window.Icon name="arrow-up" className="w-4 h-4" />
                    </button>
                    <button onClick={() => onUpdateTransform({ ...t, x: t.x - 10 })} className="p-2 col-start-1 row-start-2 text-slate-200 hover:text-white bg-slate-700/50 rounded" title="Сместить влево">
                        <window.Icon name="arrow-left" className="w-4 h-4" />
                    </button>
                    <button onClick={() => onUpdateTransform({ ...t, x: 0, y: 0 })} className="p-2 col-start-2 row-start-2 text-slate-200 hover:text-white bg-slate-700/50 rounded" title="Центрировать">
                        <window.Icon name="move" className="w-4 h-4" />
                    </button>
                    <button onClick={() => onUpdateTransform({ ...t, x: t.x + 10 })} className="p-2 col-start-3 row-start-2 text-slate-200 hover:text-white bg-slate-700/50 rounded" title="Сместить вправо">
                        <window.Icon name="arrow-right" className="w-4 h-4" />
                    </button>
                    <button onClick={() => onUpdateTransform({ ...t, y: t.y + 10 })} className="p-2 col-start-2 row-start-3 text-slate-200 hover:text-white bg-slate-700/50 rounded" title="Сместить вниз">
                        <window.Icon name="arrow-down" className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Вращение */}
            <div className="space-y-2">
                <label className="text-xs text-slate-400">Вращение</label>
                <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg p-1 shadow-lg justify-center">
                    <button onClick={() => rotateBy(-90)} className="p-2 text-slate-200 hover:text-white flex-1 flex justify-center" title="Повернуть -90°">
                        <window.Icon name="rotate-ccw" className="w-4 h-4" />
                        <span className="text-[10px] ml-1">-90°</span>
                    </button>
                    <button onClick={() => rotateBy(-1)} className="p-2 text-slate-200 hover:text-white flex-1 flex justify-center" title="Повернуть -1°">
                        <window.Icon name="rotate-ccw" className="w-4 h-4" />
                    </button>
                    <button onClick={() => onUpdateTransform({ ...t, rotation: 0 })} className="p-2 text-slate-200 hover:text-white flex-1 flex justify-center" title="Сбросить поворот">
                        <window.Icon name="refresh-ccw" className="w-4 h-4" />
                    </button>
                    <button onClick={() => rotateBy(1)} className="p-2 text-slate-200 hover:text-white flex-1 flex justify-center" title="Повернуть +1°">
                        <window.Icon name="rotate-cw" className="w-4 h-4" />
                    </button>
                    <button onClick={() => rotateBy(90)} className="p-2 text-slate-200 hover:text-white flex-1 flex justify-center" title="Повернуть +90°">
                        <window.Icon name="rotate-cw" className="w-4 h-4" />
                        <span className="text-[10px] ml-1">+90°</span>
                    </button>
                </div>
            </div>

            {/* Масштаб */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Масштаб</span>
                    <span className="tabular-nums">{Math.round(t.scale * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0.05" max="10" step="0.01"
                    value={t.scale}
                    onChange={(e) => onUpdateTransform({ ...t, scale: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-400 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>

            {/* Сброс */}
            <button
                onClick={() => onUpdateTransform({ ...t, scale: 1, rotation: 0, x: 0, y: 0 })}
                className="w-full py-2 bg-slate-700/50 hover:bg-red-500/20 text-slate-300 hover:text-red-300 rounded-lg border border-slate-600 hover:border-red-500/50 transition-colors flex items-center justify-center gap-2"
                title="Сбросить все"
            >
                <window.Icon name="x-circle" className="w-4 h-4" />
                <span className="text-sm">Сбросить трансформацию</span>
            </button>

            {/* DPI (если доступно) */}
            {onDPIChange && (
                <div className="space-y-2 pt-4 border-t border-slate-700">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>DPI</span>
                        <span className="tabular-nums">{dpi || 300}</span>
                    </div>
                    <input
                        type="range"
                        min="72" max="600" step="1"
                        value={dpi || 300}
                        onChange={(e) => onDPIChange(parseInt(e.target.value))}
                        className="w-full accent-indigo-400 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            )}
        </div>
    );
};
