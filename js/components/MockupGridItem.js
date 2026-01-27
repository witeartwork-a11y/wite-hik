
window.MockupGridItem = React.memo(({ 
    product, 
    selectedPrint, 
    transform, 
    onUpdateTransform, 
    updateProductDPI, 
    isActive, 
    setActiveProductId,
    isProductsTab 
}) => {
    
    // Вычисляем displayProduct здесь, чтобы не передавать новый объект каждый раз
    let displayProduct;
    if (isProductsTab) {
        displayProduct = { ...product, width: 900, height: 1200 };
    } else {
        displayProduct = {
            ...product,
            width: product.mockupWidth || product.width,
            height: product.mockupHeight || product.height,
            mask: product.mockupMask !== undefined ? product.mockupMask : product.mask,
            overlay: product.mockupOverlay !== undefined ? product.mockupOverlay : product.overlay
        };
    }

    const fallbackScale = isProductsTab ? 0.6 : 0.5;
    const labelWidth = isProductsTab ? product.width : (product.mockupWidth || product.width);
    const labelHeight = isProductsTab ? product.height : (product.mockupHeight || product.height);
    const dpi = product.dpi || 300;
    
    const currentTransform = transform || { x: 0, y: 0, scale: fallbackScale, rotation: 0 };

    return (
        <div className="w-full">
            <div className="mb-2 px-2 flex justify-between items-end">
                <span 
                    className={`text-sm font-medium transition-colors cursor-pointer hover:text-indigo-400 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} 
                    onClick={() => setActiveProductId(product.id)}
                >
                    {product.name}
                </span>
                <span className="text-slate-600 text-xs font-mono">{labelWidth}x{labelHeight}</span>
            </div>
            <div 
                className={`w-full bg-slate-900 rounded-lg border transition-colors ${isActive ? 'border-indigo-500/50' : 'border-slate-800/50'}`}
                style={{ aspectRatio: `${labelWidth} / ${labelHeight}` }}
            >
                <window.MockupCanvas
                    product={displayProduct}
                    imageUrl={selectedPrint.url}
                    maskUrl={displayProduct.mask}
                    overlayUrl={displayProduct.overlay}
                    transform={currentTransform}
                    onUpdateTransform={(newT) => onUpdateTransform(product.id, newT)}
                    productId={product.id}
                    dpi={dpi}
                    onDPIChange={(newDPI) => updateProductDPI(product.id, newDPI)}
                    isActive={isActive}
                    onActivate={() => setActiveProductId(product.id)}
                />
            </div>
        </div>
    );
}, (prev, next) => {
    // Функция сравнения пропсов для мемоизации
    // Возвращаем true, если пропсы "равны" (перерисовывать НЕ надо)
    
    if (prev.isActive !== next.isActive) return false;
    if (prev.product !== next.product) return false;
    if (prev.selectedPrint?.url !== next.selectedPrint?.url) return false;
    if (prev.isProductsTab !== next.isProductsTab) return false;
    
    // Сравнение трансформации. Так как при обновлении стейта в App
    // мы делаем spread копию объекта transforms, но ссылки на вложенные объекты
    // (индивидуальные транформы для неактивных товаров) остаются теми же.
    if (prev.transform !== next.transform) return false;
    
    return true;
});
