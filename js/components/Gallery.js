// js/components/Gallery.js
const { Upload, Loader2, Link, Trash2, Plus } = lucide;

window.Gallery = ({ files, auth, init, onAddToCollection, onDeleteFile, activeSubTab, onSubTabChange }) => {
    const { useState, useEffect } = React;
    const [isUploading, setIsUploading] = useState(false);
    const [filter, setFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'
    const [selectedFiles, setSelectedFiles] = useState(new Set());

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
                    body: JSON.stringify({ filename, password: auth.password }) 
                });
            }
            setSelectedFiles(new Set());
            await init();
        } catch (e) {
            console.error(e);
            alert('Ошибка при удалении');
        }
    };

    const handleUploadFiles = async (fileList) => {
        if (!fileList || fileList.length === 0) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('password', auth.password);
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
        const isUpload = !f.type || f.type === 'upload';
        if (!isUpload) return false;
        
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
        
        return true;
    });

    return (
        <div className="space-y-6 fade-in pb-10">
            {/* Панель управления галереей */}
            <div className="glass-card rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-start md:items-center">
                    {/* Переключатель вкладок */}
                    {onSubTabChange && (
                        <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5 shrink-0">
                            <button 
                                onClick={() => onSubTabChange('files')} 
                                className={`tab-button ${activeSubTab === 'files' ? 'tab-active' : 'tab-inactive'}`}
                            >
                                Исходники
                            </button>
                            <button 
                                onClick={() => onSubTabChange('cloud')} 
                                className={`tab-button ${activeSubTab === 'cloud' ? 'tab-active' : 'tab-inactive'}`}
                            >
                                Облако
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto justify-end flex-wrap md:flex-nowrap">
                    {/* Фильтр по названию - перемещен вправо */}
                    <div className="search-box group w-full md:w-64 order-2 md:order-1">
                        <window.Icon name="search" className="search-icon" />
                        <input
                            type="text"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Поиск файлов..."
                            className="input-field pl-9 text-sm"
                        />
                    </div>

                    {/* Кнопка множественного удаления */}
                    {selectedFiles.size > 0 && (
                        <button 
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-200 rounded-lg border border-red-500/30 transition-colors animate-pulse-once order-1 md:order-2"
                        >
                            <window.Icon name="trash-2" className="w-4 h-4" />
                            <span className="text-sm">Удалить ({selectedFiles.size})</span>
                        </button>
                    )}

                    {/* Фильтр по дате */}
                    <div className="flex items-center gap-2 order-3">
                        <window.Icon name="calendar" className="w-4 h-4 text-slate-500" />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500/50 cursor-pointer hover:bg-slate-800 transition-colors"
                        >
                            <option value="all">За все время</option>
                            <option value="today">Сегодня</option>
                            <option value="week">За неделю</option>
                            <option value="month">За месяц</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Папки для организации файлов */}
            <window.FolderManager 
                files={filteredFiles} 
                title="Организация файлов"
            />

            {/* Зона загрузки */}
            <div className={`border-2 border-dashed border-slate-700/50 bg-slate-800/30 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all relative group ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => handleUploadFiles(e.target.files)} disabled={isUploading} />
                <div className="flex flex-col items-center gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isUploading ? 'bg-indigo-500/20' : 'bg-slate-800 group-hover:scale-110 group-hover:bg-indigo-500/20 shadow-lg'}`}>
                         {isUploading ? <window.Icon name="loader-2" className="w-7 h-7 text-indigo-400 animate-spin" /> : <window.Icon name="cloud-upload" className="w-7 h-7 text-slate-400 group-hover:text-indigo-400" />}
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-300 group-hover:text-indigo-300 transition-colors">
                            {isUploading ? "Загружаем файлы..." : "Нажмите или перетащите файлы"}
                        </p>
                        <p className="text-xs text-slate-500">
                            Поддерживаются JPG, PNG, WEBP
                        </p>
                    </div>
                </div>
            </div>

            {/* Сетка галереи */}
            <div className="gallery-grid">
                {filteredFiles.map(f => {
                    const isSelected = selectedFiles.has(f.name);
                    return (
                        <div 
                            key={f.name} 
                            className={`gallery-item group border transition-all ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-white/5'}`}
                        >
                            <img 
                                src={f.thumb || f.url} 
                                loading="lazy" 
                                className="gallery-image bg-slate-900"
                                alt={f.name}
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
                                                await fetch('/api.php?action=delete', { method:'POST', body: JSON.stringify({filename: f.name, password: auth.password}) });
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
            
            {filteredFiles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 opacity-50">
                    <window.Icon name="image" className="w-12 h-12 mb-4" />
                    <p>Галерея пуста</p>
                </div>
            )}
        </div>
    );
};