// Сервис для экспорта мокапов в ZIP и облако
window.ExportService = {
    // Экспортировать мокапы в ZIP файл
    exportToZip: async (selectedPrint, products, transforms, productTransforms, activeTab) => {
        if (!selectedPrint) throw new Error("Выберите картинку");
        if (!window.Utils) throw new Error("Библиотеки не загружены");

        const zip = new JSZip();
        const utils = window.Utils;
        const exportMode = activeTab === 'products' ? 'products' : 'mockups';

        console.log('📦 exportToZip начало:', {
            printName: selectedPrint.name,
            mode: exportMode,
            products: products.filter(p => p.enabled).length
        });

        const printImg = await utils.loadImage(selectedPrint.url);
        if (!printImg) throw new Error("Не удалось загрузить принт");

        const enabledProducts = products.filter(p => p.enabled);

        for (const prod of enabledProducts) {
            // Получаем трансформацию правильно
            const tr = window.RenderService.getTransformByMode(
                transforms,
                productTransforms,
                exportMode,
                prod.id,
                exportMode === 'products' ? 0.6 : 0.5
            );
            
            console.log(`📸 Рендер для ZIP ${prod.name}:`, { transform: tr });

            // Использовать DPI продукта
            const productDPI = prod.dpi || 300;
            
            let targetWidth, targetHeight, targetMask, targetOverlay;

            if (exportMode === 'products') {
                targetWidth = prod.width;
                targetHeight = prod.height;
                targetMask = prod.mask;
                targetOverlay = prod.overlay;
            } else {
                targetWidth = prod.mockupWidth;
                targetHeight = prod.mockupHeight;
                targetMask = prod.mockupMask;
                targetOverlay = prod.mockupOverlay;
            }

            const blob = await window.RenderService.renderMockupBlob(
                prod,
                printImg,
                tr,  // Передаем трансформацию
                productDPI,
                targetWidth,
                targetHeight,
                { 
                    mimeType: 'image/png',
                    maskUrl: targetMask,
                    overlayUrl: targetOverlay
                }
            );
            
            if (!blob) {
                console.warn(`⚠️ Не удалось отрендерить для ZIP: ${prod.name}`);
                continue;
            }

            const safeName = selectedPrint.name.split('.')[0];
            const prefix = prod.defaultPrefix || prod.name;
            const fileName = `${prefix}_${safeName}.png`;

            zip.file(fileName, blob);
        }

        const content = await zip.generateAsync({ type: "blob" });
        console.log('✅ exportToZip завершено');
        return content;
    },

    // Сохранить мокапы в облако
    saveToCloud: async (
        selectedPrint,
        products,
        transforms,
        productTransforms,
        password,
        activeTab,
        cloudMode,
        onProgress
    ) => {
        if (!selectedPrint) throw new Error("Выберите принт для сохранения");
        if (!window.Utils) throw new Error("Библиотеки не загружены");

        const modeToUse = activeTab === 'base' ? cloudMode : activeTab;
        const utils = window.Utils;

        console.log('☁️ saveToCloud начало:', {
            printName: selectedPrint.name,
            mode: modeToUse,
            totalProducts: products.length,
            enabledProducts: products.filter(p => p.enabled).length
        });

        const printImg = await utils.loadImage(selectedPrint.url);
        if (!printImg) throw new Error("Не удалось загрузить принт");

        const enabledProducts = products.filter(p => p.enabled);
        if (enabledProducts.length === 0) {
            throw new Error("Нет включенных товаров для сохранения");
        }

        const article = selectedPrint.article || selectedPrint.name.split('.')[0];
        const categoryFolder = modeToUse === 'products' ? 'products' : 'mockups';

        if (onProgress) {
            onProgress({ total: enabledProducts.length, done: 0, current: '' });
        }

        for (const prod of enabledProducts) {
            // ВАЖНО: Получаем трансформацию в зависимости от режима
            const tr = window.RenderService.getTransformByMode(
                transforms,
                productTransforms,
                modeToUse,
                prod.id,
                modeToUse === 'products' ? 0.6 : 0.5
            );

            console.log(`📦 Рендер ${prod.name}:`, {
                productId: prod.id,
                mode: modeToUse,
                transform: tr,
                hasTransforms: !!transforms[prod.id],
                hasProductTransforms: !!productTransforms[prod.id]
            });

            if (onProgress) {
                onProgress(prev => ({ ...prev, current: prod.name }));
            }

            // Использовать DPI продукта
            const productDPI = prod.dpi || 300;

            let targetWidth, targetHeight, targetMask, targetOverlay;

            if (modeToUse === 'products') {
                targetWidth = prod.width;
                targetHeight = prod.height;
                targetMask = prod.mask;
                targetOverlay = prod.overlay;
            } else {
                targetWidth = prod.mockupWidth;
                targetHeight = prod.mockupHeight;
                targetMask = prod.mockupMask;
                targetOverlay = prod.mockupOverlay;
            }

            // КРИТИЧНО: Передаем трансформацию в renderMockupBlob
            const blob = await window.RenderService.renderMockupBlob(
                prod,
                printImg,
                tr,  // Трансформация ДОЛЖНА быть передана сюда
                productDPI,
                targetWidth,
                targetHeight,
                { 
                    mimeType: 'image/png',
                    maskUrl: targetMask,
                    overlayUrl: targetOverlay
                }
            );

            if (!blob) {
                console.warn(`⚠️ Не удалось отрендерить ${prod.name}`);
                continue;
            }

            const prefix = prod.defaultPrefix || prod.name;
            const fileName = `${prefix}-${article}.png`;

            console.log(`⬆️ Загрузка ${fileName} в облако...`);
            await window.DataService.uploadToCloud(password, blob, fileName, article, categoryFolder, selectedPrint.name, prod.name);

            if (onProgress) {
                onProgress(prev => ({ ...prev, done: prev.done + 1 }));
            }
        }

        console.log('✅ saveToCloud завершено');
    }
};
