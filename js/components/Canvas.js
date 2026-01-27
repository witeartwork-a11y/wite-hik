// js/components/Canvas.js

window.MockupCanvas = ({ product, imageUrl, maskUrl, overlayUrl, transform, onUpdateTransform, productId, dpi, onDPIChange }) => {
    const { useRef, useState, useEffect } = React;
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef(null);

    // Нормализуем трансформацию, чтобы избежать NaN/undefined
    const t = {
        x: Number.isFinite(transform?.x) ? transform.x : 0,
        y: Number.isFinite(transform?.y) ? transform.y : 0,
        scale: Math.min(10, Math.max(0.05, Number.isFinite(transform?.scale) ? transform.scale : 0.5)),
        rotation: Number.isFinite(transform?.rotation) ? transform.rotation : 0,
    };

    // Отрисовка
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !product || !window.Utils) return;
        const ctx = canvas.getContext('2d');
        const utils = window.Utils;

        let isMounted = true; // Флаг для отмены операций при размонтировании

        const render = async () => {
            try {
                const baseImg = await utils.loadImage(product.image);
                const maskImg = await utils.loadImage(maskUrl !== undefined ? maskUrl : product.mask);
                const overlayImg = await utils.loadImage(overlayUrl !== undefined ? overlayUrl : product.overlay);
                const printImg = await utils.loadImage(imageUrl);

                // Если компонент размонтирован, не рисуем
                if (!isMounted) return;

                if (!baseImg && !printImg) return;

                canvas.width = baseImg ? baseImg.width : (product.width || 1000);
                canvas.height = baseImg ? baseImg.height : (product.height || 1000);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = 'source-over'; // Гарантируем начальное состояние

                // Рисуем шахматный паттерн для прозрачных областей
                const checkSize = 20;
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
                    const cx = canvas.width / 2;
                    const cy = canvas.height / 2;

                    tCtx.save();
                    tCtx.translate(cx + t.x, cy + t.y);
                    tCtx.rotate((t.rotation || 0) * Math.PI / 180);
                    tCtx.scale(t.scale, t.scale);
                    tCtx.drawImage(printImg, -printImg.width / 2, -printImg.height / 2);
                    tCtx.restore();

                    if (maskImg) {
                        tCtx.globalCompositeOperation = 'destination-in';
                        tCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
                        tCtx.globalCompositeOperation = 'source-over'; // СБРАСЫВАЕМ!
                    }

                    ctx.drawImage(tempCanvas, 0, 0);
                }

                if (overlayImg) {
                    ctx.globalCompositeOperation = 'multiply';
                    ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
                    ctx.globalCompositeOperation = 'source-over';
                }
            } catch (err) {
                console.error("Ошибка отрисовки Canvas:", err);
            }
        };

        render();

        // Очистка при размонтировании
        return () => {
            isMounted = false;
        };
    }, [product, imageUrl, maskUrl, overlayUrl, t.x, t.y, t.scale, t.rotation]);

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

    const rotateBy = (deg) => {
        const nextRotation = (t.rotation || 0) + deg;
        onUpdateTransform({ ...t, rotation: nextRotation });
    };

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700 p-2 select-none no-scroll-zoom">
            <div className="relative flex-1 flex items-center justify-center">
                <canvas
                    ref={canvasRef}
                    className="max-h-full max-w-full shadow-2xl cursor-move object-contain"
                    onMouseDown={handleMouseDown}
                />
            </div>

            {/* Панель управления под холстом, чтобы не перекрывать изображение */}
            <div className="mt-3 flex flex-col gap-2 text-slate-200">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="grid grid-cols-3 grid-rows-3 gap-0.5 bg-slate-800/80 border border-slate-700 rounded-lg p-1 shadow-lg">
                        <button onClick={(e) => { e.stopPropagation(); onUpdateTransform({ ...t, y: t.y - 10 }); }} className="p-1 col-start-2 row-start-1 text-slate-200 hover:text-white" title="Сместить вверх">
                            <window.Icon name="arrow-up" className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateTransform({ ...t, x: t.x - 10 }); }} className="p-1 col-start-1 row-start-2 text-slate-200 hover:text-white" title="Сместить влево">
                            <window.Icon name="arrow-left" className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateTransform({ ...t, x: 0, y: 0 }); }} className="p-1 col-start-2 row-start-2 text-slate-200 hover:text-white" title="Центрировать">
                            <window.Icon name="move" className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateTransform({ ...t, x: t.x + 10 }); }} className="p-1 col-start-3 row-start-2 text-slate-200 hover:text-white" title="Сместить вправо">
                            <window.Icon name="arrow-right" className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateTransform({ ...t, y: t.y + 10 }); }} className="p-1 col-start-2 row-start-3 text-slate-200 hover:text-white" title="Сместить вниз">
                            <window.Icon name="arrow-down" className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1 shadow-lg">
                        <button onClick={(e) => { e.stopPropagation(); rotateBy(-1); }} className="p-1.5 text-slate-200 hover:text-white" title="Повернуть -1°">
                            <window.Icon name="rotate-ccw" className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateTransform({ ...t, rotation: 0 }); }} className="p-1.5 text-slate-200 hover:text-white" title="Сбросить поворот">
                            <window.Icon name="refresh-ccw" className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); rotateBy(1); }} className="p-1.5 text-slate-200 hover:text-white" title="Повернуть +1°">
                            <window.Icon name="rotate-cw" className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onUpdateTransform({ ...t, scale: 1, rotation: 0, x: 0, y: 0 }); }}
                        className="p-2 bg-slate-800/90 text-white rounded-lg border border-slate-600 hover:bg-indigo-600 transition-colors shadow-lg"
                        title="Сбросить все"
                    >
                        <window.Icon name="rotate-ccw" className="w-4 h-4" />
                    </button>
                </div>

                <label className="flex items-center gap-3 text-xs text-slate-300">
                    <span className="whitespace-nowrap">Масштаб</span>
                    <input
                        type="range"
                        min="0.05" max="10" step="0.01"
                        value={t.scale}
                        onChange={(e) => onUpdateTransform({ ...t, scale: parseFloat(e.target.value) })}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 accent-indigo-400"
                    />
                    <span className="w-12 text-right tabular-nums">{Math.round(t.scale * 100)}%</span>
                </label>

                {onDPIChange && (
                    <label className="flex items-center gap-3 text-xs text-slate-300">
                        <span className="whitespace-nowrap">DPI</span>
                        <input
                            type="range"
                            min="72" max="600" step="1"
                            value={dpi || 300}
                            onChange={(e) => onDPIChange(parseInt(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 accent-indigo-400"
                        />
                        <span className="w-12 text-right tabular-nums">{dpi || 300}</span>
                    </label>
                )}
            </div>
        </div>
    );
};
