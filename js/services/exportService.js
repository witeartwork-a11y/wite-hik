// Сервис для экспорта мокапов в ZIP и облако
window.ExportService = {
    // Экспортировать мокапы в ZIP файл
    exportToZip: async (selectedPrint, products, transforms, productTransforms, activeTab, mockupDPI, mockupWidth, mockupHeight) => {
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
            
            // Использовать DPI продукта, если установлен, иначе глобальный DPI
            const productDPI = prod.dpi || mockupDPI;
            
            const blob = await window.RenderService.renderMockupBlob(
                prod,
                printImg,
                tr,
                productDPI,
                mockupWidth,
                mockupHeight,
                { mimeType: 'image/png' }
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
        mockupDPI,
        mockupWidth,
        mockupHeight,
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

        const article = selectedPrint.name.split('.')[0];
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

            // Использовать DPI продукта, если установлен, иначе глобальный DPI
            const productDPI = prod.dpi || mockupDPI;

            const blob = await window.RenderService.renderMockupBlob(
                prod,
                printImg,
                tr,
                productDPI,
                mockupWidth,
                mockupHeight,
                { mimeType: 'image/png' }
            );

            if (!blob) continue;

            const prefix = prod.defaultPrefix || prod.name;
            const fileName = `${prefix}_${article}.png`;

            await window.DataService.uploadToCloud(password, blob, fileName, article, categoryFolder);

            if (onProgress) {
                onProgress(prev => ({ ...prev, done: prev.done + 1 }));
            }
        }
    }
};
