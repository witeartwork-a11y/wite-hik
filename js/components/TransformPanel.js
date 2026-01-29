
window.TransformPanel = ({ 
    transform, 
    onUpdateTransform, 
    dpi, 
    onDPIChange, 
    activeProductId,
    isActive,
    mockupsPerRow,
    setMockupsPerRow,
    presets,
    onSavePreset,
    onDeletePreset,
    onApplyPreset,
    saveStatus = 'saved', // 'saved' | 'saving' | 'error'
    selectedPrint,
    onForceLoadConfig
}) => {
    const [presetName, setPresetName] = React.useState('');
    const [copyStatus, setCopyStatus] = React.useState('idle'); // 'idle' | 'success'
    const [pasteStatus, setPasteStatus] = React.useState('idle'); // 'idle' | 'success'

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

    const handleSaveClick = () => {
        if (!presetName.trim()) return alert('Введите имя конфига');
        onSavePreset(presetName.trim());
        setPresetName('');
    };

    const copyTransform = () => {
        const data = JSON.stringify({ x: t.x, y: t.y, scale: t.scale, rotation: t.rotation });
        navigator.clipboard.writeText(data).then(() => {
            setCopyStatus('success');
            setTimeout(() => setCopyStatus('idle'), 1000);
        });
    };

    const pasteTransform = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const data = JSON.parse(text);
            if (typeof data.x === 'number' && typeof data.y === 'number' && typeof data.scale === 'number') {
                onUpdateTransform({ ...t, ...data });
                setPasteStatus('success');
                setTimeout(() => setPasteStatus('idle'), 1000);
            }
        } catch (e) {
            console.error('Failed to paste transform', e);
            alert('Неверный формат данных в буфере обмена');
        }
    };

    return (
        <div className="flex flex-col gap-3 p-3 text-slate-200">
            {/* Статус сохранения (перенесен в левый нижний угол сайта) */}
            {(saveStatus === 'saving' || saveStatus === 'error') && ReactDOM.createPortal(
                <div className={`fixed bottom-4 left-4 z-[9999] flex items-center gap-2 px-4 py-2 text-sm rounded-lg shadow-xl border transition-all duration-300 ${
                    saveStatus === 'saving' 
                        ? 'bg-slate-900/90 text-blue-400 border-blue-500/30' 
                        : 'bg-slate-900/90 text-red-400 border-red-500/30'
                }`}>
                    <window.Icon name={saveStatus === 'saving' ? "loader-2" : "alert-circle"} className={`w-4 h-4 ${saveStatus === 'saving' ? "animate-spin" : ""}`}/>
                    <span>{saveStatus === 'saving' ? "Сохранение..." : "Ошибка сохранения"}</span>
                </div>,
                document.body
            )}

            {/* Кнопка для принудительной загрузки конфига */}
            {selectedPrint && onForceLoadConfig && (
                <button
                    onClick={onForceLoadConfig}
                    className="w-full px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs rounded border border-purple-500/30 transition-colors"
                    title="Если вы внесли изменения, эта кнопка вернет состояние к последнему сохранению"
                >
                    <window.Icon name="refresh-cw" className="w-3 h-3 inline mr-1"/>
                    Сбросить к сохраненным
                </button>
            )}
            {/* Мокапов в строку - Всегда доступно */}
            {setMockupsPerRow && (
                <div className="space-y-2 pb-4 border-b border-slate-700">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase">
                        <window.Icon name="layout-grid" className="w-3 h-3" />
                        <span>Мокапов в строку</span>
                    </div>
                    <div className="flex gap-1">
                        {[1, 2, 3].map(num => (
                            <button
                                key={num}
                                onClick={() => setMockupsPerRow(num)}
                                className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                                    mockupsPerRow === num
                                        ? 'bg-indigo-500 text-white shadow'
                                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!isActive ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-10 text-center opacity-50">
                    <window.Icon name="mouse-pointer-click" className="w-8 h-8 mb-2" />
                    <p className="text-sm">Выберите мокап</p>
                </div>
            ) : (
                <>
                    <h3 className="text-xs font-bold text-slate-400 uppercase">Трансформация</h3>
                    
                    {/* Навигация (Стрелки) */}
                    <div className="flex items-center justify-center gap-2">
                         {/* Кнопки копирования/вставки */}
                        <div className="flex flex-col gap-1">
                            <button 
                                onClick={copyTransform}
                                className={`p-2 bg-slate-800 border border-slate-700 rounded transition-colors ${
                                    copyStatus === 'success' ? 'text-green-400 border-green-500/50' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Копировать трансформацию"
                            >
                                <window.Icon name={copyStatus === 'success' ? "check" : "copy"} className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={pasteTransform}
                                className={`p-2 bg-slate-800 border border-slate-700 rounded transition-colors ${
                                    pasteStatus === 'success' ? 'text-green-400 border-green-500/50' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Вставить трансформацию"
                            >
                                <window.Icon name={pasteStatus === 'success' ? "check" : "clipboard"} className="w-4 h-4" />
                            </button>
                        </div>
                        
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
                        <div className="flex justify-between items-center text-xs text-slate-400">
                            <label>Вращение</label>
                            <div className="flex items-center bg-slate-800 rounded px-1">
                                <input
                                    type="number"
                                    value={Math.round(t.rotation)}
                                    onChange={(e) => onUpdateTransform({ ...t, rotation: parseFloat(e.target.value) })}
                                    className="w-12 bg-transparent text-right text-xs text-slate-200 border-none focus:ring-0 p-0.5"
                                />
                                <span className="text-xs text-slate-500 ml-0.5">°</span>
                            </div>
                        </div>
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
                            <div className="flex items-center bg-slate-800 rounded px-1">
                                <input
                                    type="number"
                                    min="5" max="1000"
                                    value={Math.round(t.scale * 100)}
                                    onChange={(e) => onUpdateTransform({ ...t, scale: parseFloat(e.target.value) / 100 })}
                                    className="w-12 bg-transparent text-right text-xs text-slate-200 border-none focus:ring-0 p-0.5"
                                />
                                <span className="text-xs text-slate-500 ml-0.5">%</span>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="0.05" max="10" step="0.01"
                            value={t.scale}
                            onChange={(e) => onUpdateTransform({ ...t, scale: parseFloat(e.target.value) })}
                            className="w-full accent-indigo-400 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* DPI (если доступно) */}
                    {onDPIChange && (
                        <div className="space-y-1 pt-2 border-t border-slate-800">
                            <div className="flex justify-between items-center text-[10px] text-slate-500">
                                <span>DPI</span>
                                <input
                                    type="number"
                                    min="72" max="600" step="1"
                                    value={dpi || 300}
                                    onChange={(e) => onDPIChange(parseInt(e.target.value))}
                                    className="w-12 bg-slate-800 text-right text-[10px] text-slate-500 border border-slate-700 rounded px-1 py-0.5 focus:border-slate-500 outline-none"
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* Сброс */}
                    <button
                        onClick={() => onUpdateTransform({ ...t, scale: 1, rotation: 0, x: 0, y: 0 })}
                        className="w-full py-2 bg-slate-700/50 hover:bg-red-500/20 text-slate-300 hover:text-red-300 rounded-lg border border-slate-600 hover:border-red-500/50 transition-colors flex items-center justify-center gap-2"
                        title="Сбросить все"
                    >
                        <window.Icon name="x-circle" className="w-4 h-4" />
                        <span className="text-sm">Сбросить трансформацию</span>
                    </button>
                </>
            )}

            {/* Конфигурация / Пресеты */}
            {onSavePreset && (
                <div className="border-t border-slate-700 pt-4 space-y-4">
                     <h3 className="text-xs font-bold text-slate-400 uppercase">Сохранить конфиг</h3>
                     <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 outline-none"
                            placeholder="Название конфига"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveClick()}
                        />
                        <button 
                            onClick={handleSaveClick}
                            className="shrink-0 px-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm font-medium"
                        >
                            <window.Icon name="save" className="w-4 h-4" />
                        </button>
                     </div>

                     {presets && Object.keys(presets).length > 0 && (
                         <div className="space-y-2">
                             <div className="text-xs text-slate-500">Сохраненные конфиги:</div>
                             <div className="flex flex-wrap gap-2">
                                 {Object.keys(presets).map(name => (
                                     <div key={name} className="flex items-center group bg-slate-800 border border-slate-700 rounded overflow-hidden">
                                         <button 
                                            onClick={() => onApplyPreset(name)}
                                            className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                            title="Применить конфиг"
                                         >
                                             {name}
                                         </button>
                                         <button 
                                            onClick={() => onDeletePreset(name)}
                                            className="px-1.5 py-1 text-slate-600 hover:text-red-400 hover:bg-slate-700 border-l border-slate-700 transition-colors"
                                            title="Удалить"
                                         >
                                             <window.Icon name="x" className="w-3 h-3" />
                                         </button>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     )}
                </div>
            )}
        </div>
    );
};
