// js/components/FolderManager.js
const { Folder, FolderOpen, Trash2, Plus, ChevronRight, ChevronDown } = lucide;

window.FolderManager = ({ files = [], onFolderChange, title = "Папки", galleryType = 'upload', onAddToCollection, onDeleteFile, toggleSelect, selectedFiles }) => {
    const { useState, useEffect } = React;
    const [folders, setFolders] = useState({});
    const [openedFolder, setOpenedFolder] = useState(null);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Загружаем папки из localStorage
    useEffect(() => {
        const storageKey = `folders_${galleryType}_${title}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                setFolders(JSON.parse(stored));
            } catch (e) {
                console.error('Ошибка загрузки папок:', e);
            }
        }
    }, [galleryType, title]);

    // Сохраняем папки в localStorage
    useEffect(() => {
        const storageKey = `folders_${galleryType}_${title}`;
        localStorage.setItem(storageKey, JSON.stringify(folders));
        if (onFolderChange) {
            onFolderChange(folders);
        }
    }, [folders, galleryType, title, onFolderChange]);

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;
        
        const folderName = newFolderName.trim();
        if (folders[folderName]) {
            alert('Папка с таким названием уже существует');
            return;
        }

        setFolders(prev => ({
            ...prev,
            [folderName]: []
        }));
        setNewFolderName('');
        setIsCreatingFolder(false);
    };

    const handleDeleteFolder = (folderName, e) => {
        if (e) e.stopPropagation();
        if (!confirm(`Удалить папку "${folderName}" и все её содержимое?`)) return;
        
        setFolders(prev => {
            const newFolders = { ...prev };
            delete newFolders[folderName];
            return newFolders;
        });
        
        if (openedFolder === folderName) {
            setOpenedFolder(null);
        }
    };

    const handleDropOnFolder = (e, folderName) => {
        e.preventDefault();
        e.stopPropagation();
        
        const draggedFileName = e.dataTransfer.getData('fileName');
        if (!draggedFileName) return;

        // Найти текущую папку файла и удалить его оттуда
        let currentFolder = null;
        for (const [fName, fileList] of Object.entries(folders)) {
            if (fileList.includes(draggedFileName)) {
                currentFolder = fName;
                break;
            }
        }

        setFolders(prev => {
            const newFolders = { ...prev };
            
            // Удаляем из старой папки если она была
            if (currentFolder && newFolders[currentFolder]) {
                newFolders[currentFolder] = newFolders[currentFolder].filter(f => f !== draggedFileName);
            }
            
            // Добавляем в новую папку
            if (!newFolders[folderName].includes(draggedFileName)) {
                newFolders[folderName] = [...newFolders[folderName], draggedFileName];
            }
            
            return newFolders;
        });
    };

    const handleRemoveFileFromFolder = (folderName, fileName) => {
        setFolders(prev => ({
            ...prev,
            [folderName]: prev[folderName].filter(f => f !== fileName)
        }));
    };

    return (
        <div className="space-y-4">
            {/* Заголовок и кнопка создания папки */}
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
                <button
                    onClick={() => setIsCreatingFolder(true)}
                    className="p-1.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all"
                    title="Создать папку"
                >
                    <window.Icon name="folder-plus" className="w-4 h-4 text-indigo-400" />
                </button>
            </div>

            {/* Поле для создания новой папки */}
            {isCreatingFolder && (
                <div className="flex gap-2 p-2 bg-slate-900/50 rounded-md">
                    <input
                        type="text"
                        placeholder="Название папки..."
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                handleCreateFolder();
                            } else if (e.key === 'Escape') {
                                setIsCreatingFolder(false);
                                setNewFolderName('');
                            }
                        }}
                        className="bg-transparent border-none outline-none text-white text-sm flex-1 placeholder:text-slate-600"
                        autoFocus
                    />
                    <button
                        onClick={handleCreateFolder}
                        className="px-2 py-1 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 text-xs font-medium transition-all"
                    >
                        ✓
                    </button>
                    <button
                        onClick={() => {
                            setIsCreatingFolder(false);
                            setNewFolderName('');
                        }}
                        className="px-2 py-1 rounded-md bg-slate-700/20 hover:bg-slate-700/30 text-slate-400 border border-slate-700/30 text-xs font-medium transition-all"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Сетка папок */}
            <div className="folder-grid">
                {Object.entries(folders).map(([folderName, fileList]) => (
                    <div 
                        key={folderName} 
                        className="folder-card group"
                        onClick={() => setOpenedFolder(folderName)}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                        onDrop={(e) => handleDropOnFolder(e, folderName)}
                    >
                        <window.Icon name="folder" className="w-10 h-10 text-indigo-400 mb-2 group-hover:text-indigo-300 transition-colors" />
                        <span className="text-sm font-medium text-slate-200 text-center truncate w-full px-2">{folderName}</span>
                        <span className="text-xs text-slate-500">{fileList.length} файлов</span>

                        <button 
                            onClick={(e) => handleDeleteFolder(folderName, e)}
                            className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all custom-delete-btn"
                            title="Удалить папку"
                        >
                            <window.Icon name="trash-2" className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* MODAL OPEN FOLDER */}
            {openedFolder && (
                <div className="modal-overlay" onClick={() => setOpenedFolder(null)}>
                    <div className="modal-content overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                             <div className="flex items-center gap-3">
                                <window.Icon name="folder-open" className="w-6 h-6 text-indigo-400" />
                                <h2 className="text-xl font-bold text-white">{openedFolder}</h2>
                                <span className="text-sm text-slate-400">({folders[openedFolder]?.length || 0})</span>
                             </div>
                             <button onClick={() => setOpenedFolder(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                                <window.Icon name="x" className="w-6 h-6" />
                             </button>
                        </div>
                        
                        <div className="folder-file-grid p-6 custom-scroll flex-1">
                            {(folders[openedFolder] || []).map(fileName => {
                                const f = files.find(x => x.name === fileName);
                                if (!f) return null;
                                const isSelected = selectedFiles && selectedFiles.has(f.name);

                                return (
                                    <div key={f.name} className={`gallery-item group border transition-all ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-white/5'}`}
                                         draggable
                                         onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('fileName', f.name); }}>
                                        <img src={f.thumb || f.url} className="gallery-image bg-slate-900" loading="lazy" />
                                        
                                        <div className="absolute top-2 left-2 z-10 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleSelect && toggleSelect(f.name); }}>
                                            <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors shadow-lg backdrop-blur-sm ${isSelected ? 'bg-indigo-600 text-white' : 'bg-black/40 hover:bg-black/60 text-white/50 border border-white/20'}`}>
                                                {isSelected && <window.Icon name="check" className="w-4 h-4" />}
                                            </div>
                                        </div>

                                        <div className="gallery-overlay">
                                            <div className="mb-3">
                                                 <p className="text-xs font-medium text-white truncate drop-shadow-md">{f.name.replace(/\.[^/.]+$/, "")}</p>
                                                 {f.product_name && <p className="text-[10px] text-indigo-200 truncate drop-shadow-md">{f.product_name}</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { 
                                                            const linkToCopy = f.category === 'products' && f.short_url ? f.short_url : f.url;
                                                            navigator.clipboard.writeText(window.location.origin + linkToCopy);
                                                        }} 
                                                        className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                                                        title="Копировать ссылку">
                                                    <window.Icon name="link" className="w-4 h-4" />
                                                </button>
                                                {onAddToCollection && (
                                                    <button onClick={() => onAddToCollection(f)} 
                                                            className="flex-1 bg-indigo-500/80 hover:bg-indigo-500 backdrop-blur-md text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                                                            title="Добавить в коллекцию">
                                                        <window.Icon name="plus" className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => handleRemoveFileFromFolder(openedFolder, fileName)} 
                                                        className="flex-1 bg-amber-500/80 hover:bg-amber-500 backdrop-blur-md text-white p-2 rounded-lg transition-colors flex items-center justify-center" 
                                                        title="Убрать из папки">
                                                     <window.Icon name="folder-minus" className="w-4 h-4" />
                                                </button>
                                                {onDeleteFile && (
                                                    <button onClick={(e) => {
                                                                if(confirm('Удалить файл навсегда?')) {
                                                                    onDeleteFile(f.name);
                                                                }
                                                            }} 
                                                            className="flex-1 bg-red-500/80 hover:bg-red-500 backdrop-blur-md text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                                                            title="Удалить файл навсегда">
                                                        <window.Icon name="trash-2" className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                             {(folders[openedFolder] || []).length === 0 && (
                                <div className="col-span-full h-40 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700/50 rounded-xl">
                                    <window.Icon name="ghost" className="w-8 h-8 opacity-50 mb-2" />
                                    <p>Папка пуста</p>
                                    <p className="text-xs">Перетащите файлы на папку, чтобы добавить их</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
             <script>
                {() => {
                    if (window.lucide) {
                        window.lucide.createIcons();
                    }
                }}
            </script>
        </div>
    );
};
