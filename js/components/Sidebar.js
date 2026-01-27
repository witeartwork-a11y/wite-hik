// js/components/Sidebar.js
const { useState, useMemo } = React;

const ProductCard = ({ 
    product, 
    index, 
    totalProducts, 
    onToggle, 
    onDelete, 
    onUpdate, 
    onMove, 
    onDuplicate, 
    password 
}) => {
    const { useState, useEffect, useRef } = React;
    const [isEditing, setIsEditing] = useState(false);
    const [localName, setLocalName] = useState(product.name);
    const [isEditingResolution, setIsEditingResolution] = useState(false);
    const [localWidth, setLocalWidth] = useState(product.width);
    const [localHeight, setLocalHeight] = useState(product.height);
    const resolutionContainerRef = useRef(null);

    // Синхронизируем локальные значения при изменении продукта
    useEffect(() => {
        setLocalName(product.name);
        setLocalWidth(product.width);
        setLocalHeight(product.height);
    }, [product.id]);

    // Обработчик для закрытия режима редактирования при клике вне контейнера
    useEffect(() => {
        if (!isEditingResolution) return;
        
        const handleClickOutside = (e) => {
            if (resolutionContainerRef.current && !resolutionContainerRef.current.contains(e.target)) {
                setIsEditingResolution(false);
                onUpdate(product.id, { width: localWidth, height: localHeight });
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditingResolution, localWidth, localHeight, product.id, onUpdate]);

    // Загрузка файлов (маска/оверлей)
    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if(!file) return;
        
        // Показываем, что грузим (можно добавить лоадер, но пока просто алерт если долго)
        const formData = new FormData();
        formData.append('files', file);
        formData.append('password', password);
        formData.append('type', 'asset'); // Указываем, что это asset (маска/оверлей)
        formData.append('assetType', type); // mask или overlay
        
        try {
            const res = await fetch('/api.php?action=upload', { method:'POST', body: formData });
            const data = await res.json();
            if(data.success) {
                onUpdate(product.id, { [type]: data.files[0].url });
            } else {
                alert('Ошибка загрузки: ' + (data.message || 'Unknown'));
            }
        } catch(err) {
            console.error(err);
        } finally {
            // Сбрасываем значение input, чтобы можно было загрузить файл повторно
            e.target.value = '';
        }
    };

    // Удаление маски/оверлея
    const handleFileDelete = async (type, fileUrl) => {
        if (!fileUrl) return;
        
        // Удаляем из конфига
        onUpdate(product.id, { [type]: '' });
        
        // Удаляем файл с сервера
        try {
            await fetch('/api.php?action=delete', {
                method: 'POST',
                body: JSON.stringify({
                    password: password,
                    filename: fileUrl,
                    isAsset: true
                })
            });
        } catch(err) {
            console.error('Ошибка удаления файла:', err);
        }
    };

    return (
        <div className={`
            relative rounded-xl border transition-all duration-200 group
            ${product.enabled 
                ? 'bg-slate-800/80 border-slate-700 shadow-sm' 
                : 'bg-slate-900/40 border-slate-800 opacity-75 hover:opacity-100'}
        `}>
            {/* --- ШАПКА КАРТОЧКИ --- */}
            <div className="p-3 flex items-center gap-3 border-b border-slate-700/50">
                {/* Чекбокс */}
                <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(product.id); }}
                    className={`
                        w-5 h-5 rounded border flex items-center justify-center transition-colors
                        ${product.enabled 
                            ? 'bg-indigo-500 border-indigo-500 text-white' 
                            : 'border-slate-600 hover:border-slate-500 bg-transparent'}
                    `}
                >
                    {product.enabled && <span><window.Icon name="check" className="w-3.5 h-3.5" /></span>}
                </button>

                {/* Название (Редактируемое) */}
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input 
                            value={localName}
                            onChange={(e) => setLocalName(e.target.value)}
                            onBlur={() => { setIsEditing(false); onUpdate(product.id, {name: localName}); }}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            autoFocus
                            className="w-full bg-slate-900 border border-indigo-500 rounded px-1.5 py-0.5 text-sm text-white outline-none"
                        />
                    ) : (
                        <div className="flex items-center gap-2 group/name cursor-pointer" onClick={() => setIsEditing(true)}>
                            <span className="text-sm font-medium text-slate-200 truncate">{product.name}</span>
                            <window.Icon name="pencil" className="w-3 h-3 text-slate-600 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                        </div>
                    )}
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex gap-2 items-center">
                        {isEditingResolution ? (
                            <div ref={resolutionContainerRef} className="flex gap-1 items-center">
                                <input 
                                    type="number"
                                    value={localWidth}
                                    onChange={(e) => setLocalWidth(parseInt(e.target.value) || 1)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setIsEditingResolution(false);
                                            onUpdate(product.id, { width: localWidth, height: localHeight });
                                        }
                                    }}
                                    autoFocus
                                    className="w-12 bg-slate-900 border border-indigo-500 rounded px-1 py-0.5 text-[10px] text-white outline-none"
                                />
                                <span className="text-slate-400">x</span>
                                <input 
                                    type="number"
                                    value={localHeight}
                                    onChange={(e) => setLocalHeight(parseInt(e.target.value) || 1)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setIsEditingResolution(false);
                                            onUpdate(product.id, { width: localWidth, height: localHeight });
                                        }
                                    }}
                                    className="w-12 bg-slate-900 border border-indigo-500 rounded px-1 py-0.5 text-[10px] text-white outline-none"
                                />
                                <span>px</span>
                            </div>
                        ) : (
                            <span className="cursor-pointer hover:text-slate-300 transition-colors group/res flex items-center gap-1" onClick={() => setIsEditingResolution(true)}>
                                {product.width}x{product.height}px
                                <window.Icon name="pencil" className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover/res:opacity-100 transition-opacity" />
                            </span>
                        )}
                        <span>|</span>
                        <span>{product.category}</span>
                    </div>
                </div>

                {/* Кнопка удаления */}
                <button 
                    onClick={() => onDelete(product.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Удалить"
                >
                    <window.Icon name="trash-2" className="w-4 h-4" />
                </button>
            </div>

            {/* --- ТЕЛО КАРТОЧКИ (Настройки) --- */}
            {product.enabled && (
                <div className="p-3 space-y-3 bg-slate-900/20">
                    
                    {/* Ряд 1: Управление позицией и дублирование */}
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-800 rounded-md border border-slate-700 p-0.5">
                            <button 
                                disabled={index === 0}
                                onClick={() => onMove(index, 'up')}
                                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                            >
                                <window.Icon name="arrow-up" className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px bg-slate-700 my-1"></div>
                            <button 
                                disabled={index === totalProducts - 1}
                                onClick={() => onMove(index, 'down')}
                                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                            >
                                <window.Icon name="arrow-down" className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <button 
                            onClick={() => onDuplicate(product)}
                            className="p-1.5 px-2 bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-md text-xs flex items-center gap-1.5 transition-all"
                        >
                            <window.Icon name="copy" className="w-3.5 h-3.5" />
                            <span>Дубль</span>
                        </button>
                        
                        {/* Префикс */}
                        <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-md px-2 py-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">PRE</span>
                            <input 
                                type="text" 
                                value={product.defaultPrefix || ''}
                                onChange={(e) => onUpdate(product.id, { defaultPrefix: e.target.value })}
                                className="w-full bg-transparent text-xs text-white outline-none font-mono"
                                placeholder="SKU"
                            />
                        </div>
                    </div>

                    {/* Ряд 2: Загрузчики (Маска и Оверлей) */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Маска */}
                        <div className="relative">
                            <label className={`
                                flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-dashed cursor-pointer transition-all
                                ${product.mask 
                                    ? 'bg-indigo-500/10 border-indigo-500/50' 
                                    : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-700'}
                            `}>
                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                    <window.Icon name="layers" className={`w-3.5 h-3.5 ${product.mask ? 'text-indigo-400' : 'text-slate-400'}`} />
                                    <span className={product.mask ? 'text-indigo-300' : 'text-slate-400'}>Маска</span>
                                </div>
                                <input type="file" className="hidden" accept="image/png" onChange={e => handleFileUpload(e, 'mask')} />
                            </label>
                            {product.mask && (
                                <button onClick={() => handleFileDelete('mask', product.mask)} className="absolute -top-1 -right-1 bg-slate-900 text-red-400 border border-slate-700 rounded-full p-0.5 hover:bg-red-400 hover:text-white transition-colors">
                                    <window.Icon name="x" className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Оверлей */}
                        <div className="relative">
                            <label className={`
                                flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-dashed cursor-pointer transition-all
                                ${product.overlay 
                                    ? 'bg-indigo-500/10 border-indigo-500/50' 
                                    : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-700'}
                            `}>
                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                    <window.Icon name="eye" className={`w-3.5 h-3.5 ${product.overlay ? 'text-indigo-400' : 'text-slate-400'}`} />
                                    <span className={product.overlay ? 'text-indigo-300' : 'text-slate-400'}>Оверлей</span>
                                </div>
                                <input type="file" className="hidden" accept="image/png" onChange={e => handleFileUpload(e, 'overlay')} />
                            </label>
                            {product.overlay && (
                                <button onClick={() => handleFileDelete('overlay', product.overlay)} className="absolute -top-1 -right-1 bg-slate-900 text-red-400 border border-slate-700 rounded-full p-0.5 hover:bg-red-400 hover:text-white transition-colors">
                                    <window.Icon name="x" className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

// --- ОСНОВНОЙ САЙДБАР ---
window.Sidebar = ({ products, password, onAddProduct, onSaveConfig, onExport, onSaveCloud, isExporting }) => {
    const [selectedCategory, setSelectedCategory] = useState('Все');
    const [searchTerm, setSearchTerm] = useState('');

    // Получаем список категорий из товаров
    const categories = useMemo(() => {
        const cats = new Set(['Все']);
        if (window.CATEGORIES_RU) {
            Object.values(window.CATEGORIES_RU).forEach(c => cats.add(c));
        }
        products.forEach(p => p.category && cats.add(p.category));
        return Array.from(cats);
    }, [products]);

    // Фильтрация
    const filteredProducts = products.filter(p => {
        const matchCat = selectedCategory === 'Все' || p.category === selectedCategory;
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchCat && matchSearch;
    });

    // Хендлеры для карточки
    const handleUpdate = (id, updates) => {
        const newProducts = products.map(p => p.id === id ? { ...p, ...updates } : p);
        onSaveConfig(newProducts);
    };

    const handleToggle = (id) => {
        const newProducts = products.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p);
        onSaveConfig(newProducts);
    };

    const handleDelete = (id) => {
        if(!confirm('Удалить этот мокап?')) return;
        const newProducts = products.filter(p => p.id !== id);
        onSaveConfig(newProducts);
    };

    // Выделить все товары
    const handleSelectAll = () => {
        const updatedProducts = products.map(p => ({ ...p, enabled: true }));
        onSaveConfig(updatedProducts);
    };

    // Снять выделение со всех товаров
    const handleDeselectAll = () => {
        const updatedProducts = products.map(p => ({ ...p, enabled: false }));
        onSaveConfig(updatedProducts);
    };

    const handleMove = (index, direction) => {
        if (selectedCategory !== 'Все') {
            alert('Сортировка доступна только в категории "Все"');
            return;
        }

        const newProducts = [...products];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newProducts.length) return;
        
        [newProducts[index], newProducts[targetIndex]] = [newProducts[targetIndex], newProducts[index]];
        onSaveConfig(newProducts);
    };

    const handleDuplicate = (product) => {
        const newProd = {
            ...product,
            id: 'copy_' + Date.now(),
            name: product.name + ' (Копия)',
            enabled: true
        };
        const index = products.findIndex(p => p.id === product.id);
        const newProducts = [...products];
        newProducts.splice(index + 1, 0, newProd);
        onSaveConfig(newProducts);
    };

    return (
        <div className="flex flex-col h-full gap-4">
            
            {/* Панель управления и фильтров */}
            <div className="flex flex-col gap-3 glass-card rounded-xl p-4">
                
                {/* Глобальные действия (Зип и Облако) */}
                 <div className="grid grid-cols-2 gap-3 mb-1">
                     <button
                        onClick={onSaveCloud}
                        disabled={isExporting}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold uppercase tracking-wide transition-all shadow-lg shadow-indigo-500/20 transform hover:-translate-y-0.5"
                     >
                        <window.Icon name="cloud-upload" className="w-4 h-4" />
                        <span>В облако</span>
                     </button>
                     
                     <button
                        onClick={onExport}
                        disabled={isExporting}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold uppercase tracking-wide transition-all shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5"
                     >
                        {isExporting ? <window.Icon name="loader-2" className="w-4 h-4 animate-spin" /> : <window.Icon name="download" className="w-4 h-4" />}
                        <span>{isExporting ? 'ZIP...' : 'Скачать ZIP'}</span>
                     </button>
                </div>

                <div className="h-px bg-white/10 w-full"></div>

                {/* Поиск */}
                <div className="relative group">
                    <window.Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Поиск мокапов..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-600"
                    />
                </div>

                {/* Категории */}
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scroll touch-pan-x">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`
                                whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all shadow-sm
                                ${selectedCategory === cat 
                                    ? 'bg-indigo-500 text-white shadow-indigo-500/25' 
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'}
                            `}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Массовые действия */}
                <div className="flex gap-2">
                    <button
                        onClick={handleSelectAll}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-[10px] font-medium text-slate-400 hover:bg-slate-700 hover:border-indigo-500/30 hover:text-white transition-all"
                    >
                        <window.Icon name="check-square" className="w-3.5 h-3.5" />
                        <span>Выделить все</span>
                    </button>
                    <button
                        onClick={handleDeselectAll}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-[10px] font-medium text-slate-400 hover:bg-slate-700 hover:border-red-500/30 hover:text-white transition-all"
                    >
                        <window.Icon name="square" className="w-3.5 h-3.5" />
                        <span>Снять все</span>
                    </button>
                </div>
            </div>

            {/* Заголовок списка */}
            <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Список мокапов</span>
                <span className="text-[10px] font-mono text-slate-500">{filteredProducts.length} шт.</span>
            </div>

            {/* Список товаров */}
            <div className="flex-1 space-y-3 overflow-y-auto px-1 -mx-1 custom-scroll">
                {filteredProducts.map((p, idx) => (
                    <ProductCard 
                        key={p.id}
                        product={p}
                        index={idx}
                        totalProducts={filteredProducts.length}
                        password={password}
                        onToggle={handleToggle}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        onMove={handleMove}
                        onDuplicate={handleDuplicate}
                    />
                ))}
                
                {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3 border-2 border-dashed border-slate-800 rounded-xl">
                        <window.Icon name="search-x" className="w-8 h-8 opacity-50" />
                        <span className="text-xs">Ничего не найдено</span>
                    </div>
                )}
            </div>
        </div>
    );
};
