// Сервис для рендеринга мокапов
window.RenderService = {
    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
    
    // Нормализировать трансформацию (защита от NaN/undefined)
    normalizeTransform: (transform) => {
        return {
            x: Number.isFinite(transform?.x) ? transform.x : 0,
            y: Number.isFinite(transform?.y) ? transform.y : 0,
            scale: Math.min(10, Math.max(0.05, Number.isFinite(transform?.scale) ? transform.scale : 1)),
            rotation: Number.isFinite(transform?.rotation) ? transform.rotation : 0
        };
    },

    // Применить трансформацию к принту на отдельном канвасе
    applyPrintTransform: (ctx, printImg, transform, canvasWidth, canvasHeight) => {
        const t = window.RenderService.normalizeTransform(transform);
        
        ctx.save();
        // Переводим центр координат в центр канваса
        ctx.translate(canvasWidth / 2 + t.x, canvasHeight / 2 + t.y);
        // Применяем поворот
        ctx.rotate((t.rotation) * Math.PI / 180);
        // Применяем масштаб
        ctx.scale(t.scale, t.scale);
        // Рисуем принт относительно его центра
        ctx.drawImage(printImg, -printImg.width / 2, -printImg.height / 2);
        ctx.restore();
    },

    // Применить маску к слою с принтом
    applyMask: (ctx, maskImg, canvasWidth, canvasHeight) => {
        if (!maskImg) return;
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskImg, 0, 0, canvasWidth, canvasHeight);
        ctx.globalCompositeOperation = 'source-over';
    },

    // Применить оверлей
    applyOverlay: (ctx, overlayImg, canvasWidth, canvasHeight) => {
        if (!overlayImg) return;
        ctx.globalCompositeOperation = 'source-over';
        if (overlayImg.width > 0 && overlayImg.height > 0) {
            const scale = Math.max(canvasWidth / overlayImg.width, canvasHeight / overlayImg.height);
            const scaledWidth = overlayImg.width * scale;
            const scaledHeight = overlayImg.height * scale;
            const ox = (canvasWidth - scaledWidth) / 2;
            const oy = (canvasHeight - scaledHeight) / 2;
            ctx.drawImage(overlayImg, ox, oy, scaledWidth, scaledHeight);
        }
    },

    // === ОСНОВНЫЕ МЕТОДЫ ===

    // Построить дефолтные трансформации для всех товаров
    buildDefaultTransforms: (products, mode = 'mockups') => {
        const map = {};
        products.forEach(p => {
            if (!p.enabled) return;
            map[p.id] = { x: 0, y: 0, scale: 0.6, rotation: 0 };
        });
        return map;
    },

    // Получить дефолтный масштаб для режима
    getDefaultScale: (mode) => {
        return mode === 'products' ? 0.6 : 0.5;
    },

    // Инициализировать трансформации при выборе принта
    initializeTransforms: async (file, products, mode = 'mockups') => {
        const buildDefault = () => window.RenderService.buildDefaultTransforms(products, mode);

        try {
            if (!window.Utils) {
                return buildDefault();
            }

            const img = await window.Utils.loadImage(file.url);
            if (!img) {
                return buildDefault();
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

            return buildMap((p) => ({ w: p.width || 1000, h: p.height || 1000 }));
        } catch (e) {
            console.error("Ошибка инициализации трансформаций:", e);
            return buildDefault();
        }
    },

    // Получить трансформацию по режиму
    getTransformByMode: (transforms, productTransforms, mode, productId, fallbackScale = 0.5) => {
        const map = mode === 'products' ? productTransforms : transforms;
        return map[productId] || { x: 0, y: 0, scale: fallbackScale, rotation: 0 };
    },

    // Отрендерить мокап в Blob
    renderMockupBlob: async (product, printImg, transform, mockupDPI, mockupWidth, mockupHeight, options = {}) => {
        if (!window.Utils) throw new Error("Библиотеки не загружены");
        const utils = window.Utils;

        const maskUrl = (options && options.maskUrl !== undefined) ? options.maskUrl : product.mask;
        const overlayUrl = (options && options.overlayUrl !== undefined) ? options.overlayUrl : product.overlay;
        
        console.log('🎨 renderMockupBlob:', { 
            productName: product.name,
            transform: window.RenderService.normalizeTransform(transform),
            maskUrl: maskUrl || '(none)', 
            overlayUrl: overlayUrl || '(none)',
            mockupWidth,
            mockupHeight
        });

        const [base, mask, overlay] = await Promise.all([
            utils.loadImage(product.image),
            utils.loadImage(maskUrl),
            utils.loadImage(overlayUrl)
        ]);

        // Определяем размеры холста
        let width = mockupWidth || (base ? base.width : (options.outputWidth || product.width || 1000));
        let height = mockupHeight || (base ? base.height : (options.outputHeight || product.height || 1000));
        
        if (mockupWidth && !mockupHeight && base) {
            height = Math.round((mockupWidth / base.width) * base.height);
        } else if (mockupHeight && !mockupWidth && base) {
            width = Math.round((mockupHeight / base.height) * base.width);
        }
        
        // Создаем основной холст
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        // Белая подложка по умолчанию (чтобы прозрачные принты не становились черными)
        if (options.backgroundColor !== null) {
            ctx.save();
            ctx.fillStyle = options.backgroundColor || '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        // Слой 1: Базовое изображение товара
        if (base) {
            ctx.drawImage(base, 0, 0, width, height);
        }

        // Слой 2: Принт с трансформацией и маской
        if (printImg) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.clearRect(0, 0, width, height);

            // Применяем трансформацию принта
            window.RenderService.applyPrintTransform(tempCtx, printImg, transform, width, height);

            // Применяем маску (вырезаем видимую область)
            window.RenderService.applyMask(tempCtx, mask, width, height);

            // Копируем результат на основной холст
            // Используем режим наложения из настроек товара
            ctx.globalCompositeOperation = product.blendMode || 'source-over';
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
        }

        // Слой 3: Оверлей поверх всего
        window.RenderService.applyOverlay(ctx, overlay, width, height);

        // Конвертируем в Blob (с поддержкой поворота результата)
        const mimeType = options.mimeType || 'image/png';
        let blob;

        if (options.renderRotation && (options.renderRotation === 90 || options.renderRotation === -90)) {
             // Если нужно повернуть финальный результат (canvas)
             const rotCanvas = document.createElement('canvas');
             // Меняем местами ширину и высоту
             rotCanvas.width = height; 
             rotCanvas.height = width;
             const rotCtx = rotCanvas.getContext('2d');
             
             // Перемещаем центр координат в центр нового канваса
             rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
             // Вращаем
             rotCtx.rotate((options.renderRotation * Math.PI) / 180);
             // Рисуем исходный канвас (центрируя его)
             rotCtx.drawImage(canvas, -width / 2, -height / 2);
             
             blob = await new Promise((resolve) => {
                 rotCanvas.toBlob(resolve, mimeType, mimeType === 'image/png' ? undefined : 0.9);
             });
        } else {
             blob = await new Promise((resolve) => {
                 canvas.toBlob(resolve, mimeType, mimeType === 'image/png' ? undefined : 0.9);
             });
        }
        
        // Устанавливаем DPI для PNG
        if (mimeType === 'image/png' && mockupDPI && window.PNGService) {
            blob = await window.PNGService.setPNGDPI(blob, mockupDPI);
        }
        
        console.log('✅ renderMockupBlob завершен:', { width, height, hasBlob: !!blob });
        return blob;
    }
};
