// js/components/Gallery.js
const { Upload, Loader2, Link, Trash2, Plus } = lucide;

window.Gallery = ({ files, auth, init, onAddToCollection, onDeleteFile }) => {
    const { useState, useEffect } = React;
    const [isUploading, setIsUploading] = useState(false);
    const [filter, setFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'

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
            <div className="glass-card rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-4 w-full md:w-auto">
                    {/* Фильтр по названию */}
                    <div className="relative group w-full md:w-64">
                        <window.Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Поиск файлов..."
                            className="w-full bg-slate-900 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 focus:bg-slate-900/80 transition-all placeholder:text-slate-600"
                        />
                    </div>
                </div>
                
                {/* Фильтр по дате */}
                <div className="flex items-center gap-2">
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
                {filteredFiles.map(f => (
                    <div key={f.name} className="gallery-item group border border-white/5">
                        <img 
                            src={f.thumb || f.url} 
                            loading="lazy" 
                            className="gallery-image bg-slate-900"
                            alt={f.name}
                        />
                        <div className="gallery-overlay">
                            <p className="text-xs font-medium text-white truncate mb-3 drop-shadow-md">{f.name}</p>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(window.location.origin + f.url); }} 
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
                ))}
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