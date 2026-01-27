// Сервис для работы с данными (файлы, конфиги, товары)
window.DataService = {
    // Загрузить список файлов галереи
    loadFiles: async () => {
        try {
            const res = await fetch('/api.php?action=list&t=' + Date.now());
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
            const res = await fetch('/api.php?action=load_config&t=' + Date.now());
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
            // Log what we're saving (include only first 2 items to avoid spam)
            const previewProducts = products.slice(0, 2).map(p => ({
                id: p.id,
                name: p.name,
                mask: p.mask ? '✓' : '-',
                overlay: p.overlay ? '✓' : '-',
                mockupMask: p.mockupMask ? '✓' : '-',
                mockupOverlay: p.mockupOverlay ? '✓' : '-'
            }));
            console.log('💾 Saving product config:', { count: products.length, preview: previewProducts });
            
            const res = await fetch('/api.php?action=save_config', {
                method: 'POST',
                body: JSON.stringify({ password, products })
            });
            
            if (res.ok) {
                console.log('✅ Config saved successfully');
            } else {
                console.error('❌ Config save failed:', res.status, res.statusText);
            }
        } catch (e) {
            console.error("❌ Ошибка сохранения конфига:", e);
        }
    },

    // Загрузить конфигурацию принтов
    loadPrintsConfig: async (printName = null) => {
        try {
            let url = '/api.php?action=load_prints_config&t=' + Date.now();
            if (printName) {
                url += '&print_name=' + encodeURIComponent(printName);
            }
            const res = await fetch(url);
            const data = await res.json();
            
            if (printName) {
                // Return specific config
                return data.config;
            }
            
            console.log('✓ loadPrintsConfig успешно загружена:', data.config);
            return data.config || {};
        } catch (e) {
            console.error("Ошибка загрузки конфига принтов:", e);
            return printName ? null : {};
        }
    },

    // Сохранить конфигурацию одного принта
    savePrintConfig: async (password, printName, printData) => {
        try {
            console.log('📤 Сохраняю конфиг принта:', { printName, printData });
            const res = await fetch('/api.php?action=save_prints_config', {
                method: 'POST',
                body: JSON.stringify({ 
                    password, 
                    print_name: printName,
                    print_data: printData 
                })
            });
            const isOk = res.ok;
            console.log('Ответ сервера на сохранение:', isOk);
            return isOk;
        } catch (e) {
            console.error("Ошибка сохранения конфига принта:", e);
            return false;
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
    uploadToCloud: async (password, blob, fileName, article, category, printName) => {
        try {
            const formData = new FormData();
            formData.append('password', password);
            formData.append('type', 'cloud');
            formData.append('article', article);
            formData.append('category', category);
            if (printName) {
                formData.append('print_name', printName);
            }
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
        // Если есть сохраненный конфиг, используем его как единственный источник истины
        if (savedConfig && Array.isArray(savedConfig) && savedConfig.length > 0) {
            return savedConfig;
        }

        // Если конфига нет (первый запуск), берем дефолтные данные из констант
        if (window.PRODUCTS_DATA) {
             return window.PRODUCTS_DATA.map(d => ({ 
                 ...d, 
                 enabled: true, 
                 tab: 'mockups',
                 // Генерируем уникальные ID, чтобы отвязаться от констант
                 // или оставляем как есть, но теперь они просто будут частью конфига
                 id: d.id || 'prod_' + Math.random().toString(36).substr(2, 9)
             }));
        }

        return [];
    },

    // Инициализация: загрузить файлы и товары
    initialize: async () => {
        try {
            const [files, config, printsConfig] = await Promise.all([
                window.DataService.loadFiles(),
                window.DataService.loadConfig(),
                window.DataService.loadPrintsConfig()
            ]);
            
            const products = window.DataService.mergeProducts(config);
            return { files, products, printsConfig };
        } catch (e) {
            console.error("Ошибка инициализации данных:", e);
            return { files: [], products: [], printsConfig: {} };
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
