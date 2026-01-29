// js/services/collectionService.js
// Сервис для пакетного сохранения коллекции принтов в облако
window.CollectionService = {
    savePrintsToCloud: async ({
        prints,
        enabledProducts,
        mode,
        transforms,
        productTransforms,
        password,
        onProgress
    }) => {
        if (!window.Utils) throw new Error('Библиотеки не загружены');
        if (!Array.isArray(prints) || prints.length === 0) throw new Error('Нет принтов для сохранения');
        if (!Array.isArray(enabledProducts) || enabledProducts.length === 0) throw new Error('Нет включенных товаров');

        const totalItems = prints.length * enabledProducts.length;
        let processed = 0;

        for (const printItem of prints) {
            const printImg = await window.Utils.loadImage(printItem.url);
            if (!printImg) continue;

            for (const prod of enabledProducts) {
                // Определяем реальный режим для текущего товара
                let productMode = prod.tab || mode; // 'products' или 'mockups'
                if (productMode === 'base') productMode = 'mockups';

                let tr;
                if (printItem.positions && printItem.positions[prod.id]) {
                    const savedPos = printItem.positions[prod.id];
                    // Поддержка новой структуры с разделением на products/mockups
                    if (savedPos.products && savedPos.mockups) {
                        tr = savedPos[productMode];
                    } else {
                        // Старый формат (обратная совместимость)
                        tr = savedPos;
                    }
                } else {
                    tr = window.RenderService.getTransformByMode(
                        transforms,
                        productTransforms,
                        productMode,
                        prod.id,
                        productMode === 'products' ? 0.6 : 0.5
                    );
                }

                const productDPI = prod.dpi || 300;
                let targetWidth, targetHeight, targetMask, targetOverlay;

                if (productMode === 'products') {
                    // Режим "Товары" (Products)
                    targetWidth = prod.width;
                    targetHeight = prod.height;
                    targetMask = prod.mask;
                    targetOverlay = prod.overlay;
                } else {
                    // Режим "Мокапы" (Mockups)
                    targetWidth = prod.mockupWidth || prod.width;
                    targetHeight = prod.mockupHeight || prod.height;
                    targetMask = prod.mockupMask || prod.mask;
                    targetOverlay = prod.mockupOverlay || prod.overlay;
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

                if (blob) {
                    const categoryFolder = productMode === 'products' ? 'products' : 'mockups';
                    const fileName = `${prod.defaultPrefix}-${printItem.article}.png`;
                    await window.DataService.uploadToCloud(
                        password,
                        blob,
                        fileName,
                        printItem.article,
                        categoryFolder,
                        printItem.name
                    );
                }

                processed++;
                if (onProgress) {
                    onProgress({ total: totalItems, done: processed, current: `${printItem.article} - ${prod.name}` });
                }
            }
        }
    }
};
