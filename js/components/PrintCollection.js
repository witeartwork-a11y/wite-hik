// js/components/PrintCollection.js
window.PrintCollection = ({ 
    prints, 
    selectedPrints, 
    onAddPrint, 
    onSelectPrint, 
    onRemovePrint, 
    onUpdateArticle,
    onUpdatePrintName,
    onSaveToCloud,
    isSaving,
    onSavePreset
}) => {
    const { useState } = React;
    const [editingId, setEditingId] = useState(null);
    const [editingValue, setEditingValue] = useState('');
    const [editingPrintNameId, setEditingPrintNameId] = useState(null);
    const [editingPrintNameValue, setEditingPrintNameValue] = useState('');

    const handleEditArticle = (print) => {
        setEditingId(print.id);
        setEditingValue(print.article || print.name.split('.')[0]);
    };

    const handleSaveArticle = (print) => {
        const val = editingValue.trim();
        if (val) {
            onUpdateArticle(print.id, val);
        }
        setEditingId(null);
    };

    const handleEditPrintName = (print) => {
        setEditingPrintNameId(print.id);
        setEditingPrintNameValue(print.printName || '');
    };

    const handleSavePrintName = (print) => {
        const val = editingPrintNameValue.trim();
        if (onUpdatePrintName) {
            onUpdatePrintName(print.id, val);
        }
        setEditingPrintNameId(null);
    };

    const handleCopyArticle = async (print) => {
        const value = print.article || print.name.split('.')[0];
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                const temp = document.createElement('textarea');
                temp.value = value;
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                document.body.removeChild(temp);
            }
        } catch (e) {
            console.warn('Не удалось скопировать артикул:', e);
        }
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
                            className={`collection-item ${selectedPrints.includes(print.id) ? 'collection-item-selected' : 'collection-item-unselected'}`}
                            onClick={() => onSelectPrint(print.id)}
                        >
                            <div className="flex items-center gap-3">
                                {/* Миниатюра */}
                                <div className="thumbnail">
                                    <img src={print.thumb || print.url} alt={print.name} />
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
                                            <button
                                                className="p-1 text-slate-500 hover:text-indigo-300 hover:bg-indigo-400/10 rounded transition-colors"
                                                title="Скопировать артикул"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCopyArticle(print);
                                                }}
                                            >
                                                <window.Icon name="copy" className="w-3 h-3" />
                                            </button>
                                            <window.Icon name="pencil" className="w-3 h-3 text-slate-600 hover-opacity-show" />
                                        </div>
                                    )}

                                    {/* Имя принта (редактируемое) */}
                                    {editingPrintNameId === print.id ? (
                                        <input
                                            type="text"
                                            value={editingPrintNameValue}
                                            onChange={(e) => setEditingPrintNameValue(e.target.value)}
                                            onBlur={() => handleSavePrintName(print)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSavePrintName(print);
                                                if (e.key === 'Escape') setEditingPrintNameId(null);
                                            }}
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white outline-none"
                                            placeholder="Имя принта"
                                        />
                                    ) : (
                                        <div
                                            className="flex items-center gap-2 group/article"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditPrintName(print);
                                            }}
                                        >
                                            <span className={`text-sm px-2 py-1 rounded ${print.printName ? 'text-slate-200 bg-slate-900/50' : 'text-slate-500 bg-slate-900/30'}`}>
                                                {print.printName ? print.printName : 'Имя принта'}
                                            </span>
                                            <window.Icon name="pencil" className="w-3 h-3 text-slate-600 hover-opacity-show" />
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
