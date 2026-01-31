// excel/js/excelEditor.js
// Дополнительные функции для редактора

class ExcelEditor {
    constructor() {
        this.initKeyboardShortcuts();
    }

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S для сохранения
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (excelManager && !document.getElementById('saveBtn').disabled) {
                    excelManager.saveExcel();
                }
            }

            // Ctrl/Cmd + N для добавления строки
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                if (excelManager && excelManager.columns.length > 0) {
                    excelManager.addRow();
                }
            }
        });
    }

    // Валидация данных
    validateCell(value, type) {
        switch(type) {
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'phone':
                return /^[\d\s\-\+\(\)]+$/.test(value);
            case 'number':
                return !isNaN(value);
            default:
                return true;
        }
    }

    // Экспорт в CSV
    exportToCSV(rows, columns) {
        const headers = columns.map(col => col.name).join(',');
        const data = rows.map(row => {
            return columns.map(col => {
                const value = row[col.id] || '';
                // Экранируем кавычки и запятые
                return `"${value.toString().replace(/"/g, '""')}"`;
            }).join(',');
        }).join('\n');

        return headers + '\n' + data;
    }

    // Импорт из CSV
    parseCSV(csvText, columns) {
        const lines = csvText.split('\n');
        const rows = [];

        // Пропускаем заголовок (первую строку)
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = this.parseCSVLine(lines[i]);
            const row = {};

            columns.forEach((col, index) => {
                row[col.id] = values[index] || '';
            });

            rows.push(row);
        }

        return rows;
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        values.push(current);
        return values;
    }

    // Автозаполнение
    autoFill(columnId, pattern) {
        if (!excelManager) return;

        const rows = excelManager.rows;
        if (rows.length < 2) return;

        // Простое автозаполнение по паттерну первых двух значений
        const val1 = rows[0][columnId];
        const val2 = rows[1][columnId];

        if (!val1 || !val2) return;

        const num1 = parseFloat(val1);
        const num2 = parseFloat(val2);

        if (!isNaN(num1) && !isNaN(num2)) {
            const diff = num2 - num1;
            
            for (let i = 2; i < rows.length; i++) {
                rows[i][columnId] = (num1 + diff * i).toString();
            }

            excelManager.renderRows();
            excelManager.markAsModified();
        }
    }

    // Поиск и замена
    findAndReplace(findText, replaceText, columnId = null) {
        if (!excelManager) return 0;

        let count = 0;
        excelManager.rows.forEach(row => {
            if (columnId !== null) {
                // Замена в конкретном столбце
                if (row[columnId] && row[columnId].includes(findText)) {
                    row[columnId] = row[columnId].replace(new RegExp(findText, 'g'), replaceText);
                    count++;
                }
            } else {
                // Замена во всех столбцах
                excelManager.columns.forEach(col => {
                    if (row[col.id] && row[col.id].includes(findText)) {
                        row[col.id] = row[col.id].replace(new RegExp(findText, 'g'), replaceText);
                        count++;
                    }
                });
            }
        });

        if (count > 0) {
            excelManager.renderRows();
            excelManager.markAsModified();
        }

        return count;
    }

    // Фильтрация строк
    filterRows(columnId, filterValue) {
        if (!excelManager) return;

        const container = document.getElementById('dataRows');
        const rows = container.querySelectorAll('.data-row');

        rows.forEach((rowEl, index) => {
            const row = excelManager.rows[index];
            const cellValue = row[columnId] || '';
            
            if (filterValue === '' || cellValue.toLowerCase().includes(filterValue.toLowerCase())) {
                rowEl.style.display = '';
            } else {
                rowEl.style.display = 'none';
            }
        });
    }

    // Сортировка строк
    sortRows(columnId, ascending = true) {
        if (!excelManager) return;

        excelManager.rows.sort((a, b) => {
            const valA = a[columnId] || '';
            const valB = b[columnId] || '';

            // Пытаемся сравнить как числа
            const numA = parseFloat(valA);
            const numB = parseFloat(valB);

            if (!isNaN(numA) && !isNaN(numB)) {
                return ascending ? numA - numB : numB - numA;
            }

            // Иначе сравниваем как строки
            return ascending 
                ? valA.localeCompare(valB, 'ru')
                : valB.localeCompare(valA, 'ru');
        });

        excelManager.renderRows();
        excelManager.markAsModified();
    }

    // Дублирование строки
    duplicateRow(index) {
        if (!excelManager) return;

        const originalRow = excelManager.rows[index];
        const newRow = { ...originalRow };
        
        excelManager.rows.splice(index + 1, 0, newRow);
        excelManager.renderRows();
        excelManager.markAsModified();
    }

    // Очистка строки
    clearRow(index) {
        if (!excelManager) return;

        const row = excelManager.rows[index];
        excelManager.columns.forEach(col => {
            row[col.id] = '';
        });

        excelManager.renderRows();
        excelManager.markAsModified();
    }

    // Статистика по столбцу
    getColumnStats(columnId) {
        if (!excelManager) return null;

        const values = excelManager.rows
            .map(row => row[columnId])
            .filter(val => val && val.trim() !== '');

        const numbers = values
            .map(val => parseFloat(val))
            .filter(num => !isNaN(num));

        return {
            total: values.length,
            filled: values.length,
            empty: excelManager.rows.length - values.length,
            unique: new Set(values).size,
            numbers: {
                count: numbers.length,
                sum: numbers.reduce((a, b) => a + b, 0),
                avg: numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0,
                min: numbers.length > 0 ? Math.min(...numbers) : null,
                max: numbers.length > 0 ? Math.max(...numbers) : null
            }
        };
    }
}

// Инициализация редактора
let excelEditor;
document.addEventListener('DOMContentLoaded', () => {
    excelEditor = new ExcelEditor();
});
