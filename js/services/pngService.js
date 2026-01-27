// Сервис для работы с PNG файлами (установка DPI)
window.PNGService = {
    // Функция для установки DPI в PNG
    setPNGDPI: async (blob, dpi) => {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Найдем конец IHDR чанка (сигнатура PNG + IHDR)
        let insertPosition = 33; // После PNG сигнатуры и IHDR чанка
        
        // Создаем pHYs чанк для установки DPI
        // DPI to pixels per meter: DPI * 39.3701
        const pixelsPerMeter = Math.round(dpi * 39.3701);
        
        const pHYs = new Uint8Array([
            0, 0, 0, 9, // Длина чанка (9 байт)
            0x70, 0x48, 0x59, 0x73, // 'pHYs'
            (pixelsPerMeter >> 24) & 0xff,
            (pixelsPerMeter >> 16) & 0xff,
            (pixelsPerMeter >> 8) & 0xff,
            pixelsPerMeter & 0xff,
            (pixelsPerMeter >> 24) & 0xff,
            (pixelsPerMeter >> 16) & 0xff,
            (pixelsPerMeter >> 8) & 0xff,
            pixelsPerMeter & 0xff,
            1, // Единица измерения: метры
        ]);
        
        // Вычисляем CRC32 для pHYs
        const crcTable = new Int32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            }
            crcTable[i] = c;
        }
        
        let crc = -1;
        for (let i = 4; i < pHYs.length; i++) {
            crc = crcTable[(crc ^ pHYs[i]) & 0xff] ^ (crc >>> 8);
        }
        crc = crc ^ -1;
        
        const crcBytes = new Uint8Array([
            (crc >> 24) & 0xff,
            (crc >> 16) & 0xff,
            (crc >> 8) & 0xff,
            crc & 0xff
        ]);
        
        // Собираем новый PNG
        const newArray = new Uint8Array(uint8Array.length + pHYs.length + crcBytes.length);
        newArray.set(uint8Array.subarray(0, insertPosition), 0);
        newArray.set(pHYs, insertPosition);
        newArray.set(crcBytes, insertPosition + pHYs.length);
        newArray.set(uint8Array.subarray(insertPosition), insertPosition + pHYs.length + crcBytes.length);
        
        return new Blob([newArray], { type: 'image/png' });
    }
};
