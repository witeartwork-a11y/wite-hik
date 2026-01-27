// Сервис для рендеринга мокапов
window.RenderService = {
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

        const canvas = document.createElement('canvas');
        let width = mockupWidth || (base ? base.width : (options.outputWidth || product.width || 1000));
        let height = mockupHeight || (base ? base.height : (options.outputHeight || product.height || 1000));
        
        // Если заданы оба размера, используем их
        if (mockupWidth && !mockupHeight && base) {
            height = Math.round((mockupWidth / base.width) * base.height);
        } else if (mockupHeight && !mockupWidth && base) {
            width = Math.round((mockupHeight / base.height) * base.width);
        }
        
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, width, height);

        if (base) ctx.drawImage(base, 0, 0, width, height);

        if (printImg) {
            const tempC = document.createElement('canvas');
            tempC.width = width;
            tempC.height = height;
            const tCtx = tempC.getContext('2d');

            tCtx.save();
            tCtx.translate(width / 2 + (transform?.x || 0), height / 2 + (transform?.y || 0));
            tCtx.rotate((transform?.rotation || 0) * Math.PI / 180);
            tCtx.scale(transform?.scale || 1, transform?.scale || 1);
            tCtx.drawImage(printImg, -printImg.width / 2, -printImg.height / 2);
            tCtx.restore();

            if (mask) {
                tCtx.globalCompositeOperation = 'destination-in';
                tCtx.drawImage(mask, 0, 0, width, height);
                tCtx.globalCompositeOperation = 'source-over'; // СБРАСЫВАЕМ
            }

            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(tempC, 0, 0);
        }

        if (overlay) {
            ctx.globalCompositeOperation = 'source-over';
            // Масштабируем оверлей чтобы заполнить весь канвас
            if (overlay.width > 0 && overlay.height > 0) {
                const scale = Math.max(width / overlay.width, height / overlay.height);
                const scaledWidth = overlay.width * scale;
                const scaledHeight = overlay.height * scale;
                const ox = (width - scaledWidth) / 2;
                const oy = (height - scaledHeight) / 2;
                ctx.drawImage(overlay, ox, oy, scaledWidth, scaledHeight);
            }
        }

        const mimeType = options.mimeType || 'image/png';
        let blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, mimeType, mimeType === 'image/png' ? undefined : 0.9);
        });
        
        // Устанавливаем DPI для PNG
        if (mimeType === 'image/png' && mockupDPI && window.PNGService) {
            blob = await window.PNGService.setPNGDPI(blob, mockupDPI);
        }
        
        return blob;
    }
};
