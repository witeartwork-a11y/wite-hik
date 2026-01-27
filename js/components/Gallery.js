// js/components/Gallery.js
const { Upload, Loader2 } = lucide;
// const { useState, useEffect } = React; // Removed global destructuring

window.Gallery = ({ files, auth, init }) => {
    const { useState, useEffect } = React;
    const [isUploading, setIsUploading] = useState(false);
    const [filter, setFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'

    useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    }, [files, isUploading]);
    
    const handleUploadFiles = async (fileList) => {
        if (!fileList || fileList.length === 0) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('password', auth.password);
            for (let i = 0; i < fileList.length; i++) formData.append('files[]', fileList[i]);
            await fetch('/api.php?action=upload', { method: 'POST', body: formData });
            await init(); 
        } catch (error) {
            console.error("Upload failed", error);
            alert("Ошибка загрузки");
        } finally {
            setIsUploading(false);
        }
    };

    const filteredFiles = files.filter(f => {
        // Show only user uploads (or legacy files without type)
        const isUpload = !f.type || f.type === 'upload';
        if (!isUpload) return false;
        
        // Filter by name
        const matchesName = f.name.toLowerCase().includes(filter.toLowerCase());
        if (!matchesName) return false;
        
        // Filter by date
        if (dateFilter !== 'all') {
            const now = Date.now();
            const fileTime = f.mtime * 1000; // Convert from seconds to milliseconds
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
        <div className="space-y-6 fade-in">
            <div className="flex flex-col gap-3">
                {/* Фильтр по названию */}
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <i data-lucide="filter" className="w-4 h-4"></i>
                    <input
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Фильтр по имени файла"
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white flex-1 focus:border-indigo-500 outline-none"
                    />
                </div>
                
                {/* Фильтр по дате */}
                <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
                    <i data-lucide="calendar" className="w-4 h-4"></i>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                    >
                        <option value="all">Все файлы</option>
                        <option value="today">Сегодня</option>
                        <option value="week">За неделю</option>
                        <option value="month">За месяц</option>
                    </select>
                </div>
            </div>
            <div className={`border-2 border-dashed border-slate-700 bg-slate-800/30 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-all relative ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleUploadFiles(e.target.files)} disabled={isUploading} />
                <div className="flex justify-center mb-2">
                    {isUploading ? (
                        <i data-lucide="loader-2" className="w-10 h-10 text-indigo-400 animate-spin"></i>
                    ) : (
                        <i data-lucide="upload" className="w-10 h-10 text-indigo-400"></i>
                    )}
                </div>
                <p className="text-slate-400">{isUploading ? "Загрузка..." : "Перетащите файлы или кликните для загрузки"}</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredFiles.map(f => (
                    <div key={f.name} className="group relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-indigo-500 transition-all">
                        <div className="aspect-square p-2">
                            <img src={f.thumb || f.url} loading="lazy" className="w-full h-full object-contain"/>
                        </div>
                        <div className="absolute inset-0 bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                            <button onClick={() => { navigator.clipboard.writeText(window.location.origin + f.url); alert('Ссылка скопирована'); }} className="bg-indigo-600 px-3 py-1 rounded text-xs text-white">Copy Link</button>
                            <button onClick={async () => { 
                                if(confirm('Удалить?')) {
                                    await fetch('/api.php?action=delete', { method:'POST', body: JSON.stringify({filename: f.name, password: auth.password}) });
                                    init();
                                }
                            }} className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-xs">Delete</button>
                        </div>
                        <p className="text-[10px] text-center p-1 text-slate-500 truncate">{f.name}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};