// Сервис для работы с трансформациями принтов
window.TransformService = {
    /**
     * Загружает и применяет конфиг принта с таймером
     * @param {Object} file - объект файла/принта
     * @param {Array} products - список товаров
     * @param {Function} setTransforms - setter для transforms
     * @param {Function} setProductTransforms - setter для productTransforms
     * @param {Ref} autoLoadTimerRef - ref для таймера
     * @param {Ref} isPrintLoadedRef - ref для флага загрузки
     * @returns {Promise}
     */
    loadPrintWithConfig: async (file, products, setTransforms, setProductTransforms, autoLoadTimerRef, isPrintLoadedRef) => {
        if (!file || !window.RenderService) {
            console.error('TransformService.loadPrintWithConfig: файл или RenderService не найден');
            return;
        }

        try {
            // 1. Загружаем дефолтные трансформации
            const defTransforms = await window.RenderService.initializeTransforms(file, products, 'mockups');
            const defProdTransforms = await window.RenderService.initializeTransforms(file, products, 'products');
            
            setTransforms(defTransforms);
            setProductTransforms(defProdTransforms);
            console.log('✓ Дефолтные трансформации загружены');

            // 2. Запускаем таймер на подгрузку реального конфига (500мс)
            if (autoLoadTimerRef.current) clearTimeout(autoLoadTimerRef.current);
            
            autoLoadTimerRef.current = setTimeout(async () => {
                console.log('🔄 Авто-загрузка конфига для:', file.name);
                const saved = await window.DataService.loadPrintsConfig(file.name);
                
                if (saved && saved.transforms) {
                    console.log('✅ Конфиг найден, применяю...');
                    setTransforms(prev => ({ ...prev, ...saved.transforms }));
                    setProductTransforms(prev => ({ ...prev, ...saved.productTransforms }));
                } else {
                    console.log('ℹ️ Конфига нет, оставляем дефолт');
                }
                
                // Включаем автосохранение
                isPrintLoadedRef.current = true;
            }, 500);

        } catch (e) {
            console.error('Ошибка в TransformService.loadPrintWithConfig:', e);
            throw e;
        }
    },

    /**
     * Сохраняет конфиг принта
     * @param {String} password - пароль
     * @param {String} printName - имя принта
     * @param {Object} transforms - трансформации mockups
     * @param {Object} productTransforms - трансформации products
     * @returns {Promise<Boolean>}
     */
    savePrintConfig: async (password, printName, transforms, productTransforms) => {
        try {
            const data = {
                transforms,
                productTransforms,
                lastModified: Date.now()
            };
            return await window.DataService.savePrintConfig(password, printName, data);
        } catch (e) {
            console.error('Ошибка сохранения конфига:', e);
            return false;
        }
    },

    /**
     * Применяет пресет к трансформациям
     * @param {Object} preset - пресет (может быть одиночный или map)
     * @param {String} activeProductId - ID активного товара
     * @param {String} activeTab - текущая вкладка ('mockups' или 'products')
     * @param {Object} transforms - текущие transforms
     * @param {Object} productTransforms - текущие productTransforms
     * @returns {Object} - { newTransforms, newProductTransforms }
     */
    applyPresetToTransforms: (preset, activeProductId, activeTab, transforms, productTransforms) => {
        if (!preset) return { newTransforms: transforms, newProductTransforms: productTransforms };

        const isSingleTransform = preset.x !== undefined || preset.scale !== undefined;
        let newTransforms = { ...transforms };
        let newProductTransforms = { ...productTransforms };

        if (isSingleTransform && activeProductId) {
            if (activeTab === 'products') {
                newProductTransforms = { ...newProductTransforms, [activeProductId]: { ...preset } };
            } else {
                newTransforms = { ...newTransforms, [activeProductId]: { ...preset } };
            }
        } else if (!isSingleTransform) {
            // Old behavior (full map)
            if (activeTab === 'products') {
                newProductTransforms = { ...newProductTransforms, ...preset };
            } else {
                newTransforms = { ...newTransforms, ...preset };
            }
        }

        return { newTransforms, newProductTransforms };
    },

    /**
     * Мержит трансформации (для применения конфига после загрузки)
     * @param {Object} calculated - рассчитанные дефолтные трансформации
     * @param {Object} saved - сохраненные трансформации
     * @returns {Object} - объединенные трансформации с приоритетом saved
     */
    mergeTransforms: (calculated, saved) => {
        if (!saved) return calculated;
        return { ...calculated, ...saved };
    },

    /**
     * Инициализирует трансформации для нового принта
     * @param {Object} file - файл принта
     * @param {Array} products - список товаров
     * @param {String} mode - 'mockups' или 'products'
     * @returns {Promise<Object>}
     */
    initializeTransforms: async (file, products, mode) => {
        if (!window.RenderService) throw new Error('RenderService not loaded');
        return await window.RenderService.initializeTransforms(file, products, mode);
    }
};
