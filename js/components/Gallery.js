// js/components/Gallery.js
// const { Upload, Loader2, Link, Trash2, Plus, ChevronLeft, ChevronRight, Settings, ImageDown, ExternalLink } = lucide;

window.Gallery = ({ files, auth, init, onAddToCollection, onDeleteFile, activeSubTab, onSubTabChange, galleryType = 'upload' }) => {
    const { useState, useEffect, useLayoutEffect } = React;
    const [isUploading, setIsUploading] = useState(false);
    const [filter, setFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('week'); // 'all', 'today', 'week', 'month'
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [filedFiles, setFiledFiles] = useState(new Set()); 
    const [areFoldersLoading, setAreFoldersLoading] = useState(true);

    // Wite AI Integration State
    const [isWiteAiMode, setIsWiteAiMode] = useState(false);
    const [witeApiUrl, setWiteApiUrl] = useState(localStorage.getItem('wite_api_url') || '');
    const [witeApiKey, setWiteApiKey] = useState(localStorage.getItem('wite_api_key') || '');
    const [witeFiles, setWiteFiles] = useState([]);
    const [witeLoading, setWiteLoading] = useState(false);
    const [witeError, setWiteError] = useState(null);
    const [isConfiguringWite, setIsConfiguringWite] = useState(false);

    useLayoutEffect(() => {
        setFiledFiles(new Set());
        setAreFoldersLoading(activeSubTab !== 'cloud'); 
        if (activeSubTab !== 'files') setIsWiteAiMode(false);
    }, [activeSubTab, galleryType]);
    
    // Wite AI Data Fetching - Load only on mode enter or explicit action
    useEffect(() => {
        if (isWiteAiMode && witeApiUrl && witeApiKey && !isConfiguringWite) {
            fetchRemoteGallery();
        }
    }, [isWiteAiMode]); // Removed witeApiUrl/witeApiKey from deps to prevent auto-fetch on typing

    const fetchRemoteGallery = async (urlOverride, keyOverride) => {
        const urlToUse = urlOverride || witeApiUrl;
        const keyToUse = keyOverride || witeApiKey;
        
        if (!urlToUse || !keyToUse) return;

        setWiteLoading(true);
        setWiteError(null);
        try {
            const baseUrl = urlToUse.replace(/\/$/, '');
            const res = await fetch(`${baseUrl}/api/external_gallery?key=${keyToUse}`);
            
            if (!res.ok) {
                 const text = await res.text();
                 throw new Error(`Status: ${res.status} ${text.substring(0, 50)}`);
            }
            
            const data = await res.json();
            if (Array.isArray(data)) {
                setWiteFiles(data);
                setIsConfiguringWite(false);
                // Also update stored values to ensure they are insync with what worked
                localStorage.setItem('wite_api_url', urlToUse);
                localStorage.setItem('wite_api_key', keyToUse);
            } else if (data.error) {
                throw new Error(data.error);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (e) {
            console.error(e);
            setWiteError(e.message);
            // If failed, maybe show configuration again?
            // setIsConfiguringWite(true); 
        } finally {
            setWiteLoading(false);
        }
    };

    const handleSaveWiteSettings = () => {
        const cleanUrl = witeApiUrl.trim();
        const cleanKey = witeApiKey.trim();
        
        setWiteApiUrl(cleanUrl);
        setWiteApiKey(cleanKey);
        
        // Optimistic save
        localStorage.setItem('wite_api_url', cleanUrl);
        localStorage.setItem('wite_api_key', cleanKey);
        
        setIsConfiguringWite(false);
        fetchRemoteGallery(cleanUrl, cleanKey);
    };

    const handleResetSettings = () => {
        if(!confirm('Сбросить сохраненные настройки подключения?')) return;
        localStorage.removeItem('wite_api_url');
        localStorage.removeItem('wite_api_key');
        setWiteApiUrl('');
        setWiteApiKey('');
        setWiteFiles([]);
        setWiteError(null);
        setIsConfiguringWite(true);
    };

    const handleLinkRemote = async (file) => {
        if (!file.imageUrl) {
             alert('URL изображения отсутствует');
             return;
        }
        setIsUploading(true);
        try {
            const baseUrl = witeApiUrl.replace(/\/$/, '');
            let fileUrl = file.imageUrl;
            if (!fileUrl.startsWith('http')) {
                fileUrl = `${baseUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
            }

            const response = await fetch('/api.php?action=link_remote', { 
                method: 'POST', 
                body: JSON.stringify({
                    url: fileUrl,
                    name: `remote_${file.id || Date.now()}.png`, 
                    prompt: file.prompt,
                    model: file.model,
                    thumb: file.thumbnail_url ? (file.thumbnail_url.startsWith('http') ? file.thumbnail_url : baseUrl + file.thumbnail_url) : fileUrl
                }) 
            });
            const data = await response.json();
            
            if (data.success) {
                await init(); 
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (e) {
            console.error(e);
            alert('Ошибка привязки: ' + e.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleImportFromRemote = async (file) => {
        // if (!confirm(`Импортировать "${file.prompt || 'image'}" в галерею?`)) return;
        if (!file.imageUrl) {
             alert('URL изображения отсутствует');
             return;
        }
        
        setIsUploading(true);
        try {
            // Check if URL is absolute, if not prepend base
            let fileUrl = file.imageUrl;
            if (!fileUrl.startsWith('http')) {
                const baseUrl = witeApiUrl.replace(/\/$/, '');
                fileUrl = `${baseUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
            }

            const imgRes = await fetch(fileUrl);
            const blob = await imgRes.blob();
            
            const formData = new FormData();
            formData.append('password', auth.password);
            formData.append('type', galleryType);
            
            const ext = blob.type.split('/')[1] || 'png';
            const filename = `wite_import_${Date.now()}.${ext}`;
            formData.append('files[]', blob, filename);
            
            const response = await fetch('/api.php?action=upload', { method: 'POST', body: formData });
            const data = await response.json();
            
            if (data.success) {
                await init(); 
                // alert('Файл успешно импортирован');
            }
        } catch (e) {
            console.error(e);
            alert('Ошибка импорта: ' + e.message);
        } finally {
            setIsUploading(false);
        }
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 72; // Increased grid size

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, dateFilter, activeSubTab, isWiteAiMode]);

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
            await response.json();
            await init(); 
        } catch (error) {
            console.error("Upload failed", error);
            alert("Ошибка загрузки");
        } finally {
            setIsUploading(false);
        }
    };

    const currentList = isWiteAiMode ? witeFiles : files;

    const filteredFiles = currentList.filter(f => {
        if (isWiteAiMode) {
             if (!filter) return true;
             return (f.prompt || '').toLowerCase().includes(filter.toLowerCase()) || 
                    (f.model || '').toLowerCase().includes(filter.toLowerCase());
        }

        const fileType = f.type || 'upload';
        // Show linked files in upload tab
        if (fileType !== galleryType && !(galleryType === 'upload' && fileType === 'linked')) return false;
        
        const matchesName = f.name.toLowerCase().includes(filter.toLowerCase());
        if (!matchesName) return false;
        
        if (dateFilter !== 'all') {
            const now = Date.now();
            const fileTime = f.mtime * 1000;
            const dayInMs = 24 * 60 * 60 * 1000;
            const todayStart = new Date();
            todayStart.setHours(0,0,0,0);
            
            switch (dateFilter) {
                case 'today':
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

        // Hide files that are in folders, UNLESS a filter is active
        if (filedFiles.has(f.name) && !filter) {
             return false;
        }

        return true;
    });

    const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
    const displayedFiles = filteredFiles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const scrollToTop = () => {
        const container = document.getElementById('gallery-container');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            scrollToTop();
        }
    };

    return (
        <div className="h-full flex flex-col" 
             onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-500/10'); }}
             onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-blue-500/10'); }}
             onDrop={(e) => {
                 e.preventDefault();
                 e.currentTarget.classList.remove('bg-blue-500/10');
                 if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                     handleUploadFiles(e.dataTransfer.files);
                 }
             }}
        >
            <window.GalleryHeader 
                activeSubTab={activeSubTab} 
                onSubTabChange={onSubTabChange} 
                filter={filter} 
                setFilter={setFilter}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                onWiteAiToggle={() => setIsWiteAiMode(!isWiteAiMode)}
                isWiteAiMode={isWiteAiMode}
            />

            <div id="gallery-container" className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                
                {/* WITE AI MODE */}
                {isWiteAiMode ? (
                     (isConfiguringWite || !witeApiUrl || !witeApiKey) ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 max-w-lg mx-auto mt-10 shadow-2xl">
                            <div className="bg-indigo-500/20 p-4 rounded-full mb-6">
                                <window.Icon name="settings" className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Настройка подключения</h3>
                            <p className="text-slate-400 text-center mb-6 text-sm">Введите URL и API ключ вашего Wite AI инстанса</p>
                            
                            <input 
                                type="text" 
                                placeholder="URL (например, https://wite-ai.site)" 
                                value={witeApiUrl}
                                onChange={e => setWiteApiUrl(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white mb-3 focus:border-indigo-500 outline-none"
                            />
                            <input 
                                type="password" 
                                placeholder="API Key" 
                                value={witeApiKey}
                                onChange={e => setWiteApiKey(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white mb-6 focus:border-indigo-500 outline-none"
                            />
                            <div className="flex gap-2 w-full">
                                <button 
                                    onClick={handleResetSettings}
                                    className="px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 rounded-xl transition-colors border border-red-500/20"
                                    title="Сбросить и очистить настройки"
                                >
                                    <window.Icon name="trash-2" className="w-5 h-5" />
                                </button>
                                {witeApiKey && (
                                    <button 
                                        onClick={() => setIsConfiguringWite(false)}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors"
                                    >
                                        Отмена
                                    </button>
                                )}
                                <button 
                                    onClick={handleSaveWiteSettings}
                                    disabled={!witeApiUrl || !witeApiKey}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Подключиться
                                </button>
                            </div>
                        </div>
                    ) : witeLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <window.Icon name="loader-2" className="w-10 h-10 text-indigo-500 animate-spin" />
                        </div>
                    ) : witeError ? (
                        <div className="text-center p-8 bg-slate-800/50 rounded-2xl border border-red-500/30 max-w-lg mx-auto mt-10">
                            <p className="text-red-400 font-medium mb-2">Ошибка подключения</p>
                            <p className="text-slate-400 text-sm mb-4">{witeError}</p>
                            <button onClick={handleSaveWiteSettings} className="text-indigo-400 hover:text-indigo-300 underline text-sm">Повторить</button>
                            <div className="mt-4 pt-4 border-t border-slate-700/50">
                                <button onClick={() => { setIsConfiguringWite(true); setWiteError(null); }} className="text-slate-500 hover:text-white text-xs">Настроить подключение</button>
                            </div>
                        </div>
                    ) : (
                        <div className="masonry-grid pb-20">
                            {displayedFiles.map((file, idx) => {
                                // Determine thumbnail URL with fallback
                                const baseUrl = witeApiUrl.replace(/\/$/, '');
                                
                                let thumbPath = file.thumbnail_url || file.thumbnailUrl;
                                
                                // Auto-derive thumbnail path based on structure: data/{u}/images/... -> data/{u}/thumbnails/...
                                if (!thumbPath && file.imageUrl && file.imageUrl.includes('/images/')) {
                                    thumbPath = file.imageUrl.replace('/images/', '/thumbnails/');
                                }
                                
                                // Fallback if still no path
                                if (!thumbPath) thumbPath = file.imageUrl;

                                if (!thumbPath) return null;

                                const thumbUrl = thumbPath.startsWith('http') ? thumbPath : `${baseUrl}${thumbPath.startsWith('/') ? '' : '/'}${thumbPath}`;
                                
                                return (
                                <div key={idx} className="masonry-item mb-4 group relative rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50 hover:border-indigo-500 transition-all shadow-lg">
                                    <img 
                                        src={thumbUrl} 
                                        alt={file.prompt} 
                                        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
                                        style={{ minHeight: '100px' }}
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-3 backdrop-blur-sm">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleLinkRemote(file)}
                                                disabled={isUploading}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform shadow-lg"
                                                title="Добавить ссылку (без скачивания)"
                                            >
                                                <window.Icon name="link" className="w-3 h-3" />
                                            </button>
                                            <button 
                                                onClick={() => handleImportFromRemote(file)}
                                                disabled={isUploading}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform shadow-lg"
                                                title="Скачать файл"
                                            >
                                                {isUploading ? <window.Icon name="loader-2" className="w-3 h-3 animate-spin" /> : <window.Icon name="image-down" className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-indigo-300 font-mono border border-white/10 backdrop-blur-md">
                                        {file.model}
                                    </div>
                                </div>
                            )})}
                        </div>
                    )
                ) : (
                /* LOCAL MODE */
                <>
                {/* Folders Section */}
                    {(activeSubTab === 'files' || activeSubTab === 'publication') && (
                        <div className="mb-6">
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
                        </div>
                    )}

                    {/* Upload Drop Area */}
                    {!areFoldersLoading && (activeSubTab === 'files' || activeSubTab === 'publication') && (
                         <div className={`mb-6 p-1 rounded-2xl border-2 border-dashed transition-all ${isUploading ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 hover:border-slate-600'}`}>
                            <label className="flex items-center justify-center gap-4 py-8 cursor-pointer group">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isUploading ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'}`}>
                                    {isUploading ? <window.Icon name="loader-2" className="w-6 h-6 animate-spin" /> : <window.Icon name="upload" className="w-6 h-6" />}
                                </div>
                                <div className="text-left">
                                    <p className={`font-bold transition-colors ${isUploading ? 'text-indigo-400' : 'text-slate-300 group-hover:text-white'}`}>
                                        {isUploading ? 'Загрузка файлов...' : 'Загрузить файлы'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">PNG, JPG до 10MB</p>
                                </div>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUploadFiles(e.target.files)} disabled={isUploading} />
                            </label>
                        </div>
                    )}

                    {!areFoldersLoading && (
                        <div className="masonry-grid pb-20">
                            {displayedFiles.map((file) => {
                                const isSelected = selectedFiles.has(file.name);
                                
                                return (
                                    <div 
                                        key={file.name} 
                                        className={`masonry-item mb-4 group relative rounded-xl overflow-hidden bg-slate-900 border transition-all cursor-pointer shadow-lg hover:shadow-xl ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800 hover:border-slate-600'}`}
                                        onClick={() => toggleSelect(file.name)}
                                        draggable
                                        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('fileName', file.name); }}
                                    >
                                        <div className="absolute inset-0 bg-slate-800 animate-pulse pointer-events-none" /> {/* Placeholder */}
                                        <img 
                                            src={file.thumb || file.url} 
                                            alt={file.name} 
                                            className="w-full h-auto relative z-10 transition-transform duration-500 group-hover:scale-105"
                                            style={{ minHeight: '100px' }}
                                            loading="lazy"
                                            onLoad={(e) => { if (e.target.previousElementSibling) e.target.previousElementSibling.style.display = 'none'; }}
                                        />
                                        
                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 z-20 backdrop-blur-sm"
                                            onClick={(e) => e.stopPropagation()} 
                                        >
                                            <div className="flex gap-2">
                                                {onAddToCollection && (
                                                    <button 
                                                        onClick={() => onAddToCollection(file)}
                                                        className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white shadow-lg transform hover:scale-105 transition-all"
                                                        title="В коллекцию"
                                                    >
                                                        <window.Icon name="plus" className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleRename(file)}
                                                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white shadow-lg transform hover:scale-105 transition-all"
                                                    title="Переименовать"
                                                >
                                                    <window.Icon name="pencil" className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    if(confirm(file.type === 'linked' ? 'Отвязать ссылку?' : 'Удалить файл?')) {
                                                        const formData = new FormData();
                                                        formData.append('filename', file.name);
                                                        fetch('/api.php?action=delete', {
                                                            method: 'POST',
                                                            body: JSON.stringify({ filename: file.name, password: auth.password, type: file.type || galleryType })
                                                        }).then(init);
                                                    }
                                                }}
                                                className="mt-2 text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-full hover:bg-red-500/20 transition-colors"
                                            >
                                                <window.Icon name="trash-2" className="w-3 h-3" /> {file.type === 'linked' ? 'Отвязать' : 'Удалить'}
                                            </button>
                                        </div>

                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-indigo-500 rounded-full p-1 shadow-lg z-20 ring-2 ring-white/20">
                                                <window.Icon name="check" className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        
                                        {/* Linked File Indicator */}
                                        {file.type === 'linked' && !isSelected && (
                                            <div className="absolute top-2 right-2 bg-emerald-500/80 rounded-full p-1.5 shadow-lg z-20 backdrop-blur-md border border-white/20" title="Внешняя ссылка">
                                                <window.Icon name="link" className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6 z-20">
                                            <p className="text-[10px] text-slate-200 truncate text-center font-medium drop-shadow-md">
                                                {file.name.replace(/\.[^/.]+$/, "")}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && !areFoldersLoading && (
                    <div className="flex justify-center items-center py-6 gap-4 border-t border-slate-800/50 mt-4">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 transition-all hover:scale-105 active:scale-95 border border-slate-700 hover:border-slate-600"
                        >
                            <window.Icon name="chevron-left" className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-bold text-slate-400 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                            {currentPage} / {totalPages}
                        </span>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 transition-all hover:scale-105 active:scale-95 border border-slate-700 hover:border-slate-600"
                        >
                            <window.Icon name="chevron-right" className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
            
            {/* Bulk Actions Fixed Bar */}
            {selectedFiles.size > 0 && !isWiteAiMode && (
                 <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-slate-700 px-6 py-4 rounded-2xl shadow-2xl shadow-black/50 flex items-center gap-6 z-50 animate-bounce-in">
                    <span className="text-white font-bold text-sm bg-indigo-600 px-2 py-0.5 rounded-md">{selectedFiles.size}</span>
                    <div className="h-4 w-px bg-slate-700"></div>
                    <button 
                        onClick={handleBulkDelete}
                        className="text-red-400 hover:text-red-300 flex items-center gap-2 text-sm font-bold transition-all hover:scale-105"
                    >
                        <window.Icon name="trash-2" className="w-4 h-4" /> Удалить
                    </button>
                    <button 
                        onClick={() => setSelectedFiles(new Set())}
                        className="text-slate-500 hover:text-white text-sm font-medium transition-colors"
                    >
                        Отмена
                    </button>
                 </div>
            )}
        </div>
    );
};