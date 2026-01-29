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

    // Группируем файлы облака по артикулам для UI (один артикул = одна строка)
    const items = useMemo(() => {
        const articleMap = {}; // key: article
        
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
            
            // Фильтрация по тексту
            if (filter.trim() !== '') {
                const searchLower = filter.toLowerCase();
                const matchArticle = f.article.toLowerCase().includes(searchLower);
                const matchFile = f.name.toLowerCase().includes(searchLower);
                const matchPrintName = f.print_name && f.print_name.toLowerCase().includes(searchLower);
                if (!matchArticle && !matchFile && !matchPrintName) return;
            }
            
            const article = f.article;
            const cat = f.category || 'files';
            
            if (!articleMap[article]) {
                articleMap[article] = {
                    key: article,
                    article: article,
                    thumbnail: f.article_thumb || f.thumb || f.url,
                    mtime: f.mtime,
                    categories: {}
                };
            }
            
            if (f.mtime > articleMap[article].mtime) articleMap[article].mtime = f.mtime;
            
            if (!articleMap[article].categories[cat]) {
                articleMap[article].categories[cat] = [];
            }
            articleMap[article].categories[cat].push(f);
        });
        
        // Сортируем артикулы по дате обновления
        return Object.values(articleMap).sort((a, b) => b.mtime - a.mtime);
    }, [files, filter, dateFilter]);

    // Скачать весь артикул
    const handleDownloadArticle = async (articleItem) => {
        setIsZipping(true);
        try {
            const zip = new JSZip();
            
            const cats = Object.entries(articleItem.categories);
            for (const [catName, fileList] of cats) {
                // Если две категории, создаем папки. Если только одна, тоже создаем для единообразия, 
                // или можно кидать в корень если просили "плоский" вид для артикула с 1 категорией?
                // Пользователь просил: "папка одна ... раскрывал ... внутри 2 категории"
                // Значит здесь структура архива тоже должна отражать это.
                const folderName = catName === 'products' ? 'Товары' : (catName === 'mockups' ? 'Заготовки' : 'Файлы');
                const catFolder = zip.folder(folderName);
                
                const promises = fileList.map(async (f) => {
                    try {
                        const blob = await fetch(f.url).then(r => r.blob());
                        catFolder.file(f.name, blob);
                    } catch (e) {
                        console.error("Failed to load", f.name, e);
                    }
                });
                await Promise.all(promises);
            }
            
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${articleItem.article}.zip`);
        } catch (e) {
            console.error(e);
            alert("Ошибка создания архива");
        } finally {
            setIsZipping(false);
        }
    };

    // Скачать отдельную категорию
    const handleDownloadCategory = async (articleKey, catName, fileList) => {
        setIsZipping(true);
        try {
            const zip = new JSZip();
            const promises = fileList.map(async (f) => {
                try {
                    const blob = await fetch(f.url).then(r => r.blob());
                    zip.file(f.name, blob);
                } catch (e) {
                    console.error("Failed to load", f.name, e);
                }
            });
            await Promise.all(promises);
            
            const folderName = catName === 'products' ? 'Товары' : (catName === 'mockups' ? 'Заготовки' : 'Файлы');
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${articleKey}_${folderName}.zip`);
        } catch (e) {
            console.error(e);
            alert("Ошибка создания архива");
        } finally {
            setIsZipping(false);
        }
    };

    const handleCopyLink = (url, file) => {
        // Используем короткую ссылку для товаров, полную для всех остальных
        let linkToCopy = url;
        if (file && file.category === 'products' && file.short_url) {
            linkToCopy = file.short_url;
        }
        const fullUrl = window.location.origin + linkToCopy;
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
        <window.GalleryHeader 
            activeSubTab={activeSubTab}
            onSubTabChange={onSubTabChange}
            filter={filter}
            setFilter={setFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
        />
    );


    if (items.length === 0) {
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
                {items.map(item => {
                    const totalFiles = Object.values(item.categories).flat().length;
                    const catCount = Object.keys(item.categories).length;

                    return (
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
                                    <h3 className="font-semibold text-white truncate text-lg">
                                        {item.article}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {catCount} категоий · {totalFiles} файлов
                                    </p>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDownloadArticle(item); }}
                                        disabled={isZipping}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors disabled:opacity-50 font-medium"
                                        title="Скачать весь артикул (все категории)"
                                    >
                                        {isZipping ? <window.Icon name="loader-2" className="animate-spin w-3 h-3" /> : <window.Icon name="download" className="w-3 h-3" />}
                                        <span>Весь артикул</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteArticle(item.key); }}
                                        disabled={busy.type === 'article' && busy.key === item.key}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-200 text-xs rounded border border-red-500/30 transition-colors disabled:opacity-50"
                                        title="Удалить весь артикул"
                                    >
                                        {busy.type === 'article' && busy.key === item.key
                                            ? <window.Icon name="loader-2" className="animate-spin w-3 h-3" />
                                            : <window.Icon name="trash-2" className="w-3 h-3" />}
                                        <span>Удалить</span>
                                    </button>
                                </div>
                                
                                {/* Expand arrow */}
                                <window.Icon name={expandedArticle === item.key ? "chevron-up" : "chevron-down"} className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            </button>

                            {expandedArticle === item.key && (
                                <div className="bg-slate-900/30 p-4 border-t border-slate-700 space-y-4">
                                    {Object.entries(item.categories).map(([catName, fileList]) => {
                                        const catLabel = catName === 'products' ? 'Товары' : (catName === 'mockups' ? 'Заготовки' : 'Файлы');
                                        return (
                                            <div key={catName} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <window.Icon name={catName === 'products' ? 'package' : 'image'} className="w-4 h-4 text-indigo-400" />
                                                        <span className="font-semibold text-white/90">{catLabel}</span>
                                                        <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{fileList.length} шт.</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleDownloadCategory(item.article, catName, fileList)}
                                                            disabled={isZipping}
                                                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[11px] rounded transition-colors disabled:opacity-50"
                                                        >
                                                            <window.Icon name="download" className="w-3 h-3" />
                                                            <span>Скачать</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCategory(item.article, catName)}
                                                            disabled={busy.type === 'category' && busy.key === `${item.article}:${catName}`}
                                                            className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[11px] rounded border border-red-500/20 transition-colors disabled:opacity-50"
                                                        >
                                                            <window.Icon name="trash-2" className="w-3 h-3" />
                                                            <span>Удалить</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                                    {fileList.map(f => (
                                                        <div key={f.name} className="group relative bg-slate-900 rounded-lg overflow-visible border border-slate-700 flex flex-col">
                                                            <div className="aspect-square relative overflow-hidden rounded-t-lg">
                                                                <img src={f.thumb || f.url} loading="lazy" className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => setPreviewFile(f)} />
                                                                <div className="absolute inset-0 bg-slate-900/95 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-2 gap-2">
                                                                    <button onClick={() => setPreviewFile(f)} className="w-full flex items-center gap-2 px-2 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 rounded text-xs transition-colors text-white">
                                                                        <window.Icon name="eye" className="w-3 h-3" />
                                                                        <span>Смотреть</span>
                                                                    </button>
                                                                    <button onClick={async () => {
                                                                        try {
                                                                            const response = await fetch(f.url);
                                                                            const blob = await response.blob();
                                                                            const url = window.URL.createObjectURL(blob);
                                                                            const a = document.createElement('a');
                                                                            a.href = url;
                                                                            a.download = f.name;
                                                                            document.body.appendChild(a);
                                                                            a.click();
                                                                            window.URL.revokeObjectURL(url);
                                                                            document.body.removeChild(a);
                                                                        } catch (e) {
                                                                            console.error(e);
                                                                            alert('Ошибка скачивания');
                                                                        }
                                                                    }} className="w-full flex items-center gap-2 px-2 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 rounded text-xs transition-colors text-white">
                                                                        <window.Icon name="download" className="w-3 h-3" />
                                                                        <span>Скачать</span>
                                                                    </button>
                                                                    <button onClick={() => handleCopyLink(f.url, f)} className="w-full flex items-center gap-2 px-2 py-1.5 bg-slate-700/80 hover:bg-slate-600 rounded text-xs transition-colors text-white">
                                                                        <window.Icon name="copy" className="w-3 h-3" />
                                                                        <span>Ссылка</span>
                                                                    </button>
                                                                    <button onClick={() => handleDeleteFile(f)} className="w-full flex items-center gap-2 px-2 py-1.5 bg-red-600/20 hover:bg-red-600/30 rounded text-xs transition-colors text-red-200 border border-red-500/30 disabled:opacity-50" disabled={busy.type === 'file' && busy.key === f.url}>
                                                                        {busy.type === 'file' && busy.key === f.url ? <window.Icon name="loader-2" className="w-3 h-3 animate-spin" /> : <window.Icon name="trash-2" className="w-3 h-3" />}
                                                                        <span>Удалить</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="p-1.5 bg-slate-800/80 rounded-b-lg border-t border-slate-700 flex flex-col gap-0.5">
                                                                <p className="text-[10px] font-medium text-white truncate text-center" title={f.name}>
                                                                    {f.name.replace(/\.[^/.]+$/, "")}
                                                                </p>
                                                                {f.product_name && (
                                                                    <p className="text-[9px] text-indigo-300 truncate text-center" title={f.product_name}>
                                                                        {f.product_name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
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
                                    onClick={() => handleCopyLink(previewFile.url, previewFile)}
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
