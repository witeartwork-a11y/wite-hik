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
                const tr = (printItem.positions && printItem.positions[prod.id])
                    ? printItem.positions[prod.id]
                    : window.RenderService.getTransformByMode(
                        transforms,
                        productTransforms,
                        mode,
                        prod.id,
                        mode === 'products' ? 0.6 : 0.5
                    );

                const productDPI = prod.dpi || 300;
                let targetWidth, targetHeight, targetMask, targetOverlay;

                if (mode === 'products') {
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

                if (blob) {
                    const categoryFolder = mode === 'products' ? 'products' : 'mockups';
                    const fileName = `${prod.defaultPrefix}_${printItem.article}.png`;
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
