/**
 * Пример использования системы коротких ссылок
 * 
 * 1. При загрузке товара автоматически создаётся короткая ссылка
 * 2. Короткие ссылки используются для маркетплейсов (ВБ, Озон)
 * 3. Мокапы остаются защищёнными от индексирования
 */

// ============================================
// ПРИМЕР 1: Загрузка товара с получением короткой ссылки
// ============================================

async function uploadProductImage(file, articleId) {
  const formData = new FormData();
  formData.append('password', 'YOUR_PASSWORD');
  formData.append('type', 'cloud');
  formData.append('article', articleId);
  formData.append('category', 'products');  // ← КЛЮЧЕВОЙ параметр!
  formData.append('product_name', 'Товар ' + articleId);
  formData.append('files', file);

  try {
    const response = await fetch('/api.php?action=upload', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success && data.files.length > 0) {
      const file = data.files[0];
      
      console.log('✅ Товар загружен:');
      console.log('Полная ссылка:', file.url);
      console.log('Короткая ссылка:', file.short_url);
      
      // ИСПОЛЬЗУЙТЕ КОРОТКУЮ ССЫЛКУ:
      // https://wite-hik.ru + file.short_url = https://wite-hik.ru/img/ABC12345
      
      return {
        shortUrl: file.short_url,
        fullUrl: file.url,
        name: file.name
      };
    }
  } catch (error) {
    console.error('Ошибка загрузки:', error);
  }
}

// ============================================
// ПРИМЕР 2: Загрузка мокапа (БЕЗ короткой ссылки)
// ============================================

async function uploadMockupImage(file, articleId) {
  const formData = new FormData();
  formData.append('password', 'YOUR_PASSWORD');
  formData.append('type', 'cloud');
  formData.append('article', articleId);
  formData.append('category', 'mockups');  // ← Мокап, NOT продукт!
  formData.append('files', file);

  try {
    const response = await fetch('/api.php?action=upload', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success && data.files.length > 0) {
      const file = data.files[0];
      
      console.log('✅ Мокап загружен:');
      console.log('Полная ссылка:', file.url);
      console.log('Короткая ссылка:', file.short_url);  // undefined для мокапов
      console.log('Мокап скрыт от поиска ✓');
      
      // Мокапы хранят только в локальном использовании
      // НЕ выкладывают в интернет!
      
      return {
        fullUrl: file.url,
        name: file.name,
        isProtected: true
      };
    }
  } catch (error) {
    console.error('Ошибка загрузки:', error);
  }
}

// ============================================
// ПРИМЕР 3: Получение списка файлов
// ============================================

async function loadAllFiles() {
  try {
    const response = await fetch('/api.php?action=list');
    const data = await response.json();
    
    if (data.success) {
      const files = data.files;
      
      files.forEach(file => {
        console.log('---');
        console.log('Файл:', file.name);
        console.log('Артикул:', file.article);
        console.log('Категория:', file.category);
        
        if (file.category === 'products') {
          console.log('Для маркетплейса:', file.short_url);
          // Используй file.short_url на ВБ/Озон
        } else if (file.category === 'mockups') {
          console.log('Мокап (локально):', file.url);
          console.log('Статус: Скрыт от поиска ✓');
        }
      });
    }
  } catch (error) {
    console.error('Ошибка загрузки списка:', error);
  }
}

// ============================================
// ПРИМЕР 4: Использование в маркетплейсе
// ============================================

/*
ИНСТРУКЦИЯ ДЛЯ ВБ/ОЗОН:

1. Загрузи товар через функцию uploadProductImage()
2. Получи file.short_url (например: /img/ABC12345)
3. Полная ссылка: https://wite-hik.ru/img/ABC12345
4. Вставь эту ссылку в описание товара на маркетплейсе

ПРЕИМУЩЕСТВА:
✓ Короткая и запоминаемая
✓ Легко скопировать в ВБ/Озон
✓ Можно отследить кликов на товар
✓ Если домен когда-то изменится, просто обновить редирект
✓ Маркетплейс будет скачивать товар, а не мокап
*/

// ============================================
// ПРИМЕР 5: Полный рабочий пример с UI
// ============================================

class ProductImageManager {
  constructor() {
    this.password = 'YOUR_PASSWORD';
  }

  async uploadProduct(file, articleId) {
    try {
      // Показываем процесс загрузки
      console.log('Загружаю товар...');
      
      const formData = new FormData();
      formData.append('password', this.password);
      formData.append('type', 'cloud');
      formData.append('article', articleId);
      formData.append('category', 'products');
      formData.append('product_name', `Товар ${articleId}`);
      formData.append('files', file);

      const response = await fetch('/api.php?action=upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        const uploadedFile = data.files[0];
        
        return {
          success: true,
          shortUrl: uploadedFile.short_url,  // /img/ABC12345
          fullUrl: uploadedFile.url,         // /uploads/cloud/...
          publicLink: `https://wite-hik.ru${uploadedFile.short_url}`,
          message: '✅ Товар готов! Скопируй короткую ссылку для маркетплейса'
        };
      } else {
        return {
          success: false,
          message: '❌ Ошибка: ' + (data.message || 'Неизвестная ошибка')
        };
      }
    } catch (error) {
      return {
        success: false,
        message: '❌ Ошибка при загрузке: ' + error.message
      };
    }
  }

  async uploadMockup(file, articleId) {
    try {
      console.log('Загружаю мокап...');
      
      const formData = new FormData();
      formData.append('password', this.password);
      formData.append('type', 'cloud');
      formData.append('article', articleId);
      formData.append('category', 'mockups');  // Мокап!
      formData.append('files', file);

      const response = await fetch('/api.php?action=upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          message: '✅ Мокап загружен. Он защищен от поиска и копирования ✓'
        };
      } else {
        return {
          success: false,
          message: '❌ Ошибка: ' + (data.message || 'Неизвестная ошибка')
        };
      }
    } catch (error) {
      return {
        success: false,
        message: '❌ Ошибка при загрузке: ' + error.message
      };
    }
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('✓ Скопировано в буфер обмена');
    });
  }
}

// ============================================
// ИСПОЛЬЗОВАНИЕ:
// ============================================

/*
// Инициализация
const manager = new ProductImageManager();

// Загрузить товар
const productFile = document.getElementById('product-input').files[0];
const result = await manager.uploadProduct(productFile, '2901261');

if (result.success) {
  console.log('Ссылка для маркетплейса:', result.publicLink);
  // Результат: https://wite-hik.ru/img/ABC12345
  
  // Скопировать в буфер обмена
  manager.copyToClipboard(result.publicLink);
}

// Загрузить мокап
const mockupFile = document.getElementById('mockup-input').files[0];
await manager.uploadMockup(mockupFile, '2901261');
*/

// ============================================
// ВАЖНО!
// ============================================
/*
✅ ИСПОЛЬЗУЙ ДЛЯ ТОВАРОВ:
   - category: 'products'
   - Получишь: /img/ABC12345
   - Видны в поиске
   - Используй на ВБ/Озон

❌ НЕ ИСПОЛЬЗУЙ ДЛЯ МОКАПОВ:
   - category: 'mockups'
   - НЕ получишь короткую ссылку
   - Скрыты от поиска
   - Только для локального использования
   - НИКОГДА не выкладывай в интернет
*/
