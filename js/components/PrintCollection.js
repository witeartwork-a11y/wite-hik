// js/components/PrintCollection.js
window.PrintCollection = ({ 
    prints, 
    selectedPrints, 
    onAddPrint, 
    onSelectPrint, 
    onRemovePrint, 
    onUpdateArticle,
    onSaveToCloud,
    isSaving
}) => {
    const { useState } = React;
    const [editingId, setEditingId] = useState(null);
    const [editingValue, setEditingValue] = useState('');

    const handleEditArticle = (print) => {
        setEditingId(print.id);
        setEditingValue(print.article || print.name.split('.')[0]);
    };

    const handleSaveArticle = (print) => {
        if (editingValue.trim()) {
            onUpdateArticle(print.id, editingValue.trim());
        }
        setEditingId(null);
    };

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase">Принты на облако</h3>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">
                    {selectedPrints.length}
                </span>
            </div>

            {prints.length === 0 ? (
                <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-lg">
                    <i data-lucide="inbox" className="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                    <p className="text-sm">Нет добавленных принтов</p>
                </div>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
                    {prints.map((print) => (
                        <div 
                            key={print.id}
                            className={`
                                p-3 rounded-lg border transition-all cursor-pointer
                                ${selectedPrints.includes(print.id)
                                    ? 'bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500/30'
                                    : 'bg-slate-700/30 border-slate-700 hover:border-slate-600'
                                }
                            `}
                            onClick={() => onSelectPrint(print.id)}
                        >
                            {/* Информация о принте */}
                            <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <input
                                    type="checkbox"
                                    checked={selectedPrints.includes(print.id)}
                                    onChange={() => {}}
                                    className="mt-1 w-4 h-4 rounded cursor-pointer accent-indigo-500"
                                    onClick={(e) => e.stopPropagation()}
                                />

                                {/* Контент */}
                                <div className="flex-1 min-w-0">
                                    {/* Название файла */}
                                    <p className="text-xs text-slate-400 truncate mb-1">
                                        {print.name}
                                    </p>

                                    {/* Артикул (редактируемый) */}
                                    <div className="mb-2">
                                        {editingId === print.id ? (
                                            <input
                                                type="text"
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                onBlur={() => handleSaveArticle(print)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveArticle(print);
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full bg-slate-900 border border-indigo-500 rounded px-2 py-1 text-sm text-white outline-none"
                                                placeholder="Артикул"
                                            />
                                        ) : (
                                            <div 
                                                className="flex items-center gap-2 group/article"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditArticle(print);
                                                }}
                                            >
                                                <span className="text-sm font-mono bg-slate-900/50 px-2 py-1 rounded text-indigo-300">
                                                    {print.article || print.name.split('.')[0]}
                                                </span>
                                                <i data-lucide="pencil" className="w-3 h-3 text-slate-600 opacity-0 group-hover/article:opacity-100 transition-opacity"></i>
                                            </div>
                                        )}
                                    </div>

                                    {/* Позиция на канве (если была сохранена) */}
                                    {print.positions && (
                                        <div className="text-[10px] text-slate-500 space-y-1">
                                            <p>Сохраненные позиции:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(print.positions).map(([prodId, pos]) => (
                                                    <span key={prodId} className="bg-slate-900/50 px-2 py-0.5 rounded">
                                                        X={pos.x.toFixed(0)}, Y={pos.y.toFixed(0)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Кнопка удаления */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemovePrint(print.id);
                                    }}
                                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors flex-shrink-0"
                                    title="Удалить"
                                >
                                    <i data-lucide="trash-2" className="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Кнопка сохранения в облако */}
            {prints.length > 0 && selectedPrints.length > 0 && (
                <button
                    onClick={() => onSaveToCloud(selectedPrints)}
                    disabled={isSaving}
                    className={`
                        w-full py-2 rounded-lg font-medium text-sm transition-all
                        ${isSaving
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer'
                        }
                    `}
                >
                    {isSaving ? (
                        <div className="flex items-center justify-center gap-2">
                            <i data-lucide="loader-2" className="w-4 h-4 animate-spin"></i>
                            Сохранение...
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <i data-lucide="cloud-upload" className="w-4 h-4"></i>
                            Добавить {selectedPrints.length} {selectedPrints.length === 1 ? 'принт' : 'принтов'} в облако
                        </div>
                    )}
                </button>
            )}
        </div>
    );
};
