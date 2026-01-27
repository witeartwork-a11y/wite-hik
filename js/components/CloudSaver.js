window.CloudSaver = ({ files }) => {
    const { useState, useMemo } = React;
    const [expandedArticle, setExpandedArticle] = useState(null);
    const [isZipping, setIsZipping] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [previewZoom, setPreviewZoom] = useState(1);

    // Группируем файлы облака по артикулам
    const articles = useMemo(() => {
        const a = {};
        files.forEach(f => {
            if (f.type !== 'cloud' || !f.article) return;
            
            const article = f.article;
            if (!a[article]) {
                a[article] = {
                    name: article,
                    thumbnail: f.article_thumb || f.thumb || f.url,
                    mtime: f.mtime,
                    categories: {}
                };
            }
            
            // Объединяем категории (mockups, products)
            const cat = f.category || 'other';
            if (!a[article].categories[cat]) {
                a[article].categories[cat] = [];
            }
            a[article].categories[cat].push(f);
            
            if (f.mtime > a[article].mtime) a[article].mtime = f.mtime;
        });
        
        return Object.entries(a)
            .map(([key, val]) => ({ key, ...val }))
            .sort((a, b) => b.mtime - a.mtime);
    }, [files]);

    const handleDownloadArticle = async (article) => {
        if (!article || !Object.keys(article.categories).length) return;
        setIsZipping(true);
        try {
            const zip = new JSZip();
            
            // Создаем папки по категориям
            for (const [catName, fileList] of Object.entries(article.categories)) {
                const catFolder = zip.folder(catName);
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
            saveAs(content, `${article.name}.zip`);
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
        alert('Ссылка скопирована в буфер обмена');
    };

    if (articles.length === 0) {
        return (
            <div className="text-center py-20 text-slate-500">
                <i data-lucide="folder-open" className="w-16 h-16 mx-auto mb-4 opacity-30"></i>
                <p>Нет сохраненных проектов в облаке.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {articles.map(article => (
                <div key={article.key} className="border border-slate-700 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setExpandedArticle(expandedArticle === article.key ? null : article.key)}
                        className="w-full flex items-center gap-4 p-4 bg-slate-800 hover:bg-slate-750 transition-colors text-left"
                    >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900 border border-slate-700">
                            <img src={article.thumbnail} className="w-full h-full object-cover" />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate">{article.name}</h3>
                            <p className="text-xs text-slate-400">
                                {Object.keys(article.categories).length} категорий · {Object.values(article.categories).flat().length} файлов
                            </p>
                        </div>
                        
                        {/* Expand arrow */}
                        <i data-lucide={expandedArticle === article.key ? "chevron-up" : "chevron-down"} className="w-5 h-5 text-slate-400 flex-shrink-0"></i>
                    </button>

                    {expandedArticle === article.key && (
                        <div className="bg-slate-900/30 p-4 space-y-3 border-t border-slate-700">
                            {Object.entries(article.categories).map(([catName, fileList]) => (
                                <div key={catName} className="bg-slate-800 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h4 className="font-medium text-white capitalize">{catName}</h4>
                                            <p className="text-xs text-slate-400">{fileList.length} файлов</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDownloadCategory(article, catName, fileList)}
                                                disabled={isZipping}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors disabled:opacity-50"
                                            >
                                                {isZipping ? <i data-lucide="loader-2" className="animate-spin w-3 h-3"></i> : <i data-lucide="download" className="w-3 h-3"></i>}
                                                <span>Скачать</span>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                        {fileList.map(f => (
                                            <div key={f.name} className="group relative bg-slate-900 rounded-lg overflow-hidden border border-slate-700 aspect-square">
                                                <img src={f.thumb || f.url} loading="lazy" className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewFile(f)} />
                                                <div className="absolute inset-0 bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1">
                                                    <button onClick={() => setPreviewFile(f)} title="Предпросмотр" className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white">
                                                        <i data-lucide="eye" className="w-3 h-3"></i>
                                                    </button>
                                                    <button onClick={() => handleCopyLink(f.url)} title="Копировать ссылку" className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white">
                                                        <i data-lucide="copy" className="w-3 h-3"></i>
                                                    </button>
                                                    <button onClick={() => window.open(f.url, '_blank')} title="Открыть" className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white">
                                                        <i data-lucide="external-link" className="w-3 h-3"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            
                            <button
                                onClick={() => handleDownloadArticle(article)}
                                disabled={isZipping}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm"
                            >
                                {isZipping ? <i data-lucide="loader-2" className="animate-spin w-4 h-4"></i> : <i data-lucide="download" className="w-4 h-4"></i>}
                                <span>Скачать весь проект</span>
                            </button>
                        </div>
                    )}
                </div>
            ))}
            
            {/* Modal Preview */}
            {previewFile && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 fade-in" onClick={() => { setPreviewFile(null); setPreviewZoom(1); }}>
                    <div className="bg-slate-900 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h3 className="font-semibold text-white truncate">{previewFile.name}</h3>
                            <button onClick={() => { setPreviewFile(null); setPreviewZoom(1); }} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                                <i data-lucide="x" className="w-5 h-5"></i>
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
                                    <i data-lucide="zoom-out" className="w-4 h-4"></i>
                                </button>
                                <span className="text-xs text-slate-400 w-12 text-center">{Math.round(previewZoom * 100)}%</span>
                                <button 
                                    onClick={() => setPreviewZoom(Math.min(3, previewZoom + 0.2))}
                                    className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 hover:text-white"
                                    title="Увеличить"
                                >
                                    <i data-lucide="zoom-in" className="w-4 h-4"></i>
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
                                    <i data-lucide="copy" className="w-3 h-3"></i>
                                    Копировать ссылку
                                </button>
                                <button 
                                    onClick={() => window.open(previewFile.url, '_blank')}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white text-xs flex items-center gap-1.5"
                                >
                                    <i data-lucide="external-link" className="w-3 h-3"></i>
                                    Открыть
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
