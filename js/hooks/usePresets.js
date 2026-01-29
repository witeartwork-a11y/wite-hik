// js/hooks/usePresets.js
window.usePresets = () => {
    const { useState, useCallback, useEffect } = React;

    const [presets, setPresets] = useState({});

    // Загрузка пресетов с сервера
    useEffect(() => {
        const loadPresets = async () => {
            try {
                // Пытаемся загрузить с сервера
                const res = await fetch('api.php?action=load_presets');
                const data = await res.json();
                if (data.success && data.presets) {
                    setPresets(data.presets);
                }
            } catch (e) {
                console.error("Failed to load presets from server", e);
            }
        };
        loadPresets();
    }, []);

    /**
     * Сохранить пресет
     * @param {String} name - имя пресета
     * @param {Object} dataToSave - данные для сохранения
     */
    const savePreset = useCallback(async (name, dataToSave) => {
        // 1. Оптимистичное обновление стейта
        const newPresets = { ...presets, [name]: dataToSave };
        setPresets(newPresets);

        // 2. Отправка на сервер
        const password = window.AuthService?.getSavedPassword();
        if (!password) {
            console.warn("No password found, cannot save preset to server");
            return;
        }

        try {
            const res = await fetch('api.php?action=save_presets', {
                method: 'POST',
                body: JSON.stringify({
                    password,
                    name,
                    data: dataToSave
                })
            });
            const result = await res.json();
            if (!result.success) {
                console.error("Server save failed:", result.error);
                alert("Ошибка сохранения на сервере: " + (result.error || 'Unknown error'));
            }
        } catch (e) {
            console.error("Network error saving preset", e);
            alert("Ошибка сети при сохранении конфига");
        }
    }, [presets]);

    /**
     * Удалить пресет
     * @param {String} name - имя пресета
     */
    const deletePreset = useCallback(async (name) => {
        // 1. Оптимистичное обновление
        const newPresets = { ...presets };
        delete newPresets[name];
        setPresets(newPresets);

        // 2. Удаление на сервере
        const password = window.AuthService?.getSavedPassword();
        if (!password) return;

        try {
             await fetch('api.php?action=delete_preset', {
                method: 'POST',
                body: JSON.stringify({
                    password,
                    name
                })
            });
        } catch (e) {
            console.error("Network error deleting preset", e);
        }
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
