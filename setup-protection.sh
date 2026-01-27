#!/bin/bash
# === Скрипт защиты локальных данных от git ===
# Использование: bash setup-protection.sh

echo "🔒 Wite-Hik - Защита локальных данных"
echo "======================================"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверяем, находимся ли в git репозитории
if [ ! -d .git ]; then
    echo -e "${RED}❌ Это не git репозиторий!${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Шаг 1: Удаление отслеживания защищённых файлов${NC}"
echo ""

# Массив файлов для удаления из отслеживания
declare -a files=(
    "data/products_config.json"
    "data/files.json"
)

for file in "${files[@]}"; do
    if git ls-files --error-unmatch "$file" 2>/dev/null; then
        echo "Удаляю из отслеживания: $file"
        git rm --cached "$file" 2>/dev/null
    fi
done

# Массив папок для удаления из отслеживания
declare -a folders=(
    "uploads"
    "data/thumbnails"
)

for folder in "${folders[@]}"; do
    if git ls-files --error-unmatch "$folder" 2>/dev/null; then
        echo "Удаляю из отслеживания: $folder/"
        git rm --cached -r "$folder" 2>/dev/null
    fi
done

echo ""
echo -e "${YELLOW}📋 Шаг 2: Проверка .gitignore${NC}"
if [ -f .gitignore ]; then
    echo -e "${GREEN}✅ .gitignore уже существует${NC}"
else
    echo -e "${RED}❌ .gitignore не найден!${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Шаг 3: Создание .env.local (если нужно)${NC}"
if [ ! -f .env.local ] && [ -f .env.example ]; then
    echo "Создаю .env.local из .env.example..."
    cp .env.example .env.local
    echo -e "${GREEN}✅ .env.local создан${NC}"
    echo -e "${YELLOW}⚠️  Пожалуйста, отредактируйте .env.local с вашими настройками!${NC}"
elif [ -f .env.local ]; then
    echo -e "${GREEN}✅ .env.local уже существует${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Шаг 4: Статус git${NC}"
git status

echo ""
echo -e "${YELLOW}📋 Шаг 5: Завершение${NC}"
echo ""
echo -e "${GREEN}✅ Защита данных настроена!${NC}"
echo ""
echo "Следующие шаги:"
echo "1. Проверьте git status:"
echo "   git status"
echo ""
echo "2. Закоммитьте изменения:"
echo "   git add .gitignore .env.example PROTECTION.md"
echo "   git commit -m 'Add data protection and git ignore rules'"
echo ""
echo "3. Отредактируйте .env.local (если создан)"
echo ""
echo "Теперь ваши данные защищены при git pull! 🔒"
