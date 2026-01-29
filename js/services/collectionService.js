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
                
                // Получаем кандидатов из разных источников
                
                // A. Из коллекции (текущий сеанс)
                let posFromCollection = null;
                if (printItem.positions && printItem.positions[prod.id]) {
                    const savedPos = printItem.positions[prod.id];
                    if (savedPos.products && savedPos.mockups) {
                        posFromCollection = savedPos[productMode];
                    } else {
                        posFromCollection = savedPos;
                    }
                }

                // B. Из БД (сохраненный конфиг)
                let posFromDB = null;
                if (printConfigFromDB) {
                    const dbTransforms = productMode === 'products' 
                        ? printConfigFromDB.productTransforms 
                        : printConfigFromDB.transforms;
                    
                    if (dbTransforms && dbTransforms[prod.id]) {
                        posFromDB = dbTransforms[prod.id];
                    }
                }

                // C. Проверка на "дефолтность" коллекции (пустые значения)
                // Если в коллекции лежат нули (x=0, y=0, rot=0), скорее всего это авто-заглушка
                const isCollectionDefault = posFromCollection && 
                                          Math.abs(posFromCollection.x) < 0.1 && 
                                          Math.abs(posFromCollection.y) < 0.1 && 
                                          Math.abs(posFromCollection.rotation) < 0.1;

                // ЛОГИКА ВЫБОРА (ИЗМЕНЕНА ПО ПРОСЬБЕ ПОЛЬЗОВАТЕЛЯ - ПРИОРИТЕТ БД)
                
                // 1️⃣ Если есть конфиг в БД — берем его! (особенно если коллекция пустая/дефолтная)
                if (posFromDB) {
                    if (isCollectionDefault) {
                        tr = posFromDB;
                        console.log(`  ✅ [${prod.name}] Используем БД (коллекция была дефолтной 0/0/0):`, tr);
                    } else {
                        // Конфликт: есть и в БД, и в коллекции (не дефолт). 
                        // По просьбе "брать именно инфу из prints_config" — берем БД.
                        // Если вы захотите вернуть приоритет ручным правкам — поменяйте местами.
                        tr = posFromDB;
                        console.log(`  ✅ [${prod.name}] Используем БД (приоритет над коллекцией):`, tr);
                    }
                } 
                // 2️⃣ Если в БД нет, берем из коллекции
                else if (posFromCollection) {
                    tr = posFromCollection;
                    console.log(`  ✅ [${prod.name}] Используем КОЛЛЕКЦИЮ (в БД нет записи):`, tr);
                }
                
                // 3️⃣ Fallback
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
                        printItem.name,
                        prod.name
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
