// js/app.js
// const { useState, useEffect, useCallback } = React;

function App() {
    const { useState, useEffect, useCallback } = React;
    
    // Глобальный обработчик ошибок React
    const [hasError, setHasError] = useState(false);
    const [errorInfo, setErrorInfo] = useState(null);
    
    useEffect(() => {
        const handleError = (error, errorInfo) => {
            console.error('React Error:', error, errorInfo);
            setHasError(true);
            setErrorInfo({ error, errorInfo });
        };
        
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
        });
        
        return () => {
            window.removeEventListener('error', handleError);
        };
    }, []);
    
    const [auth, setAuth] = useState({ isAuth: false, password: '' });
    const [activeTab, setActiveTab] = useState('mockups');
    const [files, setFiles] = useState([]);
    const [products, setProducts] = useState([]);
    const [printsConfig, setPrintsConfig] = useState({});

    // Хук для управления пресетами
    const { presets, savePreset, deletePreset, getPreset, isSingleTransformPreset } = window.usePresets();

    const [selectedPrint, setSelectedPrint] = useState(null);
    const [transforms, setTransforms] = useState({});
    const [productTransforms, setProductTransforms] = useState({});
    const [isExporting, setIsExporting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [mockupsPerRow, setMockupsPerRow] = useState(2);
    const [galleryTab, setGalleryTab] = useState('files');
    const [cloudMode, setCloudMode] = useState('mockups');
    const [isCloudSaving, setIsCloudSaving] = useState(false);
    const [cloudProgress, setCloudProgress] = useState({ total: 0, done: 0, current: '' });

    const handleSavePreset = useCallback((name, printTransforms) => {
         let dataToSave;
         
         // If we have an active product, save ONLY its transform (Universal Preset)
         if (activeProductId) {
             const mapToUse = activeTab === 'products' ? productTransforms : transforms;
             dataToSave = mapToUse[activeProductId] || { x: 0, y: 0, scale: 0.5, rotation: 0 };
         } else {
             // Fallback: save legacy full map (if needed) or use passed printTransforms
             dataToSave = printTransforms || (activeTab === 'products' ? productTransforms : transforms);
         }
         
         savePreset(name, dataToSave);
    }, [presets, transforms, productTransforms, activeProductId, activeTab, savePreset]);

    const handleDeletePreset = useCallback((name) => {
        deletePreset(name);
    }, [deletePreset]);

    const handleApplyPreset = useCallback((name) => {
        const preset = getPreset(name);
        if (!preset) return;

        if (isSingleTransformPreset(preset)) {
            // Если выбран товар, применяем пресет к нему
            if (activeProductId) {
                if (activeTab === 'products') {
                     setProductTransforms(prev => ({ ...prev, [activeProductId]: { ...preset } }));
                } else {
                     setTransforms(prev => ({ ...prev, [activeProductId]: { ...preset } }));
                }
                
                // Update collection if needed
                if (selectedPrint && selectedPrint.id) {
                     const updatedPositions = {
                        ...(selectedPrint.positions || {}),
                        [activeProductId]: { ...preset }
                    };
                    updatePositions(selectedPrint.id, updatedPositions);
                }
            } else {
                alert('Выберите товар для применения пресета');
            }
        } else {
            // Old behavior (Map)
            if (activeTab === 'products') {
                 setProductTransforms(prev => ({ ...prev, ...preset }));
            } else {
                 setTransforms(prev => ({ ...prev, ...preset }));
            }
            
            if (selectedPrint) {
                 const updatedPositions = { ...(selectedPrint.positions || {}), ...preset };
                 updatePositions(selectedPrint.id, updatedPositions);
            }
        }
    }, [getPreset, isSingleTransformPreset, activeTab, selectedPrint, activeProductId, updatePositions]);


    // Хук для управления коллекцией принтов
    const {
        printCollection,
        selectedPrintIds,
        addPrintToCollection,
        selectPrintInCollection,
        removePrintFromCollection,
        updateArticle,
        removeByFileName,
        getPrintsByIds,
        removePrintsByIds,
        updatePositions
    } = window.usePrintCollection();

    const [activeProductId, setActiveProductId] = useState(null);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'

    // Функция для принудительной загрузки конфига (для дебага)
    const handleForceLoadConfig = useCallback(async () => {
        if (!selectedPrint || !auth.isAuth) return;
        
        console.log('🔄 Ручная загрузка конфига...');
        const saved = await window.DataService.loadPrintsConfig(selectedPrint.name);
        
        if (saved && saved.transforms) {
            setTransforms(prev => ({ ...prev, ...saved.transforms }));
            setProductTransforms(prev => ({ ...prev, ...saved.productTransforms }));
            alert('✓ Конфиг загружен!');
        } else {
            alert('❌ Конфиг не найден');
        }
        // Разрешаем автосейв
        isPrintLoadedRef.current = true;
    }, [selectedPrint, auth.isAuth]);

    useEffect(() => {
        if (activeProductId === null && products.length > 0) {
            const firstEnabled = products.find(p => p.enabled);
            if (firstEnabled) setActiveProductId(firstEnabled.id);
        }
    }, [products, activeProductId]);

    const handleLoginSuccess = useCallback((pwd) => {
        window.AuthService.savePassword(pwd);
        setAuth({ isAuth: true, password: pwd });
    }, []);

    // Автовход, если пароль уже сохранен в localStorage
    useEffect(() => {
        let cancelled = false;
        const restoreAuth = async () => {
            const password = await window.AuthService.restoreSession();
            if (cancelled) return;
            if (password) {
                setAuth({ isAuth: true, password });
            }
        };
        restoreAuth();
        return () => { cancelled = true; };
    }, []);

    // Инициализация данных
    const init = useCallback(async () => {
        if (!auth.isAuth) return;
        try {
            const { files: loadedFiles, products: loadedProducts, printsConfig: loadedPrintsConfig } = await window.DataService.initialize();
            
            // Назначаем вкладку, если её нет.
            // Стандартные (не custom) -> mockups, кастомные -> products (как наиболее частый кейс для "мокапов"),
            // но если они уже имеют tab, оставляем как есть.
            const processedProducts = loadedProducts.map(p => {
                if (p.tab) return p;
                
                // Если это стандартный товар (нет custom_ в id) -> 'mockups' (Заготовки)
                if (!p.id.startsWith('custom_')) return { ...p, tab: 'mockups' };
                
                // Если кастомный -> 'products' (Мокапы)
                return { ...p, tab: 'products' };
            });

            setFiles(loadedFiles);
            setProducts(processedProducts);
            setPrintsConfig(loadedPrintsConfig || {});
        } catch (e) {
            console.error('Ошибка инициализации:', e);
        }
    }, [auth.isAuth]);

    useEffect(() => { init(); }, [init]);

    const handleUploadFiles = async (fileList) => {
        if (!fileList || fileList.length === 0) return;
        setIsUploading(true);
        try {
            const uploadedFiles = await window.DataService.uploadFiles(auth.password, fileList);
            if (uploadedFiles) {
                setFiles(prevFiles => [...prevFiles, ...uploadedFiles]);
            }
            await init();
        } catch (error) {
            console.error('Upload failed', error);
            alert('Ошибка загрузки');
        } finally {
            setIsUploading(false);
        }
    };

    // Таймер для автозагрузки
    const autoLoadTimerRef = React.useRef(null);
    const isPrintLoadedRef = React.useRef(false);

    // === ВЫБОР ПРИНТА ===
    const handleSelectPrint = async (file) => {
        if (!file) return;

        isPrintLoadedRef.current = false;
        console.log('Выбор принта:', file.name);
        setSelectedPrint(file);
        
        try {
            // Используем TransformService для загрузки конфига
            await window.TransformService.loadPrintWithConfig(
                file,
                products,
                setTransforms,
                setProductTransforms,
                autoLoadTimerRef,
                isPrintLoadedRef
            );
        } catch (e) {
            console.error('Ошибка выбора принта:', e);
            alert(e.message);
        }
    };

    // Ref для дебаунса сохранения
    const saveTimeoutRef = React.useRef(null);

    // Функция сохранения (вызывается при изменении трансформации)
    const triggerSaveConfig = useCallback((printName, transforms, productTransforms) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        
        setSaveStatus('saving');
        saveTimeoutRef.current = setTimeout(async () => {
             const success = await window.TransformService.savePrintConfig(
                 auth.password,
                 printName,
                 transforms,
                 productTransforms
             );
             setSaveStatus(success ? 'saved' : 'error');
        }, 1000);
    }, [auth.password]);

    // Автосохранение при изменении трансформаций
    useEffect(() => {
        if (!isPrintLoadedRef.current || !selectedPrint || !auth.isAuth) return;
        triggerSaveConfig(selectedPrint.name, transforms, productTransforms);
    }, [transforms, productTransforms, selectedPrint, auth.isAuth, triggerSaveConfig]);

    const handleSaveConfig = async (newProducts) => {
        setProducts(newProducts);
        await window.DataService.saveConfig(auth.password, newProducts);
    };

    const updateProductDPI = (productId, newDPI) => {
        const updatedProducts = products.map(p =>
            p.id === productId ? { ...p, dpi: newDPI } : p
        );
        handleSaveConfig(updatedProducts);
    };

    const addProduct = async (fileList) => {
        const filesArr = Array.from(fileList || []);
        const template = (window.PRODUCTS_DATA && window.PRODUCTS_DATA[0]) || { width: 2000, height: 2000 };
        let newProds = [];

        if (filesArr.length > 0) {
            try {
                const uploadedFiles = await window.DataService.uploadFiles(auth.password, filesArr);
                if (uploadedFiles) {
                    newProds = uploadedFiles.map((uploaded, idx) => ({
                        id: 'custom_' + Date.now() + '_' + idx,
                        name: 'Новый Мокап',
                        category: 'Custom',
                        enabled: true,
                        image: uploaded.url,
                        mask: '',
                        overlay: '',
                        defaultPrefix: 'CUST',
                        width: template.width,
                        height: template.height,
                        tab: activeTab // Привязываем к текущей вкладке
                    }));
                }
            } catch (e) {
                console.error(e);
                alert('Ошибка добавления товара');
                return;
            }
        } else {
             // Создание пустого товара если файлов нет
             newProds = [{
                id: 'custom_' + Date.now(),
                name: 'Новый Мокап',
                category: 'Custom',
                enabled: true,
                image: '',
                mask: '',
                overlay: '',
                defaultPrefix: 'CUST',
                width: template.width,
                height: template.height,
                tab: activeTab
            }];
        }

        if (newProds.length > 0) {
            handleSaveConfig([...products, ...newProds]);
        }
    };

    const handleExportZip = async () => {
        if (!selectedPrint) return alert('Выберите картинку');

        setIsExporting(true);
        try {
            const content = await window.ExportService.exportToZip(
                selectedPrint,
                products,
                transforms,
                productTransforms,
                activeTab
            );
            saveAs(content, `mockups_${selectedPrint.name.split('.')[0]}.zip`);
        } catch (e) {
            console.error(e);
            alert('Ошибка экспорта: ' + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    // === УПРАВЛЕНИЕ КОЛЛЕКЦИЕЙ ПРИНТОВ ===
    const handleAddPrintToCollection = (file) => {
        if (!file) {
            console.warn('handleAddPrintToCollection: файл не передан');
            return;
        }
        
        try {
            console.log('Добавление принта в коллекцию:', file.name);
            addPrintToCollection(file, products, transforms, productTransforms, activeTab);
            console.log('Принт успешно добавлен в коллекцию');
        } catch (e) {
            console.error('Ошибка при добавлении принта в коллекцию:', e);
            alert('Ошибка при добавлении принта в коллекцию: ' + e.message);
        }
    };

    const handleSelectPrintInCollection = async (printId) => {
        // По клику просто выбираем принт (без переключения галочки туда-сюда)
        selectPrintInCollection(printId);

        const print = printCollection.find(p => p.id === printId);
        if (!print) return;

        // Сброс флага автосейва
        isPrintLoadedRef.current = false;

        const normalizedPrint = { ...print, type: print.type || 'upload' };
        setSelectedPrint(normalizedPrint);

        try {
            // Используем TransformService для загрузки конфига
            await window.TransformService.loadPrintWithConfig(
                normalizedPrint,
                products,
                setTransforms,
                setProductTransforms,
                autoLoadTimerRef,
                isPrintLoadedRef
            );
        } catch (err) {
            console.error('Ошибка выбора принта из коллекции:', err);
        }
    };

    const handleRemovePrintFromCollection = (printId) => {
        removePrintFromCollection(printId);
    };

    const handleUpdateArticle = (printId, newArticle) => {
        updateArticle(printId, newArticle);
    };

    // Удаляем все записи о принте, если исходный файл был удален из галереи
    const handleDeleteFileFromGallery = useCallback(async (fileName) => {
        removeByFileName(fileName);
    }, [removeByFileName]);

    const handleSaveCollectionToCloud = useCallback(async (printIds) => {
        const printsToSave = getPrintsByIds(printIds);
        if (printsToSave.length === 0) return alert('Нет выбранных принтов');

        setIsCloudSaving(true);

        try {
            const enabledProducts = products.filter(p => p.enabled);
            if (enabledProducts.length === 0) {
                throw new Error("Нет включенных товаров для сохранения");
            }

            const modeToUse = activeTab === 'base' ? cloudMode : activeTab;

            await window.CollectionService.savePrintsToCloud({
                prints: printsToSave,
                enabledProducts,
                mode: modeToUse,
                transforms,
                productTransforms,
                password: auth.password,
                onProgress: setCloudProgress
            });

            alert(`Готово! ${printsToSave.length} принт(ов) сохранено в облако.`);
            
            // Очищаем коллекцию после успешного сохранения
            removePrintsByIds(printIds);
            
            await init();
        } catch (e) {
            console.error(e);
            alert('Ошибка сохранения: ' + e.message);
        } finally {
            setIsCloudSaving(false);
            setCloudProgress({ total: 0, done: 0, current: '' });
        }
    }, [auth.password, cloudMode, activeTab, products, transforms, productTransforms, printCollection, init, getPrintsByIds, removePrintsByIds]);

    const handleSaveToCloud = useCallback(async (arg) => {
        if (!selectedPrint) return alert('Выберите принт для сохранения');

        const modeToUse = (typeof arg === 'string') ? arg : ((activeTab === 'base' ? cloudMode : activeTab));

        setIsCloudSaving(true);

        try {
            await window.ExportService.saveToCloud(
                selectedPrint,
                products,
                transforms,
                productTransforms,
                auth.password,
                activeTab,
                cloudMode,
                (progress) => {
                    if (typeof progress === 'function') {
                        setCloudProgress(progress);
                    } else {
                        setCloudProgress(progress);
                    }
                }
            );

            alert('Готово! Файлы сохранены в облако.');
            await init();
        } catch (e) {
            console.error(e);
            alert('Ошибка сохранения: ' + e.message);
        } finally {
            setIsCloudSaving(false);
            setCloudProgress({ total: 0, done: 0, current: '' });
        }
    }, [auth.password, cloudMode, activeTab, products, selectedPrint, transforms, productTransforms, init]);

    if (hasError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8">
                <div className="max-w-2xl">
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Произошла ошибка</h1>
                    <pre className="bg-slate-900 p-4 rounded overflow-auto text-sm">
                        {errorInfo ? JSON.stringify(errorInfo, null, 2) : 'Неизвестная ошибка'}
                    </pre>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-4 px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-700"
                    >
                        Перезагрузить страницу
                    </button>
                </div>
            </div>
        );
    }

    if (!auth.isAuth) return <window.LoginScreen onLogin={handleLoginSuccess} />;

    return (
        <div className="min-h-screen pb-60">
            <window.CloudProgress progress={cloudProgress} isVisible={isCloudSaving} />
            <window.Navbar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            <div className="container mx-auto p-4 max-w-[95vw]">
                {activeTab === 'base' ? (
                    <div className="space-y-4">
                        {galleryTab === 'files' ? (
                            <window.Gallery 
                                files={files} 
                                auth={auth} 
                                init={init} 
                                onAddToCollection={handleAddPrintToCollection} 
                                onDeleteFile={handleDeleteFileFromGallery}
                                activeSubTab={galleryTab}
                                onSubTabChange={setGalleryTab}
                            />
                        ) : (
                            <window.CloudSaver 
                                files={files} 
                                password={auth.password} 
                                onChanged={init}
                                activeSubTab={galleryTab}
                                onSubTabChange={setGalleryTab}
                            />
                        )}
                    </div>
                ) : (
                    (() => {
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
                            handleSaveConfig(merged);
                        };

                        return (
                            <div className="responsive-layout flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-140px)] fade-in">
                                {/* ЛЕВАЯ КОЛОНКА (Сайдбар) */}
                                <div className="responsive-sidebar w-full lg:w-72 xl:w-80 flex flex-col gap-4 lg:h-full overflow-y-auto custom-scroll pr-1 shrink-0">
                                    {/* Выбор принта */}
                                    <div
                                        className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col transition-all hover:border-indigo-500/50"
                                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500'); }}
                                        onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500'); }}
                                        onDrop={e => {
                                            e.preventDefault();
                                            e.currentTarget.classList.remove('border-indigo-500');
                                            handleUploadFiles(e.dataTransfer.files);
                                        }}
                                    >
                                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Выберите принт</h3>
                                        <div className="grid md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-2 pr-1">
                                            <div className="aspect-square rounded border border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-700/50 hover:border-indigo-500 transition-all relative bg-slate-900/50">
                                                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleUploadFiles(e.target.files)} disabled={isUploading} />
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
                                                                handleSelectPrint(f);
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
                                                    <div 
                                                        className="add-to-collection-btn absolute inset-0 w-full h-full flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto"
                                                    >
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                console.log('Клик по кнопке плюс в ВЫБЕРИТЕ ПРИНТ');
                                                                console.log('Файл:', f);
                                                                console.log('Функция handleAddPrintToCollection существует?', typeof handleAddPrintToCollection);
                                                                try {
                                                                    handleAddPrintToCollection(f);
                                                                    console.log('handleAddPrintToCollection выполнена успешно');
                                                                } catch (err) {
                                                                    console.error('Ошибка в handleAddPrintToCollection:', err);
                                                                    alert('Ошибка при добавлении: ' + err.message);
                                                                }
                                                            }}
                                                            className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-500/20 border-2 border-indigo-400/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-indigo-500/40 hover:border-indigo-400"
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
                                        onAddPrint={handleAddPrintToCollection}
                                        onSelectPrint={handleSelectPrintInCollection}
                                        onRemovePrint={handleRemovePrintFromCollection}
                                        onUpdateArticle={handleUpdateArticle}
                                        onSaveToCloud={handleSaveCollectionToCloud}
                                        isSaving={isCloudSaving}
                                        onSavePreset={handleSavePreset}
                                    />

                                    {/* Sidebar с товарами */}
                                    <window.Sidebar
                                        products={currentTabProducts}
                                        password={auth.password}
                                        onAddProduct={addProduct}
                                        onSaveConfig={handleSaveTabConfig}
                                        onExport={handleExportZip}
                                        onSaveCloud={handleSaveToCloud}
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
                                                        const isProductsTab = activeTab === 'products';
                                                        const isActive = activeProductId === product.id;

                                                        return (
                                                            <window.MockupGridItem
                                                                key={product.id}
                                                                product={product}
                                                                selectedPrint={selectedPrint}
                                                                transform={currentTransforms[product.id]}
                                                                onUpdateTransform={updateTransform}
                                                                updateProductDPI={updateProductDPI}
                                                                isActive={isActive}
                                                                setActiveProductId={setActiveProductId}
                                                                isProductsTab={isProductsTab}
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
                                        onDPIChange={(newDPI) => activeProductId && updateProductDPI(activeProductId, newDPI)}
                                        activeProductId={activeProductId}
                                        isActive={!!activeProductId}
                                        mockupsPerRow={mockupsPerRow}
                                        setMockupsPerRow={setMockupsPerRow}
                                        presets={presets}
                                        onSavePreset={(name) => handleSavePreset(name, null)} 
                                        onDeletePreset={handleDeletePreset}
                                        onApplyPreset={handleApplyPreset}
                                        saveStatus={saveStatus}
                                        selectedPrint={selectedPrint}
                                        onForceLoadConfig={handleForceLoadConfig}
                                    />
                                </div>
                            </div>
                        );

                    })()
                )}
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
