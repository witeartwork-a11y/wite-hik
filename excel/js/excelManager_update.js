    async loadSavedFile(fileId) {
        try {
            this.showLoading('Загрузка файла...');
            
            // В реальном приложении здесь должен быть запрос на получение инфо о файле
            // Сейчас мы имитируем загрузку, так как у нас нет полного бэкенда для чтения
            
            this.currentFile = fileId;
            const fileOption = document.querySelector(`#savedFilesSelector option[value="${fileId}"]`);
            
            const fileData = {
                fileName: fileOption ? fileOption.textContent : 'Unknown.xlsx',
                sheets: ['Sheet1'], // Заглушка, так как мы не можем читать структуру без zip
                uploadDate: new Date().toLocaleString()
            };

            this.updateFileInfo(fileData);
            this.populateSheetSelector(fileData.sheets);
            
            // Показываем детали файла
            document.getElementById('filePlaceholder').classList.add('hidden');
            document.getElementById('fileDetails').classList.remove('hidden');
            
            this.showSuccess('Файл выбран');
            
            // Автоматически применяем стандартные колонки
            this.applyDefaultColumns();
            
        } catch (error) {
            console.error('File load error:', error);
            this.showError('Ошибка при загрузке файла');
        } finally {
            this.hideLoading();
        }
    }

    applyDefaultColumns() {
        this.columns = [...this.defaultColumns];
        this.renderColumns();
        this.updateEditor();
    }
