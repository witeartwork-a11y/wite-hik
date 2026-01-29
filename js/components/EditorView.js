// js/components/EditorView.js

function EditorView({
    activeTab,
    products,
    files,
    transforms,
    productTransforms,
    setTransforms,
    setProductTransforms,
    activeProductId,
    setActiveProductId,
    selectedPrint,
    selectedPrintIds,
    printCollection,
    mockupsPerRow,
    setMockupsPerRow,
    isUploading,
    isExporting,
    isCloudSaving,
    saveStatus,
    maskColor,
    setMaskColor,
    presets,
    auth,
    
    // Handlers
    onUploadFiles,
    onSelectPrint,
    onAddPrintToCollection,
    onSelectPrintInCollection,
    onRemovePrintFromCollection,
    onUpdateArticle,
    onSaveCollectionToCloud,
    onSavePreset,
    onDeletePreset,
    onApplyPreset,
    onForceLoadConfig,
    onSaveConfig,
    onExportZip,
    onSaveToCloud,
    onAddProduct,
    onUpdateProductDPI,
    
    // Context/Helper needed
    triggerSaveConfig,
    updatePositions
}) {
    const isProductsTab = activeTab === 'products';
    const currentTransforms = isProductsTab ? productTransforms : transforms;
    
    // Фильтруем товары для текущей вкладки
    const currentTabProducts = products.filter(p => (p.tab === activeTab));

    const updateTransform = (id, newT) => {
        let nextTransforms = { ...currentTransforms };
        nextTransforms[id] = newT;

        // Обновляем стейт
        if (isProductsTab) {
            setProductTransforms(prev => ({ ...prev, [id]: newT }));
        } else {
            setTransforms(prev => ({ ...prev, [id]: newT }));
        }

        // Сохраняем в коллекцию (для сессии)
        if (selectedPrint && selectedPrint.id) {
            const updatedPositions = {
                ...(selectedPrint.positions || {}),
                [id]: newT
            };
            updatePositions(selectedPrint.id, updatedPositions);
        }

        // Вызываем явное сохранение на сервер (debounced)
        if (selectedPrint) {
            const fullTransforms = isProductsTab ? transforms : nextTransforms;
            const fullProductTransforms = isProductsTab ? nextTransforms : productTransforms;
            
            triggerSaveConfig(selectedPrint.name, {
                transforms: fullTransforms,
                productTransforms: fullProductTransforms
            });
        }
    };
    
    // Обработчик сохранения конфига только для текущей вкладки
    const handleSaveTabConfig = (newTabProds) => {
        // Берем товары из ДРУГИХ вкладок
        const otherProds = products.filter(p => p.tab !== activeTab);
        // Объединяем
        const merged = [...otherProds, ...newTabProds];
        onSaveConfig(merged);
    };

    return (
        <div className="responsive-layout flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-140px)] fade-in">
            {/* ЛЕВАЯ КОЛОНКА (Сайдбар) */}
            <div className="responsive-sidebar w-full lg:w-72 xl:w-80 flex flex-col gap-4 lg:h-full overflow-y-auto custom-scroll pr-1 shrink-0">
                {/* Выбор принта */}
                <div
                    className="glass-card rounded-xl p-4 flex flex-col hover-lift"
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500'); }}
                    onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500'); }}
                    onDrop={e => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-indigo-500');
                        onUploadFiles(e.dataTransfer.files);
                    }}
                >
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Выберите принт</h3>
                    <div className="grid md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-2 pr-1">
                        <div className="upload-zone">
                            <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => onUploadFiles(e.target.files)} disabled={isUploading} />
                            {isUploading ? <window.Icon name="loader-2" className="w-6 h-6 text-indigo-400 animate-spin" /> : <window.Icon name="plus" className="w-6 h-6 text-slate-500" />}
                        </div>
                        {files.filter(f => f.type === 'upload').sort((a, b) => (b.mtime || 0) - (a.mtime || 0)).slice(0, 7).map(f => (
                            <div 
                                key={f.name} 
                                className={`aspect-square rounded border overflow-hidden bg-slate-900 relative group ${selectedPrint?.name === f.name ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-slate-700'}`}
                            >
                                {/* Изображение с областью клика для выбора */}
                                <div 
                                    className="w-full h-full cursor-pointer"
                                    onClick={(e) => {
                                        // Проверяем что не кликнули по кнопке добавления
                                        if (!e.target.closest('.add-to-collection-btn')) {
                                            onSelectPrint(f);
                                        }
                                    }}
                                >
                                    <img 
                                        src={f.thumb || f.url} 
                                        loading="lazy" 
                                        className="w-full h-full object-cover pointer-events-none" 
                                    />
                                </div>
                                
                                {/* Кнопка добавления в коллекцию (по центру, полупрозрачная) */}
                                <div className="visible-on-hover absolute inset-0 w-full h-full flex items-center justify-center overlay-dark">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            try {
                                                onAddPrintToCollection(f);
                                            } catch (err) {
                                                console.error('Ошибка в handleAddPrintToCollection:', err);
                                                alert('Ошибка при добавлении: ' + err.message);
                                            }
                                        }}
                                        className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-500/20 border-2 border-indigo-400/40 hover:bg-indigo-500/40 hover:border-indigo-400"
                                        title="Добавить в коллекцию"
                                    >
                                        <window.Icon name="plus" className="w-6 h-6 text-white" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Коллекция принтов для облака */}
                <window.PrintCollection
                    prints={printCollection}
                    selectedPrints={selectedPrintIds}
                    onAddPrint={onAddPrintToCollection}
                    onSelectPrint={onSelectPrintInCollection}
                    onRemovePrint={onRemovePrintFromCollection}
                    onUpdateArticle={onUpdateArticle}
                    onSaveToCloud={onSaveCollectionToCloud}
                    isSaving={isCloudSaving}
                    onSavePreset={onSavePreset}
                />

                {/* Sidebar с товарами */}
                <window.Sidebar
                    products={currentTabProducts}
                    password={auth.password}
                    onAddProduct={onAddProduct}
                    onSaveConfig={handleSaveTabConfig}
                    onExport={onExportZip}
                    onSaveCloud={onSaveToCloud}
                    isExporting={isExporting}
                    activeTab={activeTab}
                />
            </div>

            {/* ЦЕНТР (Рабочая область) */}
            <div className="responsive-canvas-area flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-y-auto custom-scroll p-4 pb-8 space-y-4">
                {!selectedPrint ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                            <window.Icon name="image" className="w-8 h-8 opacity-50" />
                        </div>
                        <p>Выберите изображение слева, чтобы начать работу</p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-3">
                                {/* Controls moved to right panel */}
                        </div>

                        {currentTabProducts.filter(p => p.enabled).length === 0 ? (
                            <div className="col-span-full h-80 flex flex-col items-center justify-center text-slate-500 gap-4">
                                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                                    <window.Icon name="eye-off" className="w-8 h-8 opacity-50" />
                                </div>
                                <p>Все мокапы отключены</p>
                                <p className="text-xs">Включите мокапы в списке слева галочкой</p>
                            </div>
                        ) : (
                            <div className="responsive-canvas-grid grid gap-6" style={{ gridTemplateColumns: `repeat(${mockupsPerRow}, 1fr)` }}>
                                {currentTabProducts.filter(p => p.enabled).map(product => {
                                    const isActive = activeProductId === product.id;

                                    return (
                                        <window.MockupGridItem
                                            key={product.id}
                                            product={product}
                                            selectedPrint={selectedPrint}
                                            transform={currentTransforms[product.id]}
                                            onUpdateTransform={updateTransform}
                                            updateProductDPI={onUpdateProductDPI}
                                            isActive={isActive}
                                            setActiveProductId={setActiveProductId}
                                            isProductsTab={isProductsTab}
                                            maskColor={maskColor}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ПРАВАЯ КОЛОНКА (Настройки) */}
            <div className="responsive-sidebar w-full lg:w-64 bg-slate-900/50 rounded-xl border border-slate-800 shrink-0 lg:h-full overflow-y-auto custom-scroll max-h-[calc(100vh-200px)]">
                <window.TransformPanel 
                    transform={activeProductId ? (currentTransforms[activeProductId] || { x: 0, y: 0, scale: 0.5, rotation: 0 }) : null}
                    onUpdateTransform={(newT) => activeProductId && updateTransform(activeProductId, newT)}
                    dpi={activeProductId ? products.find(p => p.id === activeProductId)?.dpi : 300}
                    onDPIChange={(newDPI) => activeProductId && onUpdateProductDPI(activeProductId, newDPI)}
                    activeProductId={activeProductId}
                    isActive={!!activeProductId}
                    mockupsPerRow={mockupsPerRow}
                    setMockupsPerRow={setMockupsPerRow}
                    presets={presets}
                    onSavePreset={(name) => onSavePreset(name, null)} 
                    onDeletePreset={onDeletePreset}
                    onApplyPreset={onApplyPreset}
                    saveStatus={saveStatus}
                    selectedPrint={selectedPrint}
                    onForceLoadConfig={onForceLoadConfig}
                    maskColor={maskColor}
                    setMaskColor={setMaskColor}
                />
            </div>
        </div>
    );
}

window.EditorView = EditorView;
