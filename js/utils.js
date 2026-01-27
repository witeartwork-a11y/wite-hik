window.Utils = {
    // Рассчитываем масштаб, чтобы картинка влезла в область
    getInitialScale: (containerW, containerH, imgW, imgH) => {
        if (!imgW || !imgH) return 1;
        const scaleX = containerW / imgW;
        const scaleY = containerH / imgH;
        // Берем масштаб поменьше, чтобы влезало целиком с отступом, или заполняло (max)
        return Math.max(scaleX, scaleY); 
    },

    // Получить размеры
    getProductDimensions: (product, mode) => {
        // В режиме превью используем фиксированный размер, в режиме экспорта - реальный
        if (mode === 'mockups') {
            return { width: window.MOCKUP_WIDTH, height: window.MOCKUP_HEIGHT };
        }
        return { width: product.width, height: product.height };
    },

    loadImage: (src) => {
        return new Promise((resolve) => {
            if (!src) return resolve(null);
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => {
                console.error("❌ Failed to load image:", src, "- Check if file exists or path is correct");
                resolve(null);
            };
        });
    }
};