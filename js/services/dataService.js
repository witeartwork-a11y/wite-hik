// Сервис для работы с данными (файлы, конфиги, товары)
window.DataService = {
    // Загрузить список файлов галереи
    loadFiles: async () => {
        try {
            const res = await fetch('/api.php?action=list');
            const data = await res.json();
            return data.files || [];
        } catch (e) {
            console.error("Ошибка загрузки файлов:", e);
            return [];
        }
    },

    // Загрузить сохраненную конфигурацию товаров
    loadConfig: async () => {
        try {
            const res = await fetch('/api.php?action=load_config');
            const data = await res.json();
            return data.config || [];
        } catch (e) {
            console.error("Ошибка загрузки конфига:", e);
            return [];
        }
    },

    // Сохранить конфигурацию товаров на сервер
    saveConfig: async (password, products) => {
        try {
            await fetch('/api.php?action=save_config', {
                method: 'POST',
                body: JSON.stringify({ password, products })
            });
        } catch (e) {
            console.error("Ошибка сохранения конфига:", e);
        }
    },

    // Загрузить файлы (картинки, маски)
    uploadFiles: async (password, fileList) => {
        if (!fileList || fileList.length === 0) return null;
        try {
            const formData = new FormData();
            formData.append('password', password);
            formData.append('type', 'upload');
            for (let i = 0; i < fileList.length; i++) {
                formData.append('files[]', fileList[i]);
            }
            const response = await fetch('/api.php?action=upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            return data.success ? data.files : null;
        } catch (e) {
            console.error("Ошибка загрузки файлов:", e);
            return null;
        }
    },

    // Загрузить файл в облако
    uploadToCloud: async (password, blob, fileName, article, category) => {
        try {
            const formData = new FormData();
            formData.append('password', password);
            formData.append('type', 'cloud');
            formData.append('article', article);
            formData.append('category', category);
            formData.append('files[]', new File([blob], fileName, { type: 'image/png' }));
            
            const res = await fetch('/api.php?action=upload', {
                method: 'POST',
                body: formData
            });
            return res.ok;
        } catch (e) {
            console.error("Ошибка загрузки в облако:", e);
            return false;
        }
    },

    // Объединить товары из констант с сохраненной конфигурацией
    mergeProducts: (savedConfig) => {
        if (!window.PRODUCTS_DATA) {
            console.error("PRODUCTS_DATA не найдены! Проверьте constants.js");
            return savedConfig;
        }

        const mergedProducts = window.PRODUCTS_DATA.map(def => {
            const saved = savedConfig.find(s => s.id === def.id);
            return {
                ...def,
                enabled: saved ? saved.enabled : true,
                image: saved ? saved.image : '',
                mask: saved ? saved.mask : '',
                overlay: saved ? saved.overlay : '',
                defaultPrefix: saved ? saved.defaultPrefix : def.defaultPrefix
            };
        });

        // Добавляем кастомные товары, которые пользователь создал
        const customProducts = savedConfig.filter(s => s.id.startsWith('custom_'));
        return [...mergedProducts, ...customProducts];
    },

    // Инициализация: загрузить файлы и товары
    initialize: async () => {
        try {
            const [files, config] = await Promise.all([
                window.DataService.loadFiles(),
                window.DataService.loadConfig()
            ]);
            
            const products = window.DataService.mergeProducts(config);
            return { files, products };
        } catch (e) {
            console.error("Ошибка инициализации данных:", e);
            return { files: [], products: [] };
        }
    },

    deleteCloudFile: async (password, { filename, article, category }) => {
        try {
            const res = await fetch('/api.php?action=delete', {
                method: 'POST',
                body: JSON.stringify({ password, filename, article, category })
            });
            const data = await res.json();
            return data.success;
        } catch (e) {
            console.error('Ошибка удаления файла из облака:', e);
            return false;
        }
    },

    deleteCloudCategory: async (password, { article, category }) => {
        try {
            const res = await fetch('/api.php?action=delete_category', {
                method: 'POST',
                body: JSON.stringify({ password, article, category })
            });
            const data = await res.json();
            return data.success;
        } catch (e) {
            console.error('Ошибка удаления категории облака:', e);
            return false;
        }
    },

    deleteCloudArticle: async (password, { article }) => {
        try {
            const res = await fetch('/api.php?action=delete_article', {
                method: 'POST',
                body: JSON.stringify({ password, article })
            });
            const data = await res.json();
            return data.success;
        } catch (e) {
            console.error('Ошибка удаления артикула из облака:', e);
            return false;
        }
    }
};
