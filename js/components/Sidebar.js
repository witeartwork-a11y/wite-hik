// js/components/Sidebar.js
const { useState, useMemo } = React;

// --- ОСНОВНОЙ САЙДБАР ---
window.Sidebar = ({ products, password, onAddProduct, onSaveConfig, onExport, onSaveCloud, isExporting, activeTab }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Фильтрация
    const filteredProducts = products.filter(p => {
        return p.name.toLowerCase().includes(searchTerm.toLowerCase());
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
        <div className="flex flex-col gap-4">
            
            {/* Панель управления и фильтров */}
            <div className="flex flex-col gap-3 glass-card rounded-xl p-4">
                
                {/* Кнопки создания */}
                <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-indigo-500/25 font-medium group text-xs">
                        <window.Icon name="upload" className="w-3.5 h-3.5" />
                        <span>Из файла</span>
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            className="hidden" 
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    onAddProduct(e.target.files);
                                    e.target.value = '';
                                }
                            }} 
                        />
                    </label>
                    <button
                        onClick={() => onAddProduct()} 
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer transition-all shadow-sm font-medium group text-xs border border-slate-600"
                    >
                        <window.Icon name="plus" className="w-3.5 h-3.5" />
                        <span>Пустой</span>
                    </button>
                </div>

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
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {activeTab === 'mockups' ? 'Список заготовок' : 'Список мокапов'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">{filteredProducts.length} шт.</span>
            </div>

            {/* Список товаров */}
            <div className="space-y-3 px-1 -mx-1">
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
                        activeTab={activeTab}
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
