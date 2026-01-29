// js/hooks/usePrintCollection.js
window.usePrintCollection = () => {
    const { useState, useCallback } = React;

    const [printCollection, setPrintCollection] = useState([]);
    const [selectedPrintIds, setSelectedPrintIds] = useState([]);

    /**
     * Добавить принт в коллекцию
     * @param {Object} file - объект файла
     * @param {Array} products - список товаров
     * @param {Object} transforms - трансформации mockups
     * @param {Object} productTransforms - трансформации products
     * @param {String} activeTab - текущая вкладка
     */
    const addPrintToCollection = useCallback((file, products, transforms, productTransforms, activeTab) => {
        if (!file) {
            console.warn('addPrintToCollection: файл не передан');
            return null;
        }
        
        try {
            console.log('Добавление принта в коллекцию:', file.name);
            
            const printId = 'print_' + Date.now();
            // Сохраняем позиции всех включенных товаров
            const enabledProducts = products.filter(p => p.enabled);
            const positions = {};
            
            enabledProducts.forEach(prod => {
                // Сохраняем и мокапы, и товары независимо от текущей вкладки
                // Это исправляет баг, когда сохранялись только трансформации текущей вкладки
                positions[prod.id] = {
                    mockups: transforms[prod.id] || (window.RenderService ? window.RenderService.getTransformByMode(
                        transforms,
                        productTransforms,
                        'mockups',
                        prod.id,
                        0.5
                    ) : { x: 0, y: 0, scale: 0.5, rotation: 0 }),
                    
                    products: productTransforms[prod.id] || (window.RenderService ? window.RenderService.getTransformByMode(
                        transforms,
                        productTransforms,
                        'products',
                        prod.id,
                        0.6
                    ) : { x: 0, y: 0, scale: 0.6, rotation: 0 })
                };
            });
            
            const newPrint = {
                id: printId,
                name: file.name,
                url: file.url,
                thumb: file.thumb || file.url,
                article: file.article || file.name.split('.')[0],
                positions: positions
            };

            setPrintCollection(prev => [...prev, newPrint]);
            setSelectedPrintIds(prev => [...prev, printId]);
            
            console.log('Принт успешно добавлен в коллекцию');
            return newPrint;
        } catch (e) {
            console.error('Ошибка при добавлении принта в коллекцию:', e);
            throw e;
        }
    }, []);

    /**
     * Выбрать принт из коллекции
     * @param {String} printId - ID принта
     */
    const selectPrintInCollection = useCallback((printId) => {
        setSelectedPrintIds(prev => (prev.includes(printId) ? prev : [...prev, printId]));
        const print = printCollection.find(p => p.id === printId);
        return print;
    }, [printCollection]);

    /**
     * Удалить принт из коллекции
     * @param {String} printId - ID принта
     */
    const removePrintFromCollection = useCallback((printId) => {
        setPrintCollection(prev => prev.filter(p => p.id !== printId));
        setSelectedPrintIds(prev => prev.filter(id => id !== printId));
    }, []);

    /**
     * Обновить артикул принта
     * @param {String} printId - ID принта
     * @param {String} newArticle - новое значение артикула
     */
    const updateArticle = useCallback((printId, newArticle) => {
        setPrintCollection(prev => 
            prev.map(p => p.id === printId ? { ...p, article: newArticle } : p)
        );
    }, []);

    /**
     * Удалить все принты с определенным именем файла
     * @param {String} fileName - имя файла
     */
    const removeByFileName = useCallback((fileName) => {
        setPrintCollection(prev => {
            const next = prev.filter(p => p.name !== fileName);
            setSelectedPrintIds(ids => ids.filter(id => next.some(p => p.id === id)));
            return next;
        });
    }, []);

    /**
     * Получить принты по ID
     * @param {Array} printIds - массив ID принтов
     */
    const getPrintsByIds = useCallback((printIds) => {
        return printCollection.filter(p => printIds.includes(p.id));
    }, [printCollection]);

    /**
     * Удалить принты после сохранения
     * @param {Array} printIds - массив ID принтов для удаления
     */
    const removePrintsByIds = useCallback((printIds) => {
        setPrintCollection(prev => prev.filter(p => !printIds.includes(p.id)));
        setSelectedPrintIds([]);
    }, []);

    /**
     * Обновить позиции принта (трансформации товаров)
     * @param {String} printId - ID принта
     * @param {Object} newPositions - новые позиции
     */
    const updatePositions = useCallback((printId, newPositions) => {
        setPrintCollection(prev => 
            prev.map(p => p.id === printId ? { ...p, positions: newPositions } : p)
        );
    }, []);

    /**
     * Получить все принты в коллекции
     */
    const getAll = useCallback(() => {
        return printCollection;
    }, [printCollection]);

    /**
     * Получить выбранные ID принтов
     */
    const getSelectedIds = useCallback(() => {
        return selectedPrintIds;
    }, [selectedPrintIds]);

    return {
        printCollection,
        selectedPrintIds,
        addPrintToCollection,
        selectPrintInCollection,
        removePrintFromCollection,
        updateArticle,
        removeByFileName,
        getPrintsByIds,
        removePrintsByIds,
        updatePositions,
        getAll,
        getSelectedIds
    };
};

// Глобальный экспорт для использования через <script> теги
window.usePrintCollection = usePrintCollection;
