// js/components/ProductCard.js
window.ProductCard = ({ 
    product, 
    index, 
    totalProducts, 
    onToggle, 
    onDelete, 
    onUpdate, 
    onMove, 
    onDuplicate, 
    password,
    activeTab
}) => {
    const { useState, useEffect, useRef } = React;
    const [isEditing, setIsEditing] = useState(false);
    const [localName, setLocalName] = useState(product.name);
    const [isEditingResolution, setIsEditingResolution] = useState(false);
    
    // Config mode based on global active tab
    const configTab = activeTab === 'products' ? 'product' : 'mockup';

    // Compute current values based on tab
    // Fallback for mockup dimensions to product dimensions if not set, to avoid 0x0
    const currentWidth = configTab === 'mockup' ? (product.mockupWidth || product.width) : product.width;
    const currentHeight = configTab === 'mockup' ? (product.mockupHeight || product.height) : product.height;
    
    // For masks/overlays, we treat them as empty if not set (no fallback to product mask for mockup to avoid confusion)
    const currentMask = configTab === 'mockup' ? product.mockupMask : product.mask;
    const currentOverlay = configTab === 'mockup' ? product.mockupOverlay : product.overlay;

    const [localWidth, setLocalWidth] = useState(currentWidth);
    const [localHeight, setLocalHeight] = useState(currentHeight);
    const resolutionContainerRef = useRef(null);

    // Sync local state when product or tab changes
    useEffect(() => {
        setLocalName(product.name);
        setLocalWidth(currentWidth);
        setLocalHeight(currentHeight);
    }, [product.id, configTab, product.width, product.height, product.mockupWidth, product.mockupHeight]);

    const handleResolutionUpdate = () => {
        setIsEditingResolution(false);
        const updates = {};
        if (configTab === 'mockup') {
            updates.mockupWidth = localWidth;
            updates.mockupHeight = localHeight;
        } else {
            updates.width = localWidth;
            updates.height = localHeight;
        }
        onUpdate(product.id, updates);
    };

    // Close editing on click outside
    useEffect(() => {
        if (!isEditingResolution) return;
        
        const handleClickOutside = (e) => {
            if (resolutionContainerRef.current && !resolutionContainerRef.current.contains(e.target)) {
                handleResolutionUpdate();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditingResolution, localWidth, localHeight, product.id, onUpdate, configTab]);

    // Handle file upload
    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if(!file) return;
        
        const formData = new FormData();
        formData.append('files', file);
        formData.append('password', password);
        formData.append('type', 'asset');
        formData.append('assetType', type);
        
        try {
            const res = await fetch('/api.php?action=upload', { method:'POST', body: formData });
            const data = await res.json();
            if(data.success) {
                // Determine field name
                const fieldName = configTab === 'mockup'
                    ? (type === 'mask' ? 'mockupMask' : 'mockupOverlay')
                    : (type === 'mask' ? 'mask' : 'overlay');
                
                const fileUrl = data.files[0].url;
                console.log(`✅ ${type} uploaded for ${configTab}:`, { fieldName, fileUrl, fileName: file.name });
                onUpdate(product.id, { [fieldName]: fileUrl });
            } else {
                alert('Ошибка загрузки: ' + (data.message || 'Unknown'));
            }
        } catch(err) {
            console.error(err);
        } finally {
            e.target.value = '';
        }
    };

    // Handle file delete
    const handleFileDelete = async (type, fileUrl) => {
        if (!fileUrl) return;
        
        const fieldName = configTab === 'mockup'
            ? (type === 'mask' ? 'mockupMask' : 'mockupOverlay')
            : (type === 'mask' ? 'mask' : 'overlay');
            
        onUpdate(product.id, { [fieldName]: '' });
        
        try {
            // Extract filename from URL (e.g., '/uploads/assets/filename.png' -> 'filename.png')
            const filename = fileUrl.split('/').pop();
            
            await fetch('/api.php?action=delete', {
                method: 'POST',
                body: JSON.stringify({
                    password: password,
                    filename: filename,
                    isAsset: true
                })
            });
        } catch(err) {
            console.error('Ошибка удаления файла:', err);
        }
    };

    return (
        <div className={`product-card group ${product.enabled ? 'product-card-enabled' : 'product-card-disabled'}`}>
            {/* --- HEAD --- */}
            <div className="p-3 flex items-center gap-3 border-b border-slate-700/50">
                <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(product.id); }}
                    className={`checkbox ${product.enabled ? 'checkbox-checked' : 'checkbox-unchecked'}`}
                >
                    {product.enabled && <span><window.Icon name="check" className="w-3.5 h-3.5" /></span>}
                </button>

                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input 
                            value={localName}
                            onChange={(e) => setLocalName(e.target.value)}
                            onBlur={() => { setIsEditing(false); onUpdate(product.id, {name: localName}); }}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            autoFocus
                            className="w-full bg-slate-900 border border-indigo-500 rounded px-1.5 py-0.5 text-sm text-white outline-none"
                        />
                    ) : (
                        <div className="flex items-center gap-2 group/name cursor-pointer" onClick={() => setIsEditing(true)}>
                            <span className="text-sm font-medium text-slate-200 truncate">{product.name}</span>
                            <window.Icon name="pencil" className="w-3 h-3 text-slate-600 hover-opacity-show" />
                        </div>
                    )}
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex gap-2 items-center">
                        {isEditingResolution ? (
                            <div ref={resolutionContainerRef} className="flex gap-1 items-center">
                                <input 
                                    type="number"
                                    value={localWidth}
                                    onChange={(e) => setLocalWidth(parseInt(e.target.value) || 1)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleResolutionUpdate();
                                    }}
                                    autoFocus
                                    className="w-12 bg-slate-900 border border-indigo-500 rounded px-1 py-0.5 text-[10px] text-white outline-none"
                                />
                                <span className="text-slate-400">x</span>
                                <input 
                                    type="number"
                                    value={localHeight}
                                    onChange={(e) => setLocalHeight(parseInt(e.target.value) || 1)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleResolutionUpdate();
                                    }}
                                    className="w-12 bg-slate-900 border border-indigo-500 rounded px-1 py-0.5 text-[10px] text-white outline-none"
                                />
                                <span>px</span>
                            </div>
                        ) : (
                            <span className="cursor-pointer hover:text-slate-300 group/res flex items-center gap-1" onClick={() => setIsEditingResolution(true)}>
                                {currentWidth}x{currentHeight}px ({configTab === 'mockup' ? 'Мокап' : 'Товар'})
                                <window.Icon name="pencil" className="w-2.5 h-2.5 text-slate-600 hover-opacity-show" />
                            </span>
                        )}
                        <span>|</span>
                        <span>{product.category}</span>
                    </div>
                </div>

                <button 
                    onClick={() => onDelete(product.id)}
                    className="btn-icon btn-danger hover-opacity-show"
                    title="Удалить"
                >
                    <window.Icon name="trash-2" className="w-4 h-4" />
                </button>
            </div>

            {/* --- BODY --- */}
            {product.enabled && (
                <div className="p-3 space-y-3 bg-slate-900/20">

                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-800 rounded-md border border-slate-700 p-0.5">
                            <button 
                                disabled={index === 0}
                                onClick={() => onMove(index, 'up')}
                                className="btn-icon text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                            >
                                <window.Icon name="arrow-up" className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px bg-slate-700 my-1"></div>
                            <button 
                                disabled={index === totalProducts - 1}
                                onClick={() => onMove(index, 'down')}
                                className="btn-icon text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                            >
                                <window.Icon name="arrow-down" className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <button 
                            onClick={() => onDuplicate(product)}
                            className="btn-secondary p-1.5 px-2 rounded-md text-xs flex items-center gap-1.5"
                        >
                            <window.Icon name="copy" className="w-3.5 h-3.5" />
                            <span>Дубль</span>
                        </button>
                        
                        {/* Prefix */}
                        <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-md px-2 py-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Префикс</span>
                            <input 
                                type="text" 
                                value={product.defaultPrefix || ''}
                                onChange={(e) => onUpdate(product.id, { defaultPrefix: e.target.value })}
                                className="w-full bg-transparent text-xs text-white outline-none font-mono"
                                placeholder="SKU"
                            />
                        </div>
                    </div>

                    {/* Files (Mask & Overlay) */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Mask */}
                        <div className="relative">
                            <label className={`file-upload-button ${currentMask ? 'file-upload-button-active' : 'file-upload-button-inactive'}`}>
                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                    <window.Icon name="layers" className={`w-3.5 h-3.5 ${currentMask ? 'text-indigo-400' : 'text-slate-400'}`} />
                                    <span className={currentMask ? 'text-indigo-300' : 'text-slate-400'}>{configTab === 'mockup' ? 'М. Маска' : 'Маска'}</span>
                                </div>
                                <input type="file" className="hidden" accept="image/png" onChange={e => handleFileUpload(e, 'mask')} />
                            </label>
                            {currentMask && (
                                <button onClick={() => handleFileDelete('mask', currentMask)} className="delete-button">
                                    <window.Icon name="x" className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Overlay */}
                        <div className="relative">
                            <label className={`file-upload-button ${currentOverlay ? 'file-upload-button-active' : 'file-upload-button-inactive'}`}>
                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                    <window.Icon name="eye" className={`w-3.5 h-3.5 ${currentOverlay ? 'text-indigo-400' : 'text-slate-400'}`} />
                                    <span className={currentOverlay ? 'text-indigo-300' : 'text-slate-400'}>{configTab === 'mockup' ? 'М. Оверлей' : 'Оверлей'}</span>
                                </div>
                                <input type="file" className="hidden" accept="image/png" onChange={e => handleFileUpload(e, 'overlay')} />
                            </label>
                            {currentOverlay && (
                                <button onClick={() => handleFileDelete('overlay', currentOverlay)} className="delete-button">
                                    <window.Icon name="x" className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};
