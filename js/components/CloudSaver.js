window.CloudSaver = ({ files, password, onChanged, activeSubTab, onSubTabChange }) => {
    const { useState, useMemo } = React;
    const [expandedArticle, setExpandedArticle] = useState(null);
    const [isZipping, setIsZipping] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [previewZoom, setPreviewZoom] = useState(1);
    const [busy, setBusy] = useState({ type: null, key: null });
    const [notification, setNotification] = useState(null);
    const [filter, setFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'

    // Группируем файлы облака: каждый артикул + категория = отдельная строка (но скачиваются вместе)
    const items = useMemo(() => {
        const itemsMap = {}; // key: "article__category"
        const articlesMeta = {}; // Метаданные артикулов для группировки при скачивании
        
        files.forEach(f => {
            if (f.type !== 'cloud' || !f.article) return;
            
            // Фильтрация по дате (внутри файла)
            if (dateFilter !== 'all') {
                const now = Date.now();
                const fileTime = f.mtime * 1000;
                const dayInMs = 24 * 60 * 60 * 1000;
                
                switch (dateFilter) {
                    case 'today':
                        const todayStart = new Date();
                        todayStart.setHours(0, 0, 0, 0);
                        if (fileTime < todayStart.getTime()) return;
                        break;
                    case 'week':
                        if (now - fileTime > 7 * dayInMs) return;
                        break;
                    case 'month':
                        if (now - fileTime > 30 * dayInMs) return;
                        break;
                }
            }
            
            // Фильтрация по тексту (имя файла, артикул или оригинальное имя принта)
            if (filter.trim() !== '') {
                const searchLower = filter.toLowerCase();
                const matchArticle = f.article.toLowerCase().includes(searchLower);
                const matchFile = f.name.toLowerCase().includes(searchLower);
                const matchPrintName = f.print_name && f.print_name.toLowerCase().includes(searchLower);
                if (!matchArticle && !matchFile && !matchPrintName) return;
            }
            
            const article = f.article;
            const cat = f.category || 'files';
            const itemKey = `${article}__${cat}`;
            
            // Сохраняем метаданные артикула
            if (!articlesMeta[article]) {
                articlesMeta[article] = {
                    name: article,
                    thumbnail: f.article_thumb || f.thumb || f.url,
                    mtime: f.mtime
                };
            }
            if (f.mtime > articlesMeta[article].mtime) {
                articlesMeta[article].mtime = f.mtime;
            }
            
            // Создаем отдельный элемент для каждой комбинации артикула + категории
            if (!itemsMap[itemKey]) {
                itemsMap[itemKey] = {
                    key: itemKey,
                    article: article,
                    category: cat,
                    categoryLabel: cat === 'mockups' ? 'Мокапы' : cat === 'products' ? 'Товары' : 'Файлы',
                    thumbnail: f.article_thumb || f.thumb || f.url,
                    mtime: f.mtime,
                    files: []
                };
            }
            itemsMap[itemKey].files.push(f);
            if (f.mtime > itemsMap[itemKey].mtime) itemsMap[itemKey].mtime = f.mtime;
        });
        
        // Сортируем по времени
        const sorted = Object.values(itemsMap).sort((a, b) => b.mtime - a.mtime);
        
        return { items: sorted, articlesMeta };
    }, [files, filter, dateFilter]);

    const handleDownloadArticle = async (item) => {
        if (!item || !item.files.length) return;
        setIsZipping(true);
        try {
            const zip = new JSZip();
            
            const promises = item.files.map(async (f) => {
                try {
                    const blob = await fetch(f.url).then(r => r.blob());
                    // Сохраняем с префиксом категории папки
                    const catFolder = zip.folder(f.category === 'products' ? 'Товары' : 'Мокапы');
                    catFolder.file(f.name, blob);
                } catch (e) {
                    console.error("Failed to load", f.name, e);
                }
            });
            await Promise.all(promises);
            
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${item.article}__${item.category}.zip`);
        } catch (e) {
            console.error(e);
            alert("Ошибка создания архива");
        } finally {
            setIsZipping(false);
        }
    };

    // Скачать ВСЕ файлы артикула (обе категории вместе)
    const handleDownloadFullArticle = async (articleKey) => {
        const allItemsForArticle = items.items.filter(item => item.article === articleKey);
        if (!allItemsForArticle.length) return;
        
        setIsZipping(true);
        try {
            const zip = new JSZip();
            
            for (const item of allItemsForArticle) {
                const promises = item.files.map(async (f) => {
                    try {
                        const blob = await fetch(f.url).then(r => r.blob());
                        const catFolder = zip.folder(f.category === 'products' ? 'Товары' : 'Мокапы');
                        catFolder.file(f.name, blob);
                    } catch (e) {
                        console.error("Failed to load", f.name, e);
                    }
                });
                await Promise.all(promises);
            }
            
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${articleKey}_полный.zip`);
        } catch (e) {
            console.error(e);
            alert("Ошибка создания архива");
        } finally {
            setIsZipping(false);
        }
    };

    const handleDownloadCategory = async (article, categoryName, files) => {
        if (!files || !files.length) return;
        setIsZipping(true);
        try {
            const zip = new JSZip();
            const promises = files.map(async (f) => {
                try {
                    const blob = await fetch(f.url).then(r => r.blob());
                    zip.file(f.name, blob);
                } catch (e) {
                    console.error("Failed to load", f.name, e);
                }
            });
            await Promise.all(promises);
            
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${article.name}_${categoryName}.zip`);
        } catch (e) {
            console.error(e);
            alert("Ошибка создания архива");
        } finally {
            setIsZipping(false);
        }
    };

    const handleCopyLink = (url) => {
        const fullUrl = window.location.origin + url;
        navigator.clipboard.writeText(fullUrl);
        setNotification('Ссылка скопирована');
        setTimeout(() => setNotification(null), 2000);
    };

    const refresh = async () => {
        if (onChanged) await onChanged();
    };

    const handleDeleteArticle = async (articleKey) => {
        if (!password) return alert('Нет пароля для удаления');
        if (!confirm(`Удалить артикул "${articleKey}" со всеми файлами?`)) return;
        setBusy({ type: 'article', key: articleKey });
        const ok = await window.DataService.deleteCloudArticle(password, { article: articleKey });
        setBusy({ type: null, key: null });
        if (!ok) return alert('Не удалось удалить артикул');
        await refresh();
    };

    const handleDeleteCategory = async (articleKey, category) => {
        if (!password) return alert('Нет пароля для удаления');
        if (!confirm(`Удалить категорию "${category}" внутри артикула "${articleKey}"?`)) return;
        setBusy({ type: 'category', key: `${articleKey}:${category}` });
        const ok = await window.DataService.deleteCloudCategory(password, { article: articleKey, category });
        setBusy({ type: null, key: null });
        if (!ok) return alert('Не удалось удалить категорию');
        await refresh();
    };

    const handleDeleteFile = async (file) => {
        if (!password) return alert('Нет пароля для удаления');
        if (!confirm(`Удалить файл "${file.name}"?`)) return;
        setBusy({ type: 'file', key: file.url });
        const ok = await window.DataService.deleteCloudFile(password, {
            filename: file.name,
            article: file.article,
            category: file.category
        });
        setBusy({ type: null, key: null });
        if (!ok) return alert('Не удалось удалить файл');
        await refresh();
    };

    const header = (
        <div className="glass-card rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
             <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-start md:items-center">
                 {onSubTabChange && (
                     <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5 shrink-0">
                         <button 
                             onClick={() => onSubTabChange('files')} 
                             className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeSubTab === 'files' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                         >
                             Файлы
                         </button>
                         <button 
                             onClick={() => onSubTabChange('cloud')} 
                             className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeSubTab === 'cloud' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                         >
                             Облако
                         </button>
                     </div>
                 )}
             </div>

             <div className="flex items-center gap-4 w-full md:w-auto justify-end flex-wrap md:flex-nowrap">
                {/* Фильтр по названию */}
                <div className="relative group w-full md:w-64 order-2 md:order-1">
                    <window.Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Поиск по артикулу..."
                        className="w-full bg-slate-900 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 focus:bg-slate-900/80 transition-all placeholder:text-slate-600"
                    />
                </div>

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
    );


    if (items.items.length === 0) {
        return (
            <div className="space-y-6 fade-in pb-10">
                {header}
                <div className="text-center py-20 text-slate-500">
                    <window.Icon name="folder-open" className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Нет сохраненных проектов в облаке.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in pb-10">
            {header}
            <div className="space-y-3">
                {items.items.map(item => (
                <div key={item.key} className="border border-slate-700 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setExpandedArticle(expandedArticle === item.key ? null : item.key)}
                        className="w-full flex items-center gap-4 p-4 bg-slate-800 hover:bg-slate-750 transition-colors text-left"
                    >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900 border border-slate-700">
                            <img src={item.thumbnail} className="w-full h-full object-cover" />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate">
                                {item.article}
                                <span className="text-slate-400 ml-2 text-sm">
                                    {item.categoryLabel}
                                </span>
                            </h3>
                            <p className="text-xs text-slate-400">
                                {item.files.length} файлов
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDownloadArticle(item); }}
                                disabled={isZipping}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors disabled:opacity-50"
                                title="Скачать эту категорию"
                            >
                                {isZipping ? <window.Icon name="loader-2" className="animate-spin w-3 h-3" /> : <window.Icon name="download" className="w-3 h-3" />}
                                <span>Скачать</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDownloadFullArticle(item.article); }}
                                disabled={isZipping}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs rounded transition-colors disabled:opacity-50"
                                title="Скачать все категории этого артикула"
                            >
                                {isZipping ? <window.Icon name="loader-2" className="animate-spin w-3 h-3" /> : <window.Icon name="download" className="w-3 h-3" />}
                                <span>Весь артикул</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(item.article, item.category); }}
                                disabled={busy.type === 'category' && busy.key === item.key}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-200 text-xs rounded border border-red-500/30 transition-colors disabled:opacity-50"
                                title="Удалить категорию"
                            >
                                {busy.type === 'category' && busy.key === item.key
                                    ? <window.Icon name="loader-2" className="animate-spin w-3 h-3" />
                                    : <window.Icon name="trash-2" className="w-3 h-3" />}
                                <span>Удалить</span>
                            </button>
                        </div>
                        
                        {/* Expand arrow */}
                        <window.Icon name={expandedArticle === item.key ? "chevron-up" : "chevron-down"} className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    </button>

                    {expandedArticle === item.key && (
                        <div className="bg-slate-900/30 p-4 border-t border-slate-700">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {item.files.map(f => (
                                    <div key={f.name} className="group relative bg-slate-900 rounded-lg overflow-visible border border-slate-700 flex flex-col">
                                        <div className="aspect-square relative overflow-hidden rounded-t-lg">
                                            <img src={f.thumb || f.url} loading="lazy" className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewFile(f)} />
                                            <div className="absolute inset-0 bg-slate-900/95 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-2 gap-2">
                                                <button onClick={() => setPreviewFile(f)} className="w-full flex items-center gap-2 px-2 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 rounded text-xs transition-colors text-white">
                                                    <window.Icon name="eye" className="w-3 h-3" />
                                                    <span>Смотреть</span>
                                                </button>
                                                <button onClick={() => handleCopyLink(f.url)} className="w-full flex items-center gap-2 px-2 py-1.5 bg-slate-700/80 hover:bg-slate-600 rounded text-xs transition-colors text-white">
                                                    <window.Icon name="copy" className="w-3 h-3" />
                                                    <span>Получить ссылку</span>
                                                </button>
                                                <button onClick={() => window.open(f.url, '_blank')} className="w-full flex items-center gap-2 px-2 py-1.5 bg-slate-700/80 hover:bg-slate-600 rounded text-xs transition-colors text-white">
                                                    <window.Icon name="external-link" className="w-3 h-3" />
                                                    <span>Открыть</span>
                                                </button>
                                                <button onClick={() => handleDeleteFile(f)} className="w-full flex items-center gap-2 px-2 py-1.5 bg-red-600/20 hover:bg-red-600/30 rounded text-xs transition-colors text-red-200 border border-red-500/30 disabled:opacity-50" disabled={busy.type === 'file' && busy.key === f.url}>
                                                    {busy.type === 'file' && busy.key === f.url
                                                        ? <window.Icon name="loader-2" className="w-3 h-3 animate-spin" />
                                                        : <window.Icon name="trash-2" className="w-3 h-3" />}
                                                    <span>Удалить</span>
                                                </button>
                                            </div>
                                        </div>
                                        {/* Постоянная подпись с артикулом и именем файла */}
                                        <div className="p-2 bg-slate-800/80 rounded-b-lg border-t border-slate-700">
                                            <p className="text-xs font-semibold text-indigo-300 truncate" title={f.article}>
                                                {f.article}
                                            </p>
                                            {f.print_name ? (
                                                <>
                                                    <p className="text-[10px] text-slate-300 truncate" title={f.print_name}>
                                                        {f.print_name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 truncate" title={f.name}>
                                                        {f.name}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-[10px] text-slate-400 truncate" title={f.name}>
                                                    {f.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
            </div>
            
            {/* Modal Preview */}
            {previewFile && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 fade-in" onClick={() => { setPreviewFile(null); setPreviewZoom(1); }}>
                    <div className="bg-slate-900 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h3 className="font-semibold text-white truncate">{previewFile.name}</h3>
                            <button onClick={() => { setPreviewFile(null); setPreviewZoom(1); }} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                                <window.Icon name="x" className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950">
                            <img src={previewFile.url} alt={previewFile.name} style={{ transform: `scale(${previewZoom})`, transition: 'transform 0.2s' }} className="max-w-full max-h-full object-contain cursor-zoom-in" />
                        </div>
                        
                        <div className="p-4 border-t border-slate-700 flex items-center justify-between gap-3 bg-slate-800">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setPreviewZoom(Math.max(0.5, previewZoom - 0.2))}
                                    className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 hover:text-white"
                                    title="Уменьшить"
                                >
                                    <window.Icon name="zoom-out" className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-slate-400 w-12 text-center">{Math.round(previewZoom * 100)}%</span>
                                <button 
                                    onClick={() => setPreviewZoom(Math.min(3, previewZoom + 0.2))}
                                    className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 hover:text-white"
                                    title="Увеличить"
                                >
                                    <window.Icon name="zoom-in" className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => setPreviewZoom(1)}
                                    className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 hover:text-white text-xs"
                                    title="Сбросить"
                                >
                                    100%
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleCopyLink(previewFile.url)}
                                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white text-xs flex items-center gap-1.5"
                                >
                                    <window.Icon name="copy" className="w-3 h-3" />
                                    Получить ссылку
                                </button>
                                <button 
                                    onClick={() => window.open(previewFile.url, '_blank')}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white text-xs flex items-center gap-1.5"
                                >
                                    <window.Icon name="external-link" className="w-3 h-3" />
                                    Открыть
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className="fixed bottom-4 right-4 bg-slate-800 border border-indigo-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 fade-in flex items-center gap-2">
                    <window.Icon name="check" className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium">{notification}</span>
                </div>
            )}
        </div>
    );
};
