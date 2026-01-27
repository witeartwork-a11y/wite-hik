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
    
    // Presets state
    const [presets, setPresets] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('user_transform_presets') || '{}');
        } catch (e) {
            return {};
        }
    });

    const handleSavePreset = useCallback((name, printTransforms) => {
         // If printTransforms is passed (from PrintCollection), use it.
         // Otherwise use current 'transforms' state.
         const dataToSave = printTransforms || transforms;
         
         const newPresets = { ...presets, [name]: dataToSave };
         setPresets(newPresets);
         localStorage.setItem('user_transform_presets', JSON.stringify(newPresets));
    }, [presets, transforms]);

    const handleDeletePreset = useCallback((name) => {
        const newPresets = { ...presets };
        delete newPresets[name];
        setPresets(newPresets);
        localStorage.setItem('user_transform_presets', JSON.stringify(newPresets));
    }, [presets]);

    const handleApplyPreset = useCallback((name) => {
        const preset = presets[name];
        if (!preset) return;
        
        // If it's a full map of product_id -> transform
        if (activeTab === 'products') {
             setProductTransforms(prev => ({ ...prev, ...preset }));
        } else {
             setTransforms(prev => ({ ...prev, ...preset }));
        }
        
        // Update active print positions too if selected
        if (selectedPrint) {
             setPrintCollection(prev => prev.map(p => {
                if (p.id !== selectedPrint.id) return p;
                return { ...p, positions: { ...(p.positions || {}), ...preset } };
            }));
        }
    }, [presets, activeTab, selectedPrint]);


    // Состояние для коллекции принтов
    const [printCollection, setPrintCollection] = useState([]);
    const [selectedPrintIds, setSelectedPrintIds] = useState([]);
    const [activeProductId, setActiveProductId] = useState(null);

    // Установка активного мокапа по умолчанию при загрузке или смене visibility
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
            const { files: loadedFiles, products: loadedProducts } = await window.DataService.initialize();
            setFiles(loadedFiles);
            setProducts(loadedProducts);
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

    // === ВЫБОР ПРИНТА ===
    const handleSelectPrint = async (file) => {
        if (!file) {
            console.warn('handleSelectPrint: файл не передан');
            return;
        }
        
        console.log('Выбор принта:', file.name);
        
        try {
            setSelectedPrint(file);
            
            if (!window.RenderService) {
                console.error('RenderService не загружен');
                alert('Ошибка: RenderService не загружен. Обновите страницу.');
                return;
            }
            
            const newTransforms = await window.RenderService.initializeTransforms(file, products, 'mockups');
            const newProductTransforms = await window.RenderService.initializeTransforms(file, products, 'products');
            
            console.log('Трансформации успешно инициализированы');
            
            setTransforms(newTransforms);
            setProductTransforms(newProductTransforms);
        } catch (e) {
            console.error('Ошибка при выборе принта:', e);
            alert('Ошибка при выборе принта: ' + e.message);
            
            // Откатываем состояние
            setSelectedPrint(null);
            
            if (window.RenderService && window.RenderService.buildDefaultTransforms) {
                try {
                    const defaults = window.RenderService.buildDefaultTransforms(products);
                    setTransforms(defaults);
                    setProductTransforms(defaults);
                } catch (err) {
                    console.error('Ошибка при создании дефолтных трансформаций:', err);
                }
            }
        }
    };

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
        if (filesArr.length === 0) return;
        try {
            const uploadedFiles = await window.DataService.uploadFiles(auth.password, filesArr);
            if (uploadedFiles) {
                const template = (window.PRODUCTS_DATA && window.PRODUCTS_DATA[0]) || { width: 2000, height: 2000 };
                const newProds = uploadedFiles.map((uploaded, idx) => ({
                    id: 'custom_' + Date.now() + '_' + idx,
                    name: 'Новый Мокап',
                    category: 'Custom',
                    enabled: true,
                    image: uploaded.url,
                    mask: '',
                    overlay: '',
                    defaultPrefix: 'CUST',
                    width: template.width,
                    height: template.height
                }));
                handleSaveConfig([...products, ...newProds]);
            }
        } catch (e) {
            console.error(e);
            alert('Ошибка добавления товара');
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
            
            const printId = 'print_' + Date.now();
            // Сохраняем позиции всех включенных товаров
            const enabledProducts = products.filter(p => p.enabled);
            const positions = {};
            
            enabledProducts.forEach(prod => {
                const currentTransforms = activeTab === 'products' ? productTransforms : transforms;
                positions[prod.id] = currentTransforms[prod.id] || { x: 0, y: 0, scale: 0.5, rotation: 0 };
            });
            
            setPrintCollection(prev => [...prev, {
                id: printId,
                name: file.name,
                url: file.url,
                thumb: file.thumb || file.url,
                article: file.name.split('.')[0],
                positions: positions
            }]);
            
            setSelectedPrintIds(prev => [...prev, printId]);
            
            console.log('Принт успешно добавлен в коллекцию');
        } catch (e) {
            console.error('Ошибка при добавлении принта в коллекцию:', e);
            alert('Ошибка при добавлении принта в коллекцию: ' + e.message);
        }
    };

    const handleSelectPrintInCollection = async (printId) => {
        // По клику просто выбираем принт (без переключения галочки туда-сюда)
        setSelectedPrintIds(prev => (prev.includes(printId) ? prev : [...prev, printId]));

        const print = printCollection.find(p => p.id === printId);
        if (!print) return;

        const normalizedPrint = { ...print, type: print.type || 'upload' };
        setSelectedPrint(normalizedPrint);

        try {
            if (print.positions && Object.keys(print.positions).length > 0) {
                setTransforms(print.positions);
                setProductTransforms(print.positions);
            } else if (window.RenderService) {
                const newTransforms = await window.RenderService.initializeTransforms(normalizedPrint, products, 'mockups');
                const newProductTransforms = await window.RenderService.initializeTransforms(normalizedPrint, products, 'products');
                setTransforms(newTransforms);
                setProductTransforms(newProductTransforms);
            }
        } catch (err) {
            console.error('Ошибка выбора принта из коллекции:', err);
        }
    };

    const handleRemovePrintFromCollection = (printId) => {
        setPrintCollection(prev => prev.filter(p => p.id !== printId));
        setSelectedPrintIds(prev => prev.filter(id => id !== printId));
    };

    const handleUpdateArticle = (printId, newArticle) => {
        setPrintCollection(prev => 
            prev.map(p => p.id === printId ? { ...p, article: newArticle } : p)
        );
    };

    // Удаляем все записи о принте, если исходный файл был удален из галереи
    const handleDeleteFileFromGallery = useCallback(async (fileName) => {
        setPrintCollection(prev => {
            const next = prev.filter(p => p.name !== fileName);
            setSelectedPrintIds(ids => ids.filter(id => next.some(p => p.id === id)));
            return next;
        });
    }, []);

    const handleSaveCollectionToCloud = useCallback(async (printIds) => {
        const printsToSave = printCollection.filter(p => printIds.includes(p.id));
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
            setPrintCollection(prev => prev.filter(p => !printIds.includes(p.id)));
            setSelectedPrintIds([]);
            
            await init();
        } catch (e) {
            console.error(e);
            alert('Ошибка сохранения: ' + e.message);
        } finally {
            setIsCloudSaving(false);
            setCloudProgress({ total: 0, done: 0, current: '' });
        }
    }, [auth.password, cloudMode, activeTab, products, transforms, productTransforms, printCollection, init]);

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
        <div className="min-h-screen pb-10">
            <window.CloudProgress progress={cloudProgress} isVisible={isCloudSaving} />
            <window.Navbar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            <div className="container mx-auto p-4 max-w-[95vw]">
                {activeTab === 'base' ? (
                    <div className="space-y-4">
                        <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5 w-fit">
                            <button onClick={() => setGalleryTab('files')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${galleryTab === 'files' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                                Файлы
                            </button>
                            <button onClick={() => setGalleryTab('cloud')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${galleryTab === 'cloud' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                                Облако
                            </button>
                        </div>

                        {galleryTab === 'files' ? (
                            <window.Gallery 
                                files={files} 
                                auth={auth} 
                                init={init} 
                                onAddToCollection={handleAddPrintToCollection} 
                                onDeleteFile={handleDeleteFileFromGallery} 
                            />
                        ) : (
                            <window.CloudSaver files={files} password={auth.password} onChanged={init} />
                        )}
                    </div>
                ) : (
                    (() => {
                        const isProductsTab = activeTab === 'products';
                        const currentTransforms = isProductsTab ? productTransforms : transforms;
                        
                        const updateTransform = (id, newT) => {
                            if (isProductsTab) {
                                setProductTransforms(prev => ({ ...prev, [id]: newT }));
                            } else {
                                setTransforms(prev => ({ ...prev, [id]: newT }));
                            }

                            // Сохраняем актуальные позиции в коллекции выбранного принта, чтобы не сбрасывались при переключении
                            if (selectedPrint && selectedPrint.id) {
                                setPrintCollection(prev => prev.map(p => {
                                    if (p.id !== selectedPrint.id) return p;
                                    return {
                                        ...p,
                                        positions: {
                                            ...(p.positions || {}),
                                            [id]: newT
                                        }
                                    };
                                }));
                            }
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
                                            {files.filter(f => f.type === 'upload').map(f => (
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
                                        products={products}
                                        password={auth.password}
                                        onAddProduct={addProduct}
                                        onSaveConfig={handleSaveConfig}
                                        onExport={handleExportZip}
                                        onSaveCloud={handleSaveToCloud}
                                        isExporting={isExporting}
                                    />
                                </div>

                                {/* ЦЕНТР (Рабочая область) */}
                                <div className="responsive-canvas-area flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-y-auto custom-scroll p-4 space-y-4">
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

                                            {products.filter(p => p.enabled).length === 0 ? (
                                                <div className="col-span-full h-80 flex flex-col items-center justify-center text-slate-500 gap-4">
                                                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                                                        <window.Icon name="eye-off" className="w-8 h-8 opacity-50" />
                                                    </div>
                                                    <p>Все мокапы отключены</p>
                                                    <p className="text-xs">Включите мокапы в списке слева галочкой</p>
                                                </div>
                                            ) : (
                                                <div className="responsive-canvas-grid grid gap-6" style={{ gridTemplateColumns: `repeat(${mockupsPerRow}, 1fr)` }}>
                                                    {products.filter(p => p.enabled).map(product => {
                                                        const isProductsTab = activeTab === 'products';
                                                        
                                                        let displayProduct;
                                                        if (isProductsTab) {
                                                            displayProduct = { ...product, width: 900, height: 1200 };
                                                        } else {
                                                            displayProduct = {
                                                                ...product,
                                                                width: product.mockupWidth || product.width,
                                                                height: product.mockupHeight || product.height,
                                                                mask: product.mockupMask !== undefined ? product.mockupMask : product.mask,
                                                                overlay: product.mockupOverlay !== undefined ? product.mockupOverlay : product.overlay
                                                            };
                                                        }

                                                        const fallbackScale = isProductsTab ? 0.6 : 0.5;
                                                        const productDPI = product.dpi || 300;
                                                        const labelWidth = isProductsTab ? product.width : (product.mockupWidth || product.width);
                                                        const labelHeight = isProductsTab ? product.height : (product.mockupHeight || product.height);
                                                        const isActive = activeProductId === product.id;

                                                        return (
                                                            <div key={product.id} className="w-full">
                                                                <div className="mb-2 px-2 flex justify-between items-end">
                                                                    <span className={`text-sm font-medium transition-colors cursor-pointer hover:text-indigo-400 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} onClick={() => setActiveProductId(product.id)}>{product.name}</span>
                                                                    <span className="text-slate-600 text-xs font-mono">{labelWidth}x{labelHeight}</span>
                                                                </div>
                                                                <div 
                                                                    className={`w-full bg-slate-900 rounded-lg border transition-colors ${isActive ? 'border-indigo-500/50' : 'border-slate-800/50'}`}
                                                                    style={{ aspectRatio: `${labelWidth} / ${labelHeight}` }}
                                                                >
                                                                    <window.MockupCanvas
                                                                        product={displayProduct}
                                                                        imageUrl={selectedPrint.url}
                                                                        maskUrl={displayProduct.mask}
                                                                        overlayUrl={displayProduct.overlay}
                                                                        transform={currentTransforms[product.id] || { x: 0, y: 0, scale: fallbackScale, rotation: 0 }}
                                                                        onUpdateTransform={(newT) => updateTransform(product.id, newT)}
                                                                        productId={product.id}
                                                                        dpi={productDPI}
                                                                        onDPIChange={(newDPI) => updateProductDPI(product.id, newDPI)}
                                                                        isActive={isActive}
                                                                        onActivate={() => setActiveProductId(product.id)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* ПРАВАЯ КОЛОНКА (Настройки) */}
                                <div className="responsive-sidebar w-full lg:w-64 bg-slate-900/50 rounded-xl border border-slate-800 shrink-0 lg:h-full overflow-y-auto custom-scroll">
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
