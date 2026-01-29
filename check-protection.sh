#!/bin/bash
# Скрипт для проверки что система коротких ссылок и защиты работает

echo "🔍 Проверка системы коротких ссылок и защиты мокапов"
echo "================================================"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="${1:-http://localhost}"
ERRORS=0

# Функция для проверки
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
    else
        echo -e "${RED}✗${NC} $description - файл не найден: $file"
        ERRORS=$((ERRORS + 1))
    fi
}

# Функция для проверки содержимого
check_content() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description"
    else
        echo -e "${RED}✗${NC} $description - не найдено в $file"
        ERRORS=$((ERRORS + 1))
    fi
}

echo ""
echo "📁 Проверка файлов..."
check_file ".htaccess" ".htaccess создан"
check_file "robots.txt" "robots.txt создан"
check_file "SHORT_URLS_GUIDE.md" "Документация SHORT_URLS_GUIDE.md"
check_file "PROTECTION_LEVELS.md" "Документация PROTECTION_LEVELS.md"
check_file "api.php" "api.php существует"

echo ""
echo "🔐 Проверка содержимого robots.txt..."
check_content "robots.txt" "Disallow: /uploads/cloud/\*/mockups/" "Запрет на мокапы в robots.txt"
check_content "robots.txt" "Allow: /uploads/cloud/\*/products/" "Разрешение на товары в robots.txt"

echo ""
echo "🔐 Проверка содержимого .htaccess..."
check_content ".htaccess" "X-Robots-Tag" "X-Robots-Tag headers настроены"
check_content ".htaccess" "RewriteRule.*img" "Редирект коротких ссылок настроен"

echo ""
echo "🔐 Проверка содержимого api.php..."
check_content "api.php" "SHORT_URLS_FILE" "Путь к short_urls.json добавлен"
check_content "api.php" "generateShortId" "Функция generateShortId добавлена"
check_content "api.php" "loadShortUrls" "Функция loadShortUrls добавлена"
check_content "api.php" "createShortUrl" "Функция createShortUrl добавлена"
check_content "api.php" "REQUEST_URI" "Обработчик коротких ссылок добавлен"
check_content "api.php" "category === 'products'" "Логика для товаров добавлена"

echo ""
echo "================================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Все проверки пройдены успешно!${NC}"
    echo ""
    echo "📋 Что было добавлено:"
    echo "1. robots.txt - запрещает индексирование мокапов"
    echo "2. .htaccess - добавляет защитные заголовки и редиректы"
    echo "3. api.php - система коротких ссылок для товаров"
    echo "4. data/short_urls.json - база коротких ссылок (создаётся при загрузке)"
    echo ""
    echo "🚀 Как пользоваться:"
    echo "1. Загружайте товары в категорию 'products'"
    echo "2. При загрузке получите короткую ссылку: /img/ABC12345"
    echo "3. Используйте эту ссылку на ВБ/Озон вместо полного пути"
    echo "4. Мокапы автоматически скрыты от индексирования"
    echo ""
    echo "ℹ️  Документация:"
    echo "- SHORT_URLS_GUIDE.md - подробное описание системы"
    echo "- PROTECTION_LEVELS.md - уровни защиты и опциональные параметры"
else
    echo -e "${RED}✗ Найдены ошибки: $ERRORS${NC}"
    exit 1
fi
