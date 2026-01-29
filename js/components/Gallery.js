// js/components/Gallery.js
const { Upload, Loader2, Link, Trash2, Plus, ChevronLeft, ChevronRight } = lucide;

window.Gallery = ({ files, auth, init, onAddToCollection, onDeleteFile, activeSubTab, onSubTabChange, galleryType = 'upload' }) => {
    const { useState, useEffect } = React;
    const [isUploading, setIsUploading] = useState(false);
    const [filter, setFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('week'); // 'all', 'today', 'week', 'month'
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [filedFiles, setFiledFiles] = useState(new Set()); // Files that are in folders
    const [areFoldersLoading, setAreFoldersLoading] = useState(true); // Always start with true to prevent flashing

    useEffect(() => {
        setFiledFiles(new Set());
        setAreFoldersLoading(activeSubTab !== 'cloud'); // Only load if not cloud tab
    }, [activeSubTab, galleryType]);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 100;

    // Сброс страницы при изменении фильтров
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, dateFilter, activeSubTab]);

    const handleFolderChange = (folders) => {
        const filed = new Set();
        Object.values(folders).forEach(fileList => {
            fileList.forEach(file => filed.add(file));
        });
        setFiledFiles(filed);
    };

    const toggleSelect = (fileName) => {
        const newSet = new Set(selectedFiles);
        if (newSet.has(fileName)) {
            newSet.delete(fileName);
        } else {
            newSet.add(fileName);
        }
        setSelectedFiles(newSet);
    };

    const handleBulkDelete = async () => {
        if (selectedFiles.size === 0) return;
        if (!confirm(`Удалить выбранные файлы (${selectedFiles.size} шт.)?`)) return;
        
        try {
            for (const filename of selectedFiles) {
                await fetch('/api.php?action=delete', { 
                    method: 'POST', 
                    body: JSON.stringify({ filename, password: auth.password, type: galleryType }) 
                });
            }
            setSelectedFiles(new Set());
            await init();
        } catch (e) {
            console.error(e);
            alert('Ошибка при удалении');
        }
    };

    const handleRename = async (file) => {
        const currentName = file.name.replace(/\.[^/.]+$/, "");
        const newName = prompt("Новое имя файла:", currentName);
        if (newName && newName !== currentName) {
             try {
                 const res = await fetch('/api.php?action=rename', {
                     method: 'POST',
                     body: JSON.stringify({
                         filename: file.name,
                         new_name: newName,
                         password: auth.password,
                         type: galleryType
                     })
                 });
                 const data = await res.json();
                 if (data.success) {
                    const newFileName = data.name;
                    
                    // Update LocalStorage folders to keep them in sync
                    const storageKey = `folders_${galleryType}_Организация файлов`;
                    const stored = localStorage.getItem(storageKey);
                    if (stored) {
                        let folders = JSON.parse(stored);
                        let changed = false;
                        for (const folder in folders) {
                            const idx = folders[folder].indexOf(file.name);
                            if (idx !== -1) {
                                folders[folder][idx] = newFileName;
                                changed = true;
                            }
                        }
                        if (changed) {
                            localStorage.setItem(storageKey, JSON.stringify(folders));
                        }
                    }
                    
                    await init();
                 } else {
                     alert('Ошибка: ' + data.message);
                 }
             } catch (e) {
                 console.error(e);
                 alert('Ошибка при переименовании');
             }
        }
    };

    const handleUploadFiles = async (fileList) => {
        if (!fileList || fileList.length === 0) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('password', auth.password);
            formData.append('type', galleryType);
            for (let i = 0; i < fileList.length; i++) formData.append('files[]', fileList[i]);
            const response = await fetch('/api.php?action=upload', { method: 'POST', body: formData });
            const data = await response.json();
            
            if (data.success && data.files && data.files.length > 0) {
                // Toast notification would be better, but alert is extant
            }
            
            await init(); 
        } catch (error) {
            console.error("Upload failed", error);
            alert("Ошибка загрузки");
        } finally {
            setIsUploading(false);
        }
    };

    const filteredFiles = files.filter(f => {
        // Фильтруем по типу галереи
        const fileType = f.type || 'upload';
        if (fileType !== galleryType) return false;
        
        const matchesName = f.name.toLowerCase().includes(filter.toLowerCase());
        if (!matchesName) return false;
        
        if (dateFilter !== 'all') {
            const now = Date.now();
            const fileTime = f.mtime * 1000;
            const dayInMs = 24 * 60 * 60 * 1000;
            
            switch (dateFilter) {
                case 'today':
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    if (fileTime < todayStart.getTime()) return false;
                    break;
                case 'week':
                    if (now - fileTime > 7 * dayInMs) return false;
                    break;
                case 'month':
                    if (now - fileTime > 30 * dayInMs) return false;
                    break;
            }
        }

        // Скрываем файлы, которые уже есть в папках (если только мы не в режиме просмотра папки - но это управляется FolderManager)
        // Но FolderManager показывает свои файлы сам.
        // Здесь мы фильтруем "свободные" файлы.
        if (filedFiles.has(f.name)) return false;
        
        return true;
    });

    const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
    const displayedFiles = filteredFiles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const scrollToTop = () => {
        // window.scrollTo({ top: 0, behavior: 'smooth' });
        // Since we are inside a container possibly, we might want to target the specific container or just window.
        // Assuming body scroll based on css.
        window.scrollTo(0, 0); 
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            scrollToTop();
        }
    };

    return (
        <div className="space-y-6 pb-10" 
             onDragOver={(e) => {
                 e.preventDefault();
                 e.currentTarget.classList.add('bg-slate-800/20');
             }}
             onDragLeave={(e) => {
                 e.preventDefault();
                 e.currentTarget.classList.remove('bg-slate-800/20');
             }}
             onDrop={(e) => {
                 e.preventDefault();
                 e.currentTarget.classList.remove('bg-slate-800/20');
                 if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                     handleUploadFiles(e.dataTransfer.files);
                 }
             }}
        >
            {/* Единая панель управления */}
            <window.GalleryHeader 
                activeSubTab={activeSubTab}
                onSubTabChange={onSubTabChange}
                filter={filter}
                setFilter={setFilter}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
            />

            {/* Зона загрузки (Компактная) */}
            <div className={`upload-compact group relative ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => handleUploadFiles(e.target.files)} disabled={isUploading} />
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isUploading ? 'bg-indigo-500/20' : 'bg-slate-800 group-hover:bg-indigo-500/20'}`}>
                         {isUploading ? <window.Icon name="loader-2" className="w-5 h-5 text-indigo-400 animate-spin" /> : <window.Icon name="cloud-upload" className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-300 group-hover:text-indigo-300 transition-colors">
                            {isUploading ? "Загружаем файлы..." : "Нажмите или перетащите файлы в любое место"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Папки для организации файлов (только для Gallery, не для CloudSaver) */}
            {activeSubTab !== 'cloud' && (
                <window.FolderManager 
                    key={`${galleryType}_${activeSubTab}`}
                    files={files} 
                    title="Организация файлов"
                    galleryType={galleryType}
                    auth={auth}
                    onAddToCollection={onAddToCollection} 
                    onDeleteFile={onDeleteFile}
                    toggleSelect={toggleSelect}
                    selectedFiles={selectedFiles}
                    onRenameFile={handleRename}
                    onFolderChange={handleFolderChange}
                    onLoading={setAreFoldersLoading}
                />
            )}

            {/* Сетка галереи */}
            {areFoldersLoading && activeSubTab !== 'cloud' ? (
                <div className="flex justify-center items-center py-20">
                    <window.Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : (
            <>
            <div className="gallery-grid">
                {displayedFiles.map(f => {
                    const isSelected = selectedFiles.has(f.name);
                    return (
                        <div 
                            key={f.name} 
                            className={`gallery-item group border transition-all ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-white/5'}`}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('fileName', f.name);
                            }}
                            onDragEnd={(e) => {
                                e.currentTarget.classList.remove('opacity-50');
                            }}
                        >
                            <img 
                                src={f.thumb || f.url} 
                                loading="lazy" 
                                className="gallery-image bg-slate-900"
                                alt={f.name}
                                draggable={false}
                            />
                            
                            {/* Checkbox */}
                            <div 
                                className="absolute top-2 left-2 z-10 cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); toggleSelect(f.name); }}
                            >
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
                                    <button 
                                        onClick={() => handleRename(f)}
                                        className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                                        title="Переименовать"
                                    >
                                        <window.Icon name="pencil" className="w-4 h-4" />
                                    </button>

                                    <button 
                                        onClick={() => { 
                                            // Используем короткую ссылку для товаров
                                            const linkToCopy = f.category === 'products' && f.short_url ? f.short_url : f.url;
                                            navigator.clipboard.writeText(window.location.origin + linkToCopy);
                                        }} 
                                        className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                                        title="Копировать ссылку"
                                    >
                                        <window.Icon name="link" className="w-4 h-4" />
                                    </button>
                                    
                                    {onAddToCollection && (
                                        <button 
                                            onClick={() => onAddToCollection(f)}
                                            className="flex-1 bg-indigo-500/80 hover:bg-indigo-500 backdrop-blur-md text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                                            title="Добавить в коллекцию"
                                        >
                                            <window.Icon name="plus" className="w-4 h-4" />
                                        </button>
                                    )}
                                    
                                    <button 
                                        onClick={async () => { 
                                            if(confirm('Удалить файл навсегда?')) {
                                                await fetch('/api.php?action=delete', { 
                                                    method: 'POST', 
                                                    body: JSON.stringify({
                                                        filename: f.name, 
                                                        password: auth.password,
                                                        type: f.type,
                                                        article: f.article,
                                                        category: f.category
                                                    }) 
                                                });
                                                if (onDeleteFile) onDeleteFile(f.name);
                                                init();
                                            }
                                        }} 
                                        className="flex-1 bg-red-500/80 hover:bg-red-500 backdrop-blur-md text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                                        title="Удалить"
                                    >
                                        <window.Icon name="trash-2" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8 pt-4 border-t border-slate-800">
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-lg bg-slate-800 border border-slate-700 transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700 text-white'}`}
                    >
                         <window.Icon name="chevron-left" className="w-5 h-5" />
                    </button>
                    
                    <span className="text-sm text-slate-400">
                        Страница <span className="text-white font-bold">{currentPage}</span> из <span className="text-white font-bold">{totalPages}</span>
                    </span>

                    <button 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-lg bg-slate-800 border border-slate-700 transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700 text-white'}`}
                    >
                        <window.Icon name="chevron-right" className="w-5 h-5" />
                    </button>
                </div>
            )}

            
            {filteredFiles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 opacity-50">
                    <window.Icon name="image" className="w-12 h-12 mb-4" />
                    <p>Галерея пуста</p>
                </div>
            )}
            </>
            )}
        </div>
    );
};