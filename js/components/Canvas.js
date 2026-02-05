
// js/components/Canvas.js

window.MockupCanvas = ({ product, imageUrl, maskUrl, overlayUrl, transform, onUpdateTransform, productId, dpi, onDPIChange, isActive, onActivate, maskColor }) => {
    // В будущем здесь можно будет добавить переключение рендереров
    const rendererType = product.renderer || 'canvas'; 

    if (rendererType === 'canvas') {
        return <CanvasRenderer 
            product={product}
            imageUrl={imageUrl}
            maskUrl={maskUrl}
            overlayUrl={overlayUrl}
            transform={transform}
            onUpdateTransform={onUpdateTransform}
            productId={productId}
            dpi={dpi}
            onDPIChange={onDPIChange}
            isActive={isActive}
            onActivate={onActivate}
            maskColor={maskColor}
        />;
    } else if (rendererType === 'pixi') {
         // Placeholder for PixiJS renderer
         return <div className="text-white text-xs p-4 bg-slate-800 rounded">PixiJS Renderer (Coming Soon)</div>;
    } else if (rendererType === 'warp') {
         // Placeholder for Warp.js renderer
         return <div className="text-white text-xs p-4 bg-slate-800 rounded">Warp.js Renderer (Coming Soon)</div>;
    } else {
        return <div className="text-red-400 text-xs p-4">Unknown Renderer: {rendererType}</div>;
    }
};

const CanvasRenderer = ({ product, imageUrl, maskUrl, overlayUrl, transform, onUpdateTransform, productId, dpi, onDPIChange, isActive, onActivate, maskColor }) => {
    const { useRef, useState, useEffect } = React;
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef(null);


    // Нормализуем трансформацию, используя RenderService для унификации
    const t = window.RenderService ? window.RenderService.normalizeTransform(transform) : {
        x: Number.isFinite(transform?.x) ? transform.x : 0,
        y: Number.isFinite(transform?.y) ? transform.y : 0,
        scale: Math.min(10, Math.max(0.05, Number.isFinite(transform?.scale) ? transform.scale : 0.5)),
        rotation: Number.isFinite(transform?.rotation) ? transform.rotation : 0,
    };

    const [images, setImages] = useState({ base: null, mask: null, overlay: null, print: null });

    // 1. Загрузка изображений (только при смене URL)
    useEffect(() => {
        let isMounted = true;
        
        const loadImages = async () => {
            if (!window.Utils) return;
            const utils = window.Utils;
            
            try {
                // Если URL не менялся, не загружаем заново.
                // В данном случае мы просто загружаем все при смене любого пропса.
                // Можно оптимизировать, сравнивая с предыдущим, но utils.loadImage
                // должен быстро возвращать (если кэш). Проблема была в том, что
                // это вызывалось при каждом смещении (drag).
                // Теперь мы отделили загрузку от отрисовки.
                
                const [baseImg, maskImg, overlayImg, printImg] = await Promise.all([
                    utils.loadImage(product.image),
                    utils.loadImage(maskUrl !== undefined ? maskUrl : product.mask),
                    utils.loadImage(overlayUrl !== undefined ? overlayUrl : product.overlay),
                    utils.loadImage(imageUrl)
                ]);

                if (isMounted) {
                    setImages({ base: baseImg, mask: maskImg, overlay: overlayImg, print: printImg });
                }
            } catch (err) {
                console.error("Ошибка загрузки изображений:", err);
            }
        };

        loadImages();

        return () => { isMounted = false; };
    }, [product.image, maskUrl, product.mask, overlayUrl, product.overlay, imageUrl]);


    // 2. Отрисовка (синхронно или через rAF, зависит от images и transform)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { base: baseImg, mask: maskImg, overlay: overlayImg, print: printImg } = images;

        if (!baseImg && !printImg) return;

        // requestAnimationFrame для плавности при частом обновлении
        let animationFrameId;

        const draw = () => {
            canvas.width = baseImg ? baseImg.width : (product.width || 1000);
            canvas.height = baseImg ? baseImg.height : (product.height || 1000);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over'; 

            // Рисуем шахматный паттерн
            const checkSize = 20;
            // Простая оптимизация: не рисовать паттерн если есть baseImg без прозрачности, но мы не знаем есть ли она.
            // Можно рисовать реже или один раз на back canvas.
            // Но паттерн рисуется быстро.
            for (let y = 0; y < canvas.height; y += checkSize) {
                for (let x = 0; x < canvas.width; x += checkSize) {
                    ctx.fillStyle = ((x / checkSize + y / checkSize) % 2 === 0) ? '#e5e7eb' : '#ffffff';
                    ctx.fillRect(x, y, checkSize, checkSize);
                }
            }

            if (baseImg) ctx.drawImage(baseImg, 0, 0);

            if (printImg) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tCtx = tempCanvas.getContext('2d');
                tCtx.clearRect(0, 0, canvas.width, canvas.height);

                // Используем единую функцию трансформации из RenderService
                if (window.RenderService) {
                    window.RenderService.applyPrintTransform(tCtx, printImg, t, canvas.width, canvas.height);
                    window.RenderService.applyMask(tCtx, maskImg, canvas.width, canvas.height);
                } else {
                    // Fallback если RenderService не загружен
                    tCtx.save();
                    tCtx.translate(canvas.width / 2 + t.x, canvas.height / 2 + t.y);
                    tCtx.rotate(t.rotation * Math.PI / 180);
                    tCtx.scale(t.scale, t.scale);
                    tCtx.drawImage(printImg, -printImg.width / 2, -printImg.height / 2);
                    tCtx.restore();

                    if (maskImg) {
                        tCtx.globalCompositeOperation = 'destination-in';
                        tCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
                        tCtx.globalCompositeOperation = 'source-over';
                    }
                }

                ctx.save();
                ctx.globalCompositeOperation = product.blendMode || 'source-over';
                ctx.drawImage(tempCanvas, 0, 0);

                // Визуализация границ маски (Если выбран цвет)
                if (maskColor && maskImg) {
                    const maskOverlayCanvas = document.createElement('canvas');
                    maskOverlayCanvas.width = canvas.width;
                    maskOverlayCanvas.height = canvas.height;
                    const mCtx = maskOverlayCanvas.getContext('2d');
                    
                    mCtx.fillStyle = maskColor;
                    mCtx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    mCtx.globalCompositeOperation = 'destination-out';
                    mCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
                    
                    ctx.globalAlpha = 0.85; 
                    ctx.drawImage(maskOverlayCanvas, 0, 0);
                    ctx.globalAlpha = 1.0;
                }
                
                ctx.restore();
            }

            // Overlay рисуется самым последним слоем поверх всего
            if (overlayImg && window.RenderService) {
                window.RenderService.applyOverlay(ctx, overlayImg, canvas.width, canvas.height);
            } else if (overlayImg) {
                // Fallback
                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                const ox = (canvas.width - overlayImg.width) / 2;
                const oy = (canvas.height - overlayImg.height) / 2;
                ctx.drawImage(overlayImg, ox, oy);
                ctx.restore();
            }
        };

        animationFrameId = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [images, t.x, t.y, t.scale, t.rotation, product.width, product.height, maskColor, product.blendMode]);

    const stateRef = useRef({ t, onUpdateTransform, imageUrl, isDragging: isDragging });
    useEffect(() => {
        stateRef.current = { t, onUpdateTransform, imageUrl, isDragging };
    }, [t, onUpdateTransform, imageUrl, isDragging]);

    // Обработчики мыши на всем документе для плавной работы
    useEffect(() => {
        const handleMouseMove = (e) => {
            const { t, onUpdateTransform, imageUrl, isDragging } = stateRef.current;
            if (!isDragging || !imageUrl || !dragStartRef.current) return;
            e.preventDefault();
            e.stopPropagation();

            const canvas = canvasRef.current;
            if (!canvas) return;
            
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const dx = e.clientX - dragStartRef.current.mouseX;
            const dy = e.clientY - dragStartRef.current.mouseY;

            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            onUpdateTransform({
                ...t,
                x: dragStartRef.current.startX + dx * scaleX,
                y: dragStartRef.current.startY + dy * scaleY,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragStartRef.current = null;
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove, { passive: false });
            document.addEventListener('mouseup', handleMouseUp, { passive: false });
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging]);

    // Обработчик начала перетаскивания на canvas
    const handleMouseDown = (e) => {
        if (onActivate) onActivate();
        if (!imageUrl) return;
        setIsDragging(true);
        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            startX: t.x,
            startY: t.y,
        };
    };

    // Wheel zoom с правильной очисткой
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const onWheel = (e) => {
            // Требуем нажатия Ctrl или Command для зума, чтобы не мешать скроллу
            if (!e.ctrlKey && !e.metaKey) {
                return;
            }

            // Если канвас активен, то зумим его. Если нет - может скроллить страницу.
            // Но пользователь может хотеть зумить и неактивный канвас.
            // Оставим базовое поведение, но добавим активацию при зуме.
            if (onActivate) onActivate();

            e.preventDefault();
            const { t, onUpdateTransform, imageUrl } = stateRef.current;
            if (!imageUrl) return;
            // Увеличил скорость зума с 0.01 до 0.05 для удобства
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            const newScale = Math.min(10, Math.max(0.05, t.scale + delta));
            onUpdateTransform({ ...t, scale: newScale });
        };


        
        // passive: false критически важен, чтобы preventDefault работал
        container.addEventListener('wheel', onWheel, { passive: false });
        
        return () => {
            container.removeEventListener('wheel', onWheel);
        };
    }, []);

    // Удаляем внутренние контролы смещения и вращения
    // Оставляем только canvas

    return (
        <div 
            ref={containerRef} 
            className={`w-full h-full flex flex-col bg-slate-900/50 rounded-xl overflow-hidden border p-2 pb-6 select-none no-scroll-zoom transition-colors duration-200
                ${isActive ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-slate-700 hover:border-slate-600'}
            `}
            onClick={() => onActivate && onActivate()}
            title="Перетаскивайте для перемещения. Ctrl + Скролл для масштабирования."
        >
            <div className="relative flex-1 flex items-center justify-center">
                <canvas
                    ref={canvasRef}
                    className="max-h-full max-w-full shadow-2xl cursor-move object-contain"
                    onMouseDown={handleMouseDown}
                />
            </div>
        </div>
    );
};
