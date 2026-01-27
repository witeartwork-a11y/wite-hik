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
    const [previewScale, setPreviewScale] = useState(1.1);
    const [galleryTab, setGalleryTab] = useState('files');
    const [cloudMode, setCloudMode] = useState('mockups');
    const [isCloudSaving, setIsCloudSaving] = useState(false);
    const [cloudProgress, setCloudProgress] = useState({ total: 0, done: 0, current: '' });
    const [mockupDPI, setMockupDPI] = useState(300);
    const [mockupWidth, setMockupWidth] = useState(null);
    const [mockupHeight, setMockupHeight] = useState(null);

    const attemptLogin = useCallback(async (pwd) => {
        if (!pwd) return false;
        try {
            const res = await fetch('/api.php?action=login', {
                method: 'POST',
                body: JSON.stringify({ password: pwd })
            });
            const data = await res.json();
            return !!data.success;
        } catch (e) {
            console.error("Автовход не удался:", e);
            return false;
        }
    }, []);

    const handleLoginSuccess = useCallback((pwd) => {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('witehik_password', pwd);
        }
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
            const cached = (typeof localStorage !== 'undefined') ? localStorage.getItem('witehik_password') : null;
            if (!cached) return;
            const ok = await attemptLogin(cached);
            if (cancelled) return;
            if (ok) {
                setAuth({ isAuth: true, password: cached });
            } else if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('witehik_password');
            }
        };
        restoreAuth();
        return () => { cancelled = true; };
    }, [attemptLogin]);

    // Инициализация
    const init = useCallback(async () => {
        if (!auth.isAuth) return;
        try {
            // 1. Загружаем файлы (галерея)
            const fRes = await fetch('/api.php?action=list');
            const fData = await fRes.json();
            if (fData.files) setFiles(fData.files);

            // 2. Загружаем сохраненный конфиг (маски, включено/выключено)
            const pRes = await fetch('/api.php?action=load_config');
            const pData = await pRes.json();
            const savedConfig = pData.config || [];

            // 3. ОБЪЕДИНЕНИЕ (MERGE LOGIC)
            // Берем жесткий список из constants.js (PRODUCTS_DATA)
            // И ищем для каждого товара настройки в savedConfig.
            
            if (window.PRODUCTS_DATA) {
                const mergedProducts = window.PRODUCTS_DATA.map(def => {
                    // Ищем, сохранял ли пользователь настройки для этого ID раньше
                    const saved = savedConfig.find(s => s.id === def.id);
                    
                    return {
                        ...def, // Берем размеры и имя из констант (3508x2480 и т.д.)
                        // Восстанавливаем настройки или ставим дефолт
                        enabled: saved ? saved.enabled : true, 
                        image: saved ? saved.image : '',       // Тут может быть загруженный пользователем мокап
                        mask: saved ? saved.mask : '',
                        overlay: saved ? saved.overlay : '',
                        defaultPrefix: saved ? saved.defaultPrefix : def.defaultPrefix
                    };
                });

                // Также добавляем "Кастомные" товары, которые пользователь мог добавить через кнопку "Добавить"
                // Они начинаются с 'custom_' и их нет в constants.js
                const customProducts = savedConfig.filter(s => s.id.startsWith('custom_'));
                
                setProducts([...mergedProducts, ...customProducts]);
            } else {
                // Если constants.js не прогрузился, используем то, что пришло с сервера
                console.error("PRODUCTS_DATA не найдены! Проверьте подключение constants.js в index.html");
                setProducts(savedConfig);
            }

        } catch (e) { console.error("Ошибка инициализации:", e); }
    }, [auth.isAuth]);

    useEffect(() => { init(); }, [init]);

    const handleUploadFiles = async (fileList) => {
        if (!fileList || fileList.length === 0) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('password', auth.password);
            formData.append('type', 'upload'); 
            for (let i = 0; i < fileList.length; i++) formData.append('files[]', fileList[i]);
            const response = await fetch('/api.php?action=upload', { method: 'POST', body: formData });
            const data = await response.json();
            
            // Оптимистичное обновление: сразу добавляем новые файлы в состояние
            if (data.success && data.files) {
                setFiles(prevFiles => [...prevFiles, ...data.files]);
            }
            
            await init(); 
        } catch (error) {
            console.error("Upload failed", error);
            alert("Ошибка загрузки");
        } finally {
            setIsUploading(false);
        }
    };

    // === ВЫБОР ПРИНТА ===
    const handleSelectPrint = async (file) => {
        const buildDefault = () => {
            const map = {};
            products.forEach(p => {
                if (!p.enabled) return;
                map[p.id] = { x: 0, y: 0, scale: 0.6, rotation: 0 };
            });
            return map;
        };

        try {
            setSelectedPrint(file);
            if (!window.Utils) {
                setTransforms(buildDefault());
                setProductTransforms(buildDefault());
                return;
            }

            const img = await window.Utils.loadImage(file.url);
            if (!img) {
                setTransforms(buildDefault());
                setProductTransforms(buildDefault());
                return;
            }

            const buildMap = (getSizeFn) => {
                const map = {};
                products.forEach(p => {
                    if (!p.enabled) return;
                    const { w, h } = getSizeFn(p);
                    const scale = window.Utils.getInitialScale(w, h, img.width, img.height);
                    const safeScale = Number.isFinite(scale) ? scale * 0.9 : 0.6;
                    map[p.id] = { x: 0, y: 0, scale: safeScale, rotation: 0 };
                });
                return map;
            };

            setTransforms(buildMap((p) => ({ w: p.width || 1000, h: p.height || 1000 })));
            setProductTransforms(buildMap(() => ({ w: 900, h: 1200 })));
        } catch (e) {
            console.error("Ошибка при выборе принта:", e);
            setTransforms(buildDefault());
            setProductTransforms(buildDefault());
        }
    };

    const handleSaveConfig = async (newProducts) => {
        setProducts(newProducts);
        // Сохраняем на сервер
        await fetch('/api.php?action=save_config', {
            method: 'POST',
            body: JSON.stringify({ password: auth.password, products: newProducts })
        });
    };

    const addProduct = async (fileList) => {
        const filesArr = Array.from(fileList || []);
        if (filesArr.length === 0) return;
        try {
            const formData = new FormData();
            filesArr.forEach(f => formData.append('files[]', f));
            formData.append('password', auth.password);
            const res = await fetch('/api.php?action=upload', { method: 'POST', body: formData });
            const data = await res.json();
            
            if(data.success && data.files) {
                const template = (window.PRODUCTS_DATA && window.PRODUCTS_DATA[0]) || { width: 2000, height: 2000 };
                const newProds = data.files.map((uploaded, idx) => ({
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
            alert("Ошибка добавления товара");
        }
    };

    // Функция для установки DPI в PNG
    const setPNGDPI = async (blob, dpi) => {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Найдем конец IHDR чанка (сигнатура PNG + IHDR)
        let insertPosition = 33; // После PNG сигнатуры и IHDR чанка
        
        // Создаем pHYs чанк для установки DPI
        // DPI to pixels per meter: DPI * 39.3701
        const pixelsPerMeter = Math.round(dpi * 39.3701);
        
        const pHYs = new Uint8Array([
            0, 0, 0, 9, // Длина чанка (9 байт)
            0x70, 0x48, 0x59, 0x73, // 'pHYs'
            (pixelsPerMeter >> 24) & 0xff,
            (pixelsPerMeter >> 16) & 0xff,
            (pixelsPerMeter >> 8) & 0xff,
            pixelsPerMeter & 0xff,
            (pixelsPerMeter >> 24) & 0xff,
            (pixelsPerMeter >> 16) & 0xff,
            (pixelsPerMeter >> 8) & 0xff,
            pixelsPerMeter & 0xff,
            1, // Единица измерения: метры
        ]);
        
        // Вычисляем CRC32 для pHYs
        const crcTable = new Int32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            }
            crcTable[i] = c;
        }
        
        let crc = -1;
        for (let i = 4; i < pHYs.length; i++) {
            crc = crcTable[(crc ^ pHYs[i]) & 0xff] ^ (crc >>> 8);
        }
        crc = crc ^ -1;
        
        const crcBytes = new Uint8Array([
            (crc >> 24) & 0xff,
            (crc >> 16) & 0xff,
            (crc >> 8) & 0xff,
            crc & 0xff
        ]);
        
        // Собираем новый PNG
        const newArray = new Uint8Array(uint8Array.length + pHYs.length + crcBytes.length);
        newArray.set(uint8Array.subarray(0, insertPosition), 0);
        newArray.set(pHYs, insertPosition);
        newArray.set(crcBytes, insertPosition + pHYs.length);
        newArray.set(uint8Array.subarray(insertPosition), insertPosition + pHYs.length + crcBytes.length);
        
        return new Blob([newArray], { type: 'image/png' });
    };

    const renderMockupBlob = useCallback(async (prod, printImg, transform, options = {}) => {
        if (!window.Utils) throw new Error("Библиотеки не загружены");
        const utils = window.Utils;

        const [base, mask, overlay] = await Promise.all([
            utils.loadImage(prod.image),
            utils.loadImage(prod.mask),
            utils.loadImage(prod.overlay)
        ]);

        const canvas = document.createElement('canvas');
        // Используем пользовательские размеры если установлены
        let width = mockupWidth || (base ? base.width : (options.outputWidth || prod.width || 1000));
        let height = mockupHeight || (base ? base.height : (options.outputHeight || prod.height || 1000));
        
        // Если заданы оба размера, используем их
        if (mockupWidth && !mockupHeight && base) {
            height = Math.round((mockupWidth / base.width) * base.height);
        } else if (mockupHeight && !mockupWidth && base) {
            width = Math.round((mockupHeight / base.height) * base.width);
        }
        
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, width, height);

        if (base) ctx.drawImage(base, 0, 0, width, height);

        if (printImg) {
            const tempC = document.createElement('canvas');
            tempC.width = width; tempC.height = height;
            const tCtx = tempC.getContext('2d');

            tCtx.save();
            tCtx.translate(width / 2 + (transform?.x || 0), height / 2 + (transform?.y || 0));
            tCtx.rotate((transform?.rotation || 0) * Math.PI / 180);
            tCtx.scale(transform?.scale || 1, transform?.scale || 1);
            tCtx.drawImage(printImg, -printImg.width / 2, -printImg.height / 2);
            tCtx.restore();

            if (mask) {
                tCtx.globalCompositeOperation = 'destination-in';
                tCtx.drawImage(mask, 0, 0, width, height);
            }

            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(tempC, 0, 0);
        }

        if (overlay) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(overlay, 0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';
        }

        const mimeType = options.mimeType || 'image/png';
        let blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, mimeType === 'image/png' ? undefined : 0.9));
        
        // Устанавливаем DPI для PNG
        if (mimeType === 'image/png' && mockupDPI) {
            blob = await setPNGDPI(blob, mockupDPI);
        }
        
        return blob;
    }, [mockupDPI, mockupWidth, mockupHeight]);

    const getTransformByMode = (mode, productId) => {
        const map = mode === 'products' ? productTransforms : transforms;
        const fallbackScale = mode === 'products' ? 0.6 : 0.5;
        return map[productId] || { x: 0, y: 0, scale: fallbackScale, rotation: 0 };
    };

    const handleExportZip = async () => {
        if (!selectedPrint) return alert("Выберите картинку");
        if (!window.Utils) return alert("Библиотеки не загружены");

        setIsExporting(true);
        try {
            const zip = new JSZip();
            const utils = window.Utils;
            const exportMode = activeTab === 'products' ? 'products' : 'mockups';

            const printImg = await utils.loadImage(selectedPrint.url);
            if(!printImg) throw new Error("Не удалось загрузить принт");

            const enabledProducts = products.filter(p => p.enabled);

            for (const prod of enabledProducts) {
                const tr = getTransformByMode(exportMode, prod.id);
                const blob = await renderMockupBlob(prod, printImg, tr, { mimeType: 'image/png' });
                if (!blob) continue;

                const safeName = selectedPrint.name.split('.')[0];
                const prefix = prod.defaultPrefix || prod.name;
                const fileName = `${prefix}_${safeName}.png`;

                zip.file(fileName, blob);
            }

            const content = await zip.generateAsync({type:"blob"});
            saveAs(content, `mockups_${selectedPrint.name.split('.')[0]}.zip`);
        } catch(e) {
            console.error(e);
            alert("Ошибка экспорта: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleSaveToCloud = useCallback(async (arg) => {
        if (!selectedPrint) return alert("Выберите принт для сохранения");
        if (!window.Utils) return alert("Библиотеки не загружены");

        const modeToUse = (typeof arg === 'string') ? arg : ((activeTab === 'base' ? cloudMode : activeTab));

        setIsCloudSaving(true);
        const utils = window.Utils;

        try {
            const printImg = await utils.loadImage(selectedPrint.url);
            if (!printImg) throw new Error("Не удалось загрузить принт");

            const enabledProducts = products.filter(p => p.enabled);
            if (enabledProducts.length === 0) {
                alert("Нет включенных товаров для сохранения");
                return;
            }

            // Артикул = имя исходного файла без расширения
            const article = selectedPrint.name.split('.')[0];
            const categoryFolder = modeToUse === 'products' ? 'products' : 'mockups';

            setCloudProgress({ total: enabledProducts.length, done: 0, current: '' });

            for (const prod of enabledProducts) {
                const tr = getTransformByMode(modeToUse, prod.id);
                setCloudProgress(prev => ({ ...prev, current: prod.name }));

                const blob = await renderMockupBlob(prod, printImg, tr, { mimeType: 'image/png' });
                if (!blob) continue;

                const prefix = prod.defaultPrefix || prod.name;
                const fileName = `${prefix}_${article}.png`;

                const formData = new FormData();
                formData.append('password', auth.password);
                formData.append('type', 'cloud');
                formData.append('article', article);
                formData.append('category', categoryFolder);
                formData.append('files[]', new File([blob], fileName, { type: 'image/png' }));
                await fetch('/api.php?action=upload', { method: 'POST', body: formData });

                setCloudProgress(prev => ({ ...prev, done: prev.done + 1 }));
            }

            alert('Готово! Файлы сохранены в облако.');
            await init(); 
        } catch (e) {
            console.error(e);
            alert('Ошибка сохранения: ' + e.message);
        } finally {
            setIsCloudSaving(false);
            setCloudProgress({ total: 0, done: 0, current: '' });
        }
    }, [auth.password, cloudMode, activeTab, getTransformByMode, products, renderMockupBlob, selectedPrint, transforms, productTransforms, init]);

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

            <div className="container mx-auto p-4 max-w-7xl">
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
                            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] fade-in">
                                {/* ЛЕВАЯ КОЛОНКА (Сайдбар) */}
                                <div className="w-full lg:w-96 flex flex-col gap-4 h-full overflow-y-auto custom-scroll pr-1">
                                    {/* Выбор принта */}
                                    <div 
                                        className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col max-h-[30%] shrink-0 transition-all hover:border-indigo-500/50"
                                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500'); }}
                                        onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500'); }}
                                        onDrop={e => {
                                            e.preventDefault();
                                            e.currentTarget.classList.remove('border-indigo-500');
                                            handleUploadFiles(e.dataTransfer.files);
                                        }}
                                    >
                                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Выберите принт</h3>
                                        <div className="overflow-y-auto grid grid-cols-4 gap-2 pr-1 custom-scroll">
                                            <div className="aspect-square rounded border border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-700/50 hover:border-indigo-500 transition-all relative bg-slate-900/50">
                                                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleUploadFiles(e.target.files)} disabled={isUploading} />
                                                {isUploading ? <i data-lucide="loader-2" className="w-6 h-6 text-indigo-400 animate-spin"></i> : <i data-lucide="plus" className="w-6 h-6 text-slate-500"></i>}
                                            </div>
                                            {files.filter(f => f.type === 'upload').map(f => (
                                                <div key={f.name} onClick={() => handleSelectPrint(f)} 
                                                    className={`aspect-square rounded border cursor-pointer overflow-hidden bg-slate-900 ${selectedPrint?.name === f.name ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-slate-700'}`}>
                                                    <img src={f.thumb || f.url} loading="lazy" className="w-full h-full object-cover"/>
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
                                <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-y-auto custom-scroll p-4 space-y-4">
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
                                                {/* Масштаб превью */}
                                                <div className="flex items-center gap-3 text-slate-400 text-xs bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                                                    <i data-lucide="maximize" className="w-4 h-4"></i>
                                                    <span className="whitespace-nowrap">Масштаб превью</span>
                                                    <input 
                                                        type="range" 
                                                        min="0.8" max="1.4" step="0.05"
                                                        value={previewScale}
                                                        onChange={e => setPreviewScale(parseFloat(e.target.value))}
                                                        className="w-40 accent-indigo-400"
                                                    />
                                                    <span className="tabular-nums text-slate-300">{Math.round(previewScale*100)}%</span>
                                                </div>

                                                {/* Настройки разрешения мокапов */}
                                                <div className="flex items-center gap-3 text-slate-400 text-xs bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                                                    <i data-lucide="settings" className="w-4 h-4"></i>
                                                    <span className="whitespace-nowrap">DPI:</span>
                                                    <input 
                                                        type="number" 
                                                        min="72" max="600" step="1"
                                                        value={mockupDPI}
                                                        onChange={e => setMockupDPI(parseInt(e.target.value) || 300)}
                                                        className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none focus:border-indigo-500"
                                                    />
                                                    <span className="whitespace-nowrap">Ширина:</span>
                                                    <input 
                                                        type="number" 
                                                        min="0" step="1"
                                                        placeholder="авто"
                                                        value={mockupWidth || ''}
                                                        onChange={e => setMockupWidth(e.target.value ? parseInt(e.target.value) : null)}
                                                        className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none focus:border-indigo-500"
                                                    />
                                                    <span className="whitespace-nowrap">Высота:</span>
                                                    <input 
                                                        type="number" 
                                                        min="0" step="1"
                                                        placeholder="авто"
                                                        value={mockupHeight || ''}
                                                        onChange={e => setMockupHeight(e.target.value ? parseInt(e.target.value) : null)}
                                                        className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none focus:border-indigo-500"
                                                    />
                                                    {(mockupWidth || mockupHeight) && (
                                                        <button 
                                                            onClick={() => { setMockupWidth(null); setMockupHeight(null); }}
                                                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                                            title="Сбросить размеры"
                                                        >
                                                            <i data-lucide="x" className="w-4 h-4"></i>
                                                        </button>
                                                    )}
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
                                                <div className="grid grid-cols-1 gap-6" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${Math.round(280 * previewScale)}px, 1fr))` }}>
                                                {products.filter(p => p.enabled).map(product => {
                                                    const displayProduct = isProductsTab ? { ...product, width: 900, height: 1200 } : product;
                                                    const fallbackScale = isProductsTab ? 0.6 : 0.5;
                                                    return (
                                                        <div key={product.id} className="w-full">
                                                            <div className="mb-2 px-2 flex justify-between items-end">
                                                                <span className="text-slate-400 text-sm font-medium">{product.name}</span>
                                                                <span className="text-slate-600 text-xs font-mono">{displayProduct.width}x{displayProduct.height}</span>
                                                            </div>
                                                            <div className="aspect-[3/4] w-full bg-slate-900 rounded-lg border border-slate-800/50">
                                                                <window.MockupCanvas 
                                                                    product={displayProduct}
                                                                    imageUrl={selectedPrint.url}
                                                                    maskUrl={displayProduct.mask}
                                                                    overlayUrl={displayProduct.overlay}
                                                                    transform={currentTransforms[product.id] || {x:0, y:0, scale: fallbackScale, rotation: 0}}
                                                                    onUpdateTransform={(newT) => updateTransform(product.id, newT)}
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