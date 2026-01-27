// Сервис для экспорта мокапов в ZIP и облако
window.ExportService = {
    // Экспортировать мокапы в ZIP файл
    exportToZip: async (selectedPrint, products, transforms, productTransforms, activeTab) => {
        if (!selectedPrint) throw new Error("Выберите картинку");
        if (!window.Utils) throw new Error("Библиотеки не загружены");

        const zip = new JSZip();
        const utils = window.Utils;
        const exportMode = activeTab === 'products' ? 'products' : 'mockups';

        const printImg = await utils.loadImage(selectedPrint.url);
        if (!printImg) throw new Error("Не удалось загрузить принт");

        const enabledProducts = products.filter(p => p.enabled);

        for (const prod of enabledProducts) {
            const tr = window.RenderService.getTransformByMode(
                transforms,
                productTransforms,
                exportMode,
                prod.id,
                exportMode === 'products' ? 0.6 : 0.5
            );
            
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
                tr,
                productDPI,
                targetWidth,
                targetHeight,
                { 
                    mimeType: 'image/png',
                    maskUrl: targetMask,
                    overlayUrl: targetOverlay
                }
            );
            
            if (!blob) continue;

            const safeName = selectedPrint.name.split('.')[0];
            const prefix = prod.defaultPrefix || prod.name;
            const fileName = `${prefix}_${safeName}.png`;

            zip.file(fileName, blob);
        }

        const content = await zip.generateAsync({ type: "blob" });
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
            const tr = window.RenderService.getTransformByMode(
                transforms,
                productTransforms,
                modeToUse,
                prod.id,
                modeToUse === 'products' ? 0.6 : 0.5
            );

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

            const blob = await window.RenderService.renderMockupBlob(
                prod,
                printImg,
                tr,
                productDPI,
                targetWidth,
                targetHeight,
                { 
                    mimeType: 'image/png',
                    maskUrl: targetMask,
                    overlayUrl: targetOverlay
                }
            );

            if (!blob) continue;

            const prefix = prod.defaultPrefix || prod.name;
            const fileName = `${prefix}-${article}.png`;

            await window.DataService.uploadToCloud(password, blob, fileName, article, categoryFolder, selectedPrint.name);

            if (onProgress) {
                onProgress(prev => ({ ...prev, done: prev.done + 1 }));
            }
        }
    }
};
