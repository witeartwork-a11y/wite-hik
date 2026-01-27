// js/hooks/usePresets.js
window.usePresets = () => {
    const { useState, useCallback } = React;

    // Инициализация пресетов из localStorage
    const [presets, setPresets] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('user_transform_presets') || '{}');
        } catch (e) {
            return {};
        }
    });

    /**
     * Сохранить пресет
     * @param {String} name - имя пресета
     * @param {Object} dataToSave - данные для сохранения
     */
    const savePreset = useCallback((name, dataToSave) => {
        const newPresets = { ...presets, [name]: dataToSave };
        setPresets(newPresets);
        localStorage.setItem('user_transform_presets', JSON.stringify(newPresets));
    }, [presets]);

    /**
     * Удалить пресет
     * @param {String} name - имя пресета
     */
    const deletePreset = useCallback((name) => {
        const newPresets = { ...presets };
        delete newPresets[name];
        setPresets(newPresets);
        localStorage.setItem('user_transform_presets', JSON.stringify(newPresets));
    }, [presets]);

    /**
     * Получить пресет
     * @param {String} name - имя пресета
     * @returns {Object} данные пресета
     */
    const getPreset = useCallback((name) => {
        return presets[name] || null;
    }, [presets]);

    /**
     * Проверить, является ли объект одиночным пресетом (а не картой товаров)
     * @param {Object} preset - объект для проверки
     * @returns {Boolean}
     */
    const isSingleTransformPreset = (preset) => {
        return preset && (preset.x !== undefined || preset.scale !== undefined);
    };

    return {
        presets,
        savePreset,
        deletePreset,
        getPreset,
        isSingleTransformPreset
    };
};
