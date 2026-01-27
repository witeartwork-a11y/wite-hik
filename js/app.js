// js/app.js
// const { useState, useEffect, useCallback } = React;

function App() {
    const { useState, useEffect, useCallback } = React;
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

    const handleLoginSuccess = useCallback((pwd) => {
        window.AuthService.savePassword(pwd);
        setAuth({ isAuth: true, password: pwd });
    }, []);

    // Подгружаем/перерисовываем иконки; защищаемся от падения lucide
    useEffect(() => {
        if (!window.lucide) return;
        try {
            window.lucide.createIcons();
        } catch (err) {
            console.error('Не удалось отрисовать иконки Lucide', err);
        }
    }, [auth, activeTab, files, products, isUploading]);

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
        try {
            setSelectedPrint(file);
            const newTransforms = await window.RenderService.initializeTransforms(file, products, 'mockups');
            const newProductTransforms = await window.RenderService.initializeTransforms(file, products, 'products');
            setTransforms(newTransforms);
            setProductTransforms(newProductTransforms);
        } catch (e) {
            console.error('Ошибка при выборе принта:', e);
            const defaults = window.RenderService.buildDefaultTransforms(products);
            setTransforms(defaults);
            setProductTransforms(defaults);
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

    if (!auth.isAuth) return <window.LoginScreen onLogin={handleLoginSuccess} />;

    return (
        <div className="min-h-screen pb-10">
            <window.CloudProgress progress={cloudProgress} isVisible={isCloudSaving} />
            <window.Navbar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onExport={handleExportZip}
                onSaveCloud={handleSaveToCloud}
                isExporting={isExporting}
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
                            <window.Gallery files={files} auth={auth} init={init} />
                        ) : (
                            <window.CloudSaver files={files} />
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
                        };

                        return (
                            <div className="responsive-layout flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-140px)] fade-in">
                                {/* ЛЕВАЯ КОЛОНКА (Сайдбар) */}
                                <div className="responsive-sidebar w-full lg:w-96 flex flex-col gap-4 lg:h-full overflow-y-auto custom-scroll pr-1">
                                    {/* Выбор принта */}
                                    <div
                                        className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col lg:max-h-[30%] lg:shrink-0 transition-all hover:border-indigo-500/50"
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
                                                {isUploading ? <i data-lucide="loader-2" className="w-6 h-6 text-indigo-400 animate-spin"></i> : <i data-lucide="plus" className="w-6 h-6 text-slate-500"></i>}
                                            </div>
                                            {files.filter(f => f.type === 'upload').map(f => (
                                                <div key={f.name} onClick={() => handleSelectPrint(f)}
                                                    className={`aspect-square rounded border cursor-pointer overflow-hidden bg-slate-900 ${selectedPrint?.name === f.name ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-slate-700'}`}>
                                                    <img src={f.thumb || f.url} loading="lazy" className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sidebar с товарами */}
                                    <window.Sidebar
                                        products={products}
                                        password={auth.password}
                                        onAddProduct={addProduct}
                                        onSaveConfig={handleSaveConfig}
                                    />
                                </div>

                                {/* ЦЕНТР (Рабочая область) */}
                                <div className="responsive-canvas-area flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-y-auto custom-scroll p-4 space-y-4">
                                    {!selectedPrint ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                                            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                                                <i data-lucide="image" className="w-8 h-8 opacity-50"></i>
                                            </div>
                                            <p>Выберите изображение слева, чтобы начать работу</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap items-center gap-3">
                                                {/* Выбор количества мокапов в строку */}
                                                <div className="flex items-center gap-3 text-slate-400 text-xs bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                                                    <i data-lucide="layout-grid" className="w-4 h-4"></i>
                                                    <span className="whitespace-nowrap">Мокапов в строку:</span>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3].map(num => (
                                                            <button
                                                                key={num}
                                                                onClick={() => setMockupsPerRow(num)}
                                                                className={`w-8 h-8 rounded border font-medium transition-all ${
                                                                    mockupsPerRow === num
                                                                        ? 'bg-indigo-500 border-indigo-400 text-white'
                                                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                                                }`}
                                                            >
                                                                {num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {products.filter(p => p.enabled).length === 0 ? (
                                                <div className="col-span-full h-80 flex flex-col items-center justify-center text-slate-500 gap-4">
                                                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                                                        <i data-lucide="eye-off" className="w-8 h-8 opacity-50"></i>
                                                    </div>
                                                    <p>Все мокапы отключены</p>
                                                    <p className="text-xs">Включите мокапы в списке слева галочкой</p>
                                                </div>
                                            ) : (
                                                <div className="responsive-canvas-grid grid gap-6" style={{ gridTemplateColumns: `repeat(${mockupsPerRow}, 1fr)` }}>
                                                    {products.filter(p => p.enabled).map(product => {
                                                        const displayProduct = isProductsTab ? { ...product, width: 900, height: 1200 } : product;
                                                        const fallbackScale = isProductsTab ? 0.6 : 0.5;
                                                        const productDPI = product.dpi || 300;
                                                        return (
                                                            <div key={product.id} className="w-full">
                                                                <div className="mb-2 px-2 flex justify-between items-end">
                                                                    <span className="text-slate-400 text-sm font-medium">{product.name}</span>
                                                                    <span className="text-slate-600 text-xs font-mono">{product.width}x{product.height}</span>
                                                                </div>
                                                                <div className="aspect-[3/4] w-full bg-slate-900 rounded-lg border border-slate-800/50">
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
