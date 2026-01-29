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
        
        console.log('☁️ CollectionService.savePrintsToCloud начало:', {
            printsCount: prints.length,
            enabledProductsCount: enabledProducts.length,
            mode: mode
        });

        const totalItems = prints.length * enabledProducts.length;
        let processed = 0;

        for (const printItem of prints) {
            // 🔑 КРИТИЧЕСКИ ВАЖНО: Загружаем конфиг ДЛЯ КАЖДОГО ПРИНТА из prints_config.json
            // Это гарантирует, что используются ПРАВИЛЬНЫЕ трансформации
            const printConfigFromDB = await window.DataService.loadPrintsConfig(printItem.name);
            
            console.log(`📂 Загрузил конфиг для принта "${printItem.name}":`, {
                hasConfig: !!printConfigFromDB,
                hasTransforms: printConfigFromDB?.transforms ? Object.keys(printConfigFromDB.transforms).length : 0,
                hasProductTransforms: printConfigFromDB?.productTransforms ? Object.keys(printConfigFromDB.productTransforms).length : 0
            });
            
            const printImg = await window.Utils.loadImage(printItem.url);
            if (!printImg) continue;

            for (const prod of enabledProducts) {
                // Определяем реальный режим для текущего товара
                let productMode = prod.tab || mode; // 'products' или 'mockups'
                if (productMode === 'base') productMode = 'mockups';

                let tr;
                
                // 1️⃣ ПРИОРИТЕТ 1: Позиции в КОЛЛЕКЦИИ (самые свежие, отредактированные пользователем)
                if (printItem.positions && printItem.positions[prod.id]) {
                    const savedPos = printItem.positions[prod.id];
                    if (savedPos.products && savedPos.mockups) {
                        tr = savedPos[productMode];
                        console.log(`  ✅ [${prod.name}] Используем позицию из КОЛЛЕКЦИИ (${productMode}):`, tr);
                    } else {
                        tr = savedPos;
                        console.log(`  ✅ [${prod.name}] Используем позицию из КОЛЛЕКЦИИ (старый формат):`, tr);
                    }
                }
                
                // 2️⃣ ПРИОРИТЕТ 2: Конфиг из БД (prints_config.json)
                if (!tr && printConfigFromDB) {
                    const dbTransforms = productMode === 'products' 
                        ? printConfigFromDB.productTransforms 
                        : printConfigFromDB.transforms;
                    
                    if (dbTransforms && dbTransforms[prod.id]) {
                        tr = dbTransforms[prod.id];
                        console.log(`  ✅ [${prod.name}] Используем позицию из КОНФИГА БД (${productMode}):`, tr);
                    }
                }
                
                // 3️⃣ ПРИОРИТЕТ 3: Глобальные трансформации (fallback)
                if (!tr) {
                    console.warn(`  ⚠️ [${prod.name}] Не найдена позиция, использую FALLBACK`);
                    tr = window.RenderService.getTransformByMode(
                        transforms,
                        productTransforms,
                        productMode,
                        prod.id,
                        productMode === 'products' ? 0.6 : 0.5
                    );
                    console.log(`  ✅ [${prod.name}] Fallback позиция:`, tr);
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
