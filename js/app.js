// js/app.js
// const { useState, useEffect, useCallback } = React;

function App() {
    // Optimized using EditorView component
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

    // Управление классом на body для отключения скролла в режиме редактора
    useEffect(() => {
        if (auth.isAuth && activeTab !== 'base') {
            document.body.classList.add('app-mode-editor');
        } else {
            document.body.classList.remove('app-mode-editor');
        }
        return () => {
             document.body.classList.remove('app-mode-editor');
        };
    }, [activeTab, auth.isAuth]);

    const handleSavePreset = useCallback((name, scope = 'single') => {
         let dataToSave;
         const mapToUse = activeTab === 'products' ? productTransforms : transforms;
         
         if (scope === 'all') {
             // Save configuration for ALL products (current tab)
             dataToSave = { ...mapToUse };
         } else {
            // Save configuration for SINGLE active product
             if (activeProductId) {
                 dataToSave = mapToUse[activeProductId] || { x: 0, y: 0, scale: 0.5, rotation: 0 };
             } else {
                 // Fallback if no active product but single requested
                 alert("Выберите мокап для сохранения его настроек");
                 return;
             }
         }
         
         savePreset(name, dataToSave);
    }, [transforms, productTransforms, activeProductId, activeTab, savePreset]);

    const handleDeletePreset = useCallback((name) => {
        deletePreset(name);
    }, [deletePreset]);

    const handleApplyPreset = useCallback((name, applyToAll = false) => {
        const preset = getPreset(name);
        if (!preset) return;

        if (isSingleTransformPreset(preset)) {
            if (applyToAll) {
                // Apply single preset to ALL active products
                 const targetTransforms = activeTab === 'products' ? productTransforms : transforms;
                 const newTransforms = { ...targetTransforms };
                 let hasChanges = false;
                 
                 products.forEach(p => {
                    // Filter mainly by tab and enabled state
                    const isCorrectTab = activeTab === 'products' ? (p.tab === 'products') : (!p.tab || p.tab === 'mockups');
                    if (isCorrectTab && p.enabled) {
                        newTransforms[p.id] = { ...preset };
                        hasChanges = true;
                    }
                 });

                 if (hasChanges) {
                     if (activeTab === 'products') setProductTransforms(newTransforms);
                     else setTransforms(newTransforms);

                     // Also update current print positions if selected
                     if (selectedPrint && selectedPrint.id) {
                         // We need to merge for all updated keys
                         const combined = { ...(selectedPrint.positions || {}), ...newTransforms };
                         updatePositions(selectedPrint.id, combined);
                     }
                 }

            } else {
                // Apply single preset to SINGLE active product
                if (activeProductId) {
                    if (activeTab === 'products') {
                        setProductTransforms(prev => ({ ...prev, [activeProductId]: { ...preset } }));
                    } else {
                        setTransforms(prev => ({ ...prev, [activeProductId]: { ...preset } }));
                    }
                    
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
            }
        } else {
            // It's a map (Full config) - Apply as is (replace/merge)
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
    }, [getPreset, isSingleTransformPreset, activeTab, selectedPrint, activeProductId, updatePositions, products, productTransforms, transforms]);


    // Хук для управления коллекцией принтов
    const {
        printCollection,
        selectedPrintIds,
        addPrintToCollection,
        selectPrintInCollection,
        removePrintFromCollection,
        updateArticle,
        updatePrintName,
        removeByFileName,
        getPrintsByIds,
        removePrintsByIds,
        updatePositions
    } = window.usePrintCollection();

    const [activeProductId, setActiveProductId] = useState(null);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
    const [maskColor, setMaskColor] = useState(null); // 'idle', color hex

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
            
            await init();
        } catch (e) {
            console.error(e);
            alert('Ошибка сохранения: ' + e.message);
        } finally {
            setIsCloudSaving(false);
            setCloudProgress({ total: 0, done: 0, current: '' });
        }
    }, [auth.password, cloudMode, activeTab, products, transforms, productTransforms, printCollection, init, getPrintsByIds]);

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

            <div className="max-w-[1920px] mx-auto px-4 pb-4">
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
                                galleryType="upload"
                            />
                        ) : galleryTab === 'publication' ? (
                            <window.Gallery 
                                files={files} 
                                auth={auth} 
                                init={init} 
                                onAddToCollection={handleAddPrintToCollection} 
                                onDeleteFile={handleDeleteFileFromGallery}
                                activeSubTab={galleryTab}
                                onSubTabChange={setGalleryTab}
                                galleryType="publication"
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
                    <window.EditorView
                        activeTab={activeTab}
                        products={products}
                        files={files}
                        transforms={transforms}
                        productTransforms={productTransforms}
                        setTransforms={setTransforms}
                        setProductTransforms={setProductTransforms}
                        activeProductId={activeProductId}
                        setActiveProductId={setActiveProductId}
                        selectedPrint={selectedPrint}
                        selectedPrintIds={selectedPrintIds}
                        printCollection={printCollection}
                        mockupsPerRow={mockupsPerRow}
                        setMockupsPerRow={setMockupsPerRow}
                        isUploading={isUploading}
                        isExporting={isExporting}
                        isCloudSaving={isCloudSaving}
                        saveStatus={saveStatus}
                        maskColor={maskColor}
                        setMaskColor={setMaskColor}
                        presets={presets}
                        auth={auth}

                        onUploadFiles={handleUploadFiles}
                        onSelectPrint={handleSelectPrint}
                        onAddPrintToCollection={handleAddPrintToCollection}
                        onSelectPrintInCollection={handleSelectPrintInCollection}
                        onRemovePrintFromCollection={handleRemovePrintFromCollection}
                        onUpdateArticle={handleUpdateArticle}
                        onUpdatePrintName={(printId, newName) => updatePrintName(printId, newName)}
                        onSaveCollectionToCloud={handleSaveCollectionToCloud}
                        onSavePreset={handleSavePreset}
                        onDeletePreset={handleDeletePreset}
                        onApplyPreset={handleApplyPreset}
                        onForceLoadConfig={handleForceLoadConfig}
                        onSaveConfig={handleSaveConfig}
                        onExportZip={handleExportZip}
                        onSaveToCloud={handleSaveToCloud}
                        onAddProduct={addProduct}
                        onUpdateProductDPI={updateProductDPI}

                        triggerSaveConfig={triggerSaveConfig}
                        updatePositions={updatePositions}
                    />
                )}
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
