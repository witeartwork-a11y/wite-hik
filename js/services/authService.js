// Сервис аутентификации
window.AuthService = {
    // Попытка входа с паролем
    login: async (password) => {
        if (!password) return false;
        try {
            const res = await fetch('/api.php?action=login', {
                method: 'POST',
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            return !!data.success;
        } catch (e) {
            console.error("Ошибка входа:", e);
            return false;
        }
    },

    // Получить сохраненный пароль из localStorage
    getSavedPassword: () => {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem('witehik_password');
    },

    // Сохранить пароль в localStorage
    savePassword: (password) => {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem('witehik_password', password);
    },

    // Удалить сохраненный пароль
    clearPassword: () => {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem('witehik_password');
    },

    // Восстановить сессию (автовход)
    restoreSession: async () => {
        const cached = window.AuthService.getSavedPassword();
        if (!cached) return null;
        
        const ok = await window.AuthService.login(cached);
        if (ok) {
            return cached;
        } else {
            window.AuthService.clearPassword();
            return null;
        }
    }
};
