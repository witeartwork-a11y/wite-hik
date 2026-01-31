// excel/js/app.js
// Дополнительная инициализация и утилиты

// Авторизация
document.addEventListener('DOMContentLoaded', async () => {
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('passwordInput');
    const submitBtn = document.getElementById('submitBtn');
    const loginError = document.getElementById('loginError');

    // Функция скрытия модального окна
    const hideModal = () => {
        loginModal.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => loginModal.classList.add('hidden'), 300);
    };

    // Проверка сохраненной сессии
    if (window.AuthService) {
        const password = await window.AuthService.restoreSession();
        if (password) {
            hideModal();
        }
    }

    // Обработка входа
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // UI state loading
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Вход...';
            submitBtn.disabled = true;
            loginError.classList.add('hidden');
            
            const password = passwordInput.value;
            
            if (window.AuthService) {
                const success = await window.AuthService.login(password);
                
                if (success) {
                    window.AuthService.savePassword(password);
                    hideModal();
                } else {
                    loginError.classList.remove('hidden');
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            }
            
            // Restore button
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });
    }
});

// Предотвращение случайного закрытия при несохраненных изменениях
window.addEventListener('beforeunload', (e) => {
    if (excelManager && excelManager.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
});

// Обработка drag and drop для загрузки файлов
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('emptyState');
    
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('bg-blue-500/5');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('bg-blue-500/5');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0 && excelManager) {
                excelManager.handleFileUpload(files[0]);
            }
        }, false);
    }
});

// Утилиты для работы с Excel
const ExcelUtils = {
    // Конвертация номера столбца в букву (1 -> A, 27 -> AA)
    columnNumberToLetter(num) {
        let letter = '';
        while (num > 0) {
            const remainder = (num - 1) % 26;
            letter = String.fromCharCode(65 + remainder) + letter;
            num = Math.floor((num - 1) / 26);
        }
        return letter;
    },

    // Конвертация буквы столбца в номер (A -> 1, AA -> 27)
    columnLetterToNumber(letter) {
        let num = 0;
        for (let i = 0; i < letter.length; i++) {
            num = num * 26 + (letter.charCodeAt(i) - 64);
        }
        return num;
    },

    // Валидация адреса ячейки (A1, B2, etc.)
    isValidCellAddress(address) {
        return /^[A-Z]+[0-9]+$/.test(address);
    },

    // Разбор адреса ячейки на столбец и строку
    parseCellAddress(address) {
        const match = address.match(/^([A-Z]+)([0-9]+)$/);
        if (!match) return null;
        
        return {
            column: match[1],
            row: parseInt(match[2])
        };
    },

    // Форматирование даты для Excel
    formatDateForExcel(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}.${month}.${year}`;
    },

    // Форматирование числа
    formatNumber(num, decimals = 2) {
        return parseFloat(num).toFixed(decimals);
    },

    // Очистка строки от лишних пробелов
    cleanString(str) {
        return str.trim().replace(/\s+/g, ' ');
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExcelUtils };
}
