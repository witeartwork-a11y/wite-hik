// js/components/FolderManager.js
const { Folder, FolderOpen, Trash2, Plus, ChevronRight, ChevronDown } = lucide;

window.FolderManager = ({ files = [], onFolderChange, title = "Папки" }) => {
    const { useState, useEffect } = React;
    const [folders, setFolders] = useState({});
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [draggedFile, setDraggedFile] = useState(null);

    // Загружаем папки из localStorage
    useEffect(() => {
        const storageKey = `folders_${title}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                setFolders(JSON.parse(stored));
            } catch (e) {
                console.error('Ошибка загрузки папок:', e);
            }
        }
    }, [title]);

    // Сохраняем папки в localStorage
    useEffect(() => {
        const storageKey = `folders_${title}`;
        localStorage.setItem(storageKey, JSON.stringify(folders));
        if (onFolderChange) {
            onFolderChange(folders);
        }
    }, [folders, title, onFolderChange]);

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
        setExpandedFolders(prev => new Set([...prev, folderName]));
        setNewFolderName('');
        setIsCreatingFolder(false);
    };

    const handleDeleteFolder = (folderName) => {
        if (!confirm(`Удалить папку "${folderName}" и все её содержимое?`)) return;
        
        setFolders(prev => {
            const newFolders = { ...prev };
            delete newFolders[folderName];
            return newFolders;
        });
        
        setExpandedFolders(prev => {
            const newExpanded = new Set(prev);
            newExpanded.delete(folderName);
            return newExpanded;
        });
    };

    const toggleFolder = (folderName) => {
        setExpandedFolders(prev => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(folderName)) {
                newExpanded.delete(folderName);
            } else {
                newExpanded.add(folderName);
            }
            return newExpanded;
        });
    };

    const handleDragStart = (e, fileName) => {
        setDraggedFile(fileName);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnFolder = (e, folderName) => {
        e.preventDefault();
        
        if (!draggedFile) return;

        // Найти текущую папку файла и удалить его оттуда
        let currentFolder = null;
        for (const [fName, fileList] of Object.entries(folders)) {
            if (fileList.includes(draggedFile)) {
                currentFolder = fName;
                break;
            }
        }

        setFolders(prev => {
            const newFolders = { ...prev };
            
            // Удаляем из старой папки если она была
            if (currentFolder && newFolders[currentFolder]) {
                newFolders[currentFolder] = newFolders[currentFolder].filter(f => f !== draggedFile);
            }
            
            // Добавляем в новую папку
            if (!newFolders[folderName].includes(draggedFile)) {
                newFolders[folderName] = [...newFolders[folderName], draggedFile];
            }
            
            return newFolders;
        });

        setDraggedFile(null);
    };

    const handleRemoveFileFromFolder = (folderName, fileName) => {
        setFolders(prev => ({
            ...prev,
            [folderName]: prev[folderName].filter(f => f !== fileName)
        }));
    };

    return (
        <div className="space-y-3">
            {/* Заголовок и кнопка создания папки */}
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
                <button
                    onClick={() => setIsCreatingFolder(true)}
                    className="p-1.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all"
                    title="Создать папку"
                >
                    <i data-lucide="folder-plus" className="w-4 h-4 text-indigo-400"></i>
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
                        className="create-folder-input flex-1"
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

            {/* Список папок */}
            <div className="folder-container space-y-1.5">
                {Object.entries(folders).length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-xs">
                        Нет папок. Создайте новую папку.
                    </div>
                ) : (
                    Object.entries(folders).map(([folderName, fileList]) => (
                        <div key={folderName}>
                            <div
                                className="folder-item group"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropOnFolder(e, folderName)}
                            >
                                <button
                                    onClick={() => toggleFolder(folderName)}
                                    className="flex-shrink-0 p-0.5 hover:bg-white/10 rounded transition-all"
                                >
                                    {expandedFolders.has(folderName) ? (
                                        <i data-lucide="chevron-down" className="w-4 h-4"></i>
                                    ) : (
                                        <i data-lucide="chevron-right" className="w-4 h-4"></i>
                                    )}
                                </button>

                                <i data-lucide="folder" className="w-4 h-4 text-indigo-400 flex-shrink-0"></i>
                                <span className="folder-name">{folderName}</span>
                                <span className="folder-count">{fileList.length}</span>

                                <button
                                    onClick={() => handleDeleteFolder(folderName)}
                                    className="ml-auto p-1 rounded-md hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Удалить папку"
                                >
                                    <i data-lucide="trash-2" className="w-3.5 h-3.5"></i>
                                </button>
                            </div>

                            {/* Содержимое папки */}
                            {expandedFolders.has(folderName) && (
                                <div className="folder-contents">
                                    {fileList.length === 0 ? (
                                        <div className="col-span-full text-center py-3 text-slate-500 text-xs">
                                            Папка пуста. Перетаскивайте файлы сюда.
                                        </div>
                                    ) : (
                                        fileList.map(fileName => {
                                            const file = files.find(f => f.name === fileName);
                                            return (
                                                <div
                                                    key={fileName}
                                                    className="relative group"
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, fileName)}
                                                >
                                                    <img
                                                        src={file?.thumb || file?.url}
                                                        alt={fileName}
                                                        className="w-full h-full object-cover rounded-md border border-slate-700"
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveFileFromFolder(folderName, fileName)}
                                                        className="absolute top-0.5 right-0.5 p-1 rounded-md bg-red-500/20 border border-red-500/30 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/40"
                                                        title="Удалить из папки"
                                                    >
                                                        <i data-lucide="x" className="w-3 h-3 text-red-400"></i>
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

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