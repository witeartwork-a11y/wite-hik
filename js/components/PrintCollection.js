// js/components/PrintCollection.js
window.PrintCollection = ({ 
    prints, 
    selectedPrints, 
    onAddPrint, 
    onSelectPrint, 
    onRemovePrint, 
    onUpdateArticle,
    onSaveToCloud,
    isSaving,
    onSavePreset
}) => {
    const { useState } = React;
    const [editingId, setEditingId] = useState(null);
    const [editingValue, setEditingValue] = useState('');

    const handleEditArticle = (print) => {
        setEditingId(print.id);
        setEditingValue(print.article || print.name.split('.')[0]);
    };

    const handleSaveArticle = (print) => {
        const val = editingValue.trim();
        if (val) {
            onUpdateArticle(print.id, val);
            if (onSavePreset && print.positions) {
                onSavePreset(val, print.positions);
            }
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
                    <window.Icon name="inbox" className="w-8 h-8 mx-auto mb-2 opacity-50" />
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
                            <div className="flex items-center gap-3">
                                {/* Checkbox */}
                                <input
                                    type="checkbox"
                                    checked={selectedPrints.includes(print.id)}
                                    onChange={() => {}}
                                    className="w-4 h-4 rounded cursor-pointer accent-indigo-500"
                                    onClick={(e) => e.stopPropagation()}
                                />

                                {/* Миниатюра */}
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 flex-shrink-0">
                                    <img src={print.thumb || print.url} className="w-full h-full object-cover" />
                                </div>

                                {/* Контент */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    {/* Название файла */}
                                    <p className="text-xs text-slate-400 truncate">
                                        {print.name}
                                    </p>

                                    {/* Артикул (редактируемый) */}
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
                                            <window.Icon name="pencil" className="w-3 h-3 text-slate-600 opacity-0 group-hover/article:opacity-100 transition-opacity" />
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
                                    <window.Icon name="trash-2" className="w-4 h-4" />
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
                            <window.Icon name="loader-2" className="w-4 h-4 animate-spin" />
                            Сохранение...
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <window.Icon name="cloud-upload" className="w-4 h-4" />
                            Добавить {selectedPrints.length} {selectedPrints.length === 1 ? 'принт' : 'принтов'} в облако
                        </div>
                    )}
                </button>
            )}
        </div>
    );
};
