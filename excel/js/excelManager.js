// excel/js/excelManager.js
// Менеджер для работы с Excel файлами

class ExcelManager {
    constructor() {
        this.currentFile = null;
        this.uiSelectedFile = null;
        this.currentSheet = null;
        this.columns = [];
        this.rows = [];
        this.hasUnsavedChanges = false;
        this.selectedFilesForDeletion = new Set(); // For mass delete
        
        // Преднастроенные колонки по умолчанию
        this.defaultColumns = [
            { id: 1, name: 'Артикул WB', cell: 'B', startRow: 5, type: 'text' },
            { id: 2, name: 'Наименование', cell: 'D', startRow: 5, type: 'text' },
            { id: 3, name: 'Ссылки на фото', cell: 'H', startRow: 5, type: 'url' }
        ];
        
        this.initEventListeners();
        this.loadSavedFiles();
    }

    async loadSavedFiles() {
        try {
            const response = await fetch('../backend/excel_handler.php?action=list');
            const data = await response.json();
            
            if (data.success) {
                this.availableFiles = data.files;
                
                // Templates
                const templates = data.files.filter(f => !f.is_export || f.is_export === 'false');
                this.renderFileList(templates, 'templatesList', 'template');
                
                // Exports
                const exports = data.files.filter(f => f.is_export === true || f.is_export === 'true');
                this.renderFileList(exports, 'exportsList', 'export');
            }
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }
    
    renderFileList(files, containerId, type) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (files.length === 0) {
            container.innerHTML = `<div class="text-center py-8 text-slate-500 text-sm">Нет файлов</div>`;
            return;
        }
        
        container.innerHTML = files.map(file => {
            const isSelected = (this.uiSelectedFile || this.currentFile) === file.id;
            const date = new Date(file.uploadDate).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
            
            return `
            <div class="group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-blue-600/20 border-blue-500/30' : 'bg-slate-900/40 hover:bg-slate-800 border-transparent hover:border-white/5'}"
                 onclick="excelManager.selectFile('${file.id}')">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                     ${type === 'export' ? `
                     <div class="flex items-center justify-center p-1 rounded hover:bg-white/10" onclick="event.stopPropagation()">
                        <input type="checkbox" 
                               class="w-4 h-4 rounded border-slate-600 bg-slate-700/50 text-blue-600 focus:ring-offset-slate-900"
                               onchange="excelManager.toggleFileDetails('${file.id}', this.checked)">
                     </div>
                     ` : ''}
                     
                     <div class="min-w-0 flex-1">
                         <div class="text-sm font-medium truncate ${isSelected ? 'text-blue-400' : 'text-slate-200 group-hover:text-white'}">${file.name}</div>
                         <div class="text-xs text-slate-500 flex items-center gap-2">
                            <span>${date}</span>
                            <span>${file.formattedSize || (file.size ? (file.size / 1024).toFixed(1) + ' KB' : '0 KB')}</span>
                         </div>
                     </div>

                     <button onclick="event.stopPropagation(); excelManager.downloadFile('${file.id}')" 
                             class="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100" 
                             title="Скачать">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                     </button>
                </div>
            </div>
            `;
        }).join('');
    }
    
    toggleFileDetails(id, checked) {
        if (checked) {
            this.selectedFilesForDeletion.add(id);
        } else {
            this.selectedFilesForDeletion.delete(id);
        }
        
        const btn = document.getElementById('bulkDeleteBtn');
        if (this.selectedFilesForDeletion.size > 0) {
            btn.textContent = `Удалить (${this.selectedFilesForDeletion.size})`;
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    }
    
    async deleteSelectedFiles() {
        if (this.selectedFilesForDeletion.size === 0) return;
        
        if (!confirm(`Удалить выбранные файлы (${this.selectedFilesForDeletion.size})?`)) return;
        
        try {
            this.showLoading('Удаление файлов...');
            
            const ids = Array.from(this.selectedFilesForDeletion);
            let successCount = 0;
            
            for (const id of ids) {
                const response = await fetch(`../backend/excel_handler.php?action=delete&id=${id}`);
                const data = await response.json();
                if (data.success) {
                    successCount++;
                    this.availableFiles = this.availableFiles.filter(f => f.id !== id);
                }
            }
            
            this.showSuccess(`Удалено файлов: ${successCount}`);
            this.selectedFilesForDeletion.clear();
            document.getElementById('bulkDeleteBtn').classList.add('hidden');
            
            // Re-render
            const exports = this.availableFiles.filter(f => f.is_export === true || f.is_export === 'true');
            this.renderFileList(exports, 'exportsList', 'export');
            
            // If current file was deleted, reset
            if (ids.includes(this.currentFile)) {
                this.resetSelection();
            }
            
        } catch (error) {
            console.error('Bulk delete error:', error);
            this.showError('Ошибка массового удаления');
        } finally {
            this.hideLoading();
        }
    }
    
    selectFile(fileId) {
        this.currentFileTemp = fileId; // Store temporarily until "Load" is clicked
        this.uiSelectedFile = fileId;
        
        const file = this.availableFiles.find(f => f.id === fileId);
        if (!file) return;

        // Visual selection update
        this.renderFileList(
            this.availableFiles.filter(f => !f.is_export || f.is_export === 'false'), 
            'templatesList', 'template'
        );
        this.renderFileList(
            this.availableFiles.filter(f => f.is_export === true || f.is_export === 'true'), 
            'exportsList', 'export'
        );
        
        // Ensure buttons are visible
        document.getElementById('filePlaceholder').classList.remove('hidden');
        document.getElementById('fileDetails').classList.add('hidden');

        document.getElementById('noSelectionMsg').classList.add('hidden');
        const actions = document.getElementById('selectedFileActions');
        actions.classList.remove('hidden');
        document.getElementById('selectedFileName').textContent = file.name;
        
        // Bind actions
        document.getElementById('actionLoadBtn').onclick = () => this.loadSavedFile(fileId);
        document.getElementById('actionDownloadBtn').onclick = () => this.downloadFile(fileId);
        document.getElementById('actionDeleteBtn').onclick = () => {
             if (confirm('Удалить этот файл?')) this.deleteSavedFile(fileId);
        };
    }
    
    resetSelection() {
        document.getElementById('selectedFileActions').classList.add('hidden');
        document.getElementById('noSelectionMsg').classList.remove('hidden');
        this.currentFile = null;
        this.loadSavedFiles();
    }

    initEventListeners() {
        // Табы
        const tabTemplates = document.getElementById('tabTemplates');
        const tabExports = document.getElementById('tabExports');
        const templatesSection = document.getElementById('templatesSection');
        const exportsSection = document.getElementById('exportsSection');

        tabTemplates.addEventListener('click', () => {
            tabTemplates.className = "flex-1 py-2 text-sm text-center border-b-2 border-blue-500 text-white font-medium transition-colors";
            tabExports.className = "flex-1 py-2 text-sm text-center border-b-2 border-transparent text-slate-400 hover:text-slate-300 transition-colors";
            templatesSection.classList.remove('hidden');
            templatesSection.classList.add('flex');
            exportsSection.classList.add('hidden');
            exportsSection.classList.remove('flex');
            this.activeTab = 'templates';
        });

        tabExports.addEventListener('click', () => {
            tabExports.className = "flex-1 py-2 text-sm text-center border-b-2 border-blue-500 text-white font-medium transition-colors";
            tabTemplates.className = "flex-1 py-2 text-sm text-center border-b-2 border-transparent text-slate-400 hover:text-slate-300 transition-colors";
            exportsSection.classList.remove('hidden');
            exportsSection.classList.add('flex');
            templatesSection.classList.add('hidden');
            templatesSection.classList.remove('flex');
            this.activeTab = 'exports';
        });

        // Загрузка файла
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        // Сохранение
        document.getElementById('saveBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.saveExcel();
        });

        // Выбор листа
        document.getElementById('sheetSelector').addEventListener('change', (e) => {
            this.loadSheet(e.target.value);
        });

        // Добавление столбца
        document.getElementById('addColumnBtn').addEventListener('click', () => {
            this.showColumnModal();
        });

        document.getElementById('cancelColumnBtn').addEventListener('click', () => {
            this.hideColumnModal();
        });

        document.getElementById('confirmColumnBtn').addEventListener('click', () => {
            this.addColumn();
        });

        // Добавление строки
        document.getElementById('addRowBtn').addEventListener('click', () => {
            this.addRow();
        });
    }

    async deleteSavedFile(fileId) {
        try {
            this.showLoading('Удаление файла...');
            const response = await fetch(`../backend/excel_handler.php?action=delete&id=${fileId}`);
            const data = await response.json();

            if (data.success) {
                this.showSuccess('Файл удален');
                this.availableFiles = this.availableFiles.filter(f => f.id !== fileId);
                
                // Сброс интерфейса если удален текущий файл
                if (this.currentFile === fileId || this.currentFileTemp === fileId) {
                    this.resetSelection();
                    document.getElementById('fileDetails').classList.add('hidden');
                    document.getElementById('emptyState').classList.remove('hidden');
                    document.getElementById('dataContent').classList.add('hidden');
                }
                
                this.loadSavedFiles(); // Перезагружаем список
            } else {
                this.showError(data.message || 'Ошибка удаления');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showError('Ошибка при удалении файла');
        } finally {
            this.hideLoading();
        }
    }

    downloadFile(fileId) {
        if (!this.availableFiles) return;
        const file = this.availableFiles.find(f => f.id === fileId);
        if (file && file.url) {
            const a = document.createElement('a');
            a.href = file.url;
            a.download = file.name || 'file.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            this.showError('Не удалось найти ссылку на файл');
        }
    }

    async handleFileUpload(file) {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            this.showLoading('Загрузка файла...');
            
            const response = await fetch('../backend/excel_handler.php?action=upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.currentFile = data.file;
                
                // Refresh list to ensure we have the file in availableFiles
                await this.loadSavedFiles();
                
                // Auto-select UI
                this.selectFile(this.currentFile);

                this.updateFileInfo(data);
                this.populateSheetSelector(data.sheets);
                
                document.getElementById('filePlaceholder').classList.remove('hidden');
                document.getElementById('fileDetails').classList.remove('hidden');
                
                this.showSuccess('Файл успешно загружен');
            } else {
                this.showError(data.message || 'Ошибка загрузки файла');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showError('Ошибка при загрузке файла');
        } finally {
            this.hideLoading();
        }
    }

    updateFileInfo(data) {
        const nameEl = document.getElementById('fileName');
        if (nameEl) nameEl.textContent = data.fileName;
        
        const sheetsEl = document.getElementById('sheetsCount');
        if (sheetsEl) sheetsEl.textContent = data.sheets.length;
        
        const dateEl = document.getElementById('uploadDate');
        if (dateEl) dateEl.textContent = new Date().toLocaleString('ru-RU');
        
        // Also update selected file action title if visible
        const selectedNameEl = document.getElementById('selectedFileName');
        if (selectedNameEl) selectedNameEl.textContent = data.fileName;
    }

    populateSheetSelector(sheets) {
        if (!Array.isArray(sheets)) {
            console.error('Sheets is not an array:', sheets);
            sheets = ['Sheet1'];
        }
        
        const selector = document.getElementById('sheetSelector');
        selector.innerHTML = '<option value="">Выберите лист</option>';
        
        sheets.forEach((sheet, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = sheet;
            selector.appendChild(option);
        });

        // Автоматически выбираем первый лист
        if (sheets.length > 0) {
            selector.value = 0;
            this.loadSheet(0);
        }
    }

    async loadSheet(sheetIndex) {
        if (!this.currentFile || sheetIndex === '') return;

        try {
            this.showLoading('Загрузка листа...');
            
            const response = await fetch(`../backend/excel_handler.php?action=getSheet&file=${this.currentFile}&sheet=${sheetIndex}`);
            const data = await response.json();

            if (data.success) {
                if (data.clientSideParsingRequired) {
                    await this.loadSheetClientSide(data.fileUrl, sheetIndex);
                    return;
                }
                
                this.currentSheet = sheetIndex;
                if (data.headers) {
                    this.updateColumnHeaders(data.headers);
                } else {
                    this.columns = [...this.defaultColumns];
                    this.renderColumns();
                }
                this.showSuccess('Лист загружен');
            } else {
                this.showError(data.message || 'Ошибка загрузки листа');
            }
        } catch (error) {
            console.error('Load sheet error:', error);
            this.showError('Ошибка при загрузке листа');
        } finally {
            this.hideLoading();
        }
    }

    async loadSheetClientSide(url, sheetIndex) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            this.originalFileBuffer = await blob.arrayBuffer(); // Save for editing
            
            const workbook = XLSX.read(this.originalFileBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[sheetIndex];
            const sheet = workbook.Sheets[sheetName];
            
            // Читаем заголовки B3, D3, H3
            const getCellValue = (cell) => sheet[cell] ? sheet[cell].v : '';
            
            const headers = {
                'B': getCellValue('B3') || 'Артикул WB',
                'D': getCellValue('D3') || 'Наименование',
                'H': getCellValue('H3') || 'Ссылки на фото'
            };
            
            this.currentSheet = sheetIndex;
            this.updateColumnHeaders(headers);

            // Load existing data
            this.rows = [];
            
            // Determine range
            const range = XLSX.utils.decode_range(sheet['!ref']);
            // Start from row 5 (index 4)
            const startRowIndex = 4;
            const endRowIndex = range.e.r;
            
            // If data exists, load it
            if (endRowIndex >= startRowIndex) {
                for (let r = startRowIndex; r <= endRowIndex; r++) {
                    // Check if row has any data in our columns
                    let hasData = false;
                    const rowData = {};
                    
                    this.columns.forEach(col => {
                         const colAddr = col.cell + (r + 1); // e.g. B5
                         const val = getCellValue(colAddr);
                         rowData[col.id] = val;
                         if (val) hasData = true;
                    });
                    
                    // Always add rows if they are within range, or only if has data?
                    // User wants to see existing goods.
                    if (hasData) {
                        this.rows.push(rowData);
                    }
                }
            }
            
            // If no data found, add one empty row
            if (this.rows.length === 0) {
                 this.addRow();
            } else {
                 this.renderRows();
            }

            this.showSuccess('Лист загружен (клиентский парсинг)');
            
        } catch (e) {
            console.error('Client side parsing error:', e);
            this.showError('Не удалось прочитать файл Excel');
        }
    }

    updateColumnHeaders(headers) {
        this.columns = this.defaultColumns.map(col => {
            const newName = headers[col.cell];
            return newName ? { ...col, name: newName } : col;
        });
        this.renderColumns();
        this.updateEditor();
    }

    async loadSavedFile(fileId) {
        try {
            // Сброс текущиих данных перед загрузкой
            this.rows = [];
            this.columns = [];
            document.getElementById('dataRows').innerHTML = '';
            document.getElementById('columnsList').innerHTML = '';
            document.getElementById('saveBtn').disabled = true;

            this.showLoading('Загрузка файла...');
            
            this.currentFile = fileId;
            this.uiSelectedFile = fileId;
            const fileInfo = this.availableFiles?.find(f => f.id === fileId);
            
            if (!fileInfo) {
                // Если файл не найден в списке (например, список еще не загрузился), попробуем перезагрузить список
                 throw new Error('Файл не найден в списке');
            }
            
            const fileData = {
                fileName: fileInfo.name || fileInfo.originalName,
                sheets: fileInfo.sheets || ['Sheet1'], 
                uploadDate: new Date().toLocaleString()
            };

            this.updateFileInfo(fileData);
            this.populateSheetSelector(fileData.sheets);
            
            document.getElementById('filePlaceholder').classList.add('hidden');
            document.getElementById('fileDetails').classList.remove('hidden');
            
            this.showSuccess('Файл выбран');
            
            // Колонки будут обновлены через loadSheet, который вызовется из populateSheetSelector
            
        } catch (error) {
            console.error('File load error:', error);
            this.showError('Ошибка при загрузке файла');
        } finally {
            this.hideLoading();
        }
    }

    showColumnModal() {
        document.getElementById('columnModal').classList.remove('hidden');
        document.getElementById('columnNameInput').value = '';
        
        // Populate cell selector from detected headers if available
        const cellInputContainer = document.getElementById('columnCellInput').parentNode; // Assuming input is wrapped in div
        
        // Find existing headers
        // Since loadSheet reads headers for B, D, H, we might have them in columns.
        // But the user might want to add 'A' or 'C'.
        // Let's create a select with A-Z and show detected name if any
        
        let headerMap = {};
        // If we have saved headers from loadSheet, use them. 
        // We only saved "headers" in local scope in loadSheet but applied them to columns.
        // Let's rely on standard A-Z for now but mark "Used" ones.
        
        const usedCells = this.columns.map(c => c.cell);
        
        // Create simple input for now but validate against existing
        // Or better: Change the input to a datalist/select if we had full header info.
        // Since we don't scan ALL headers in backend (only B,D,H), we can't show a full list of names.
        // So we just stick to manual entry but check for duplicates.
        document.getElementById('columnCellInput').value = '';
        document.getElementById('columnStartRowInput').value = '2';
    }

    hideColumnModal() {
        document.getElementById('columnModal').classList.add('hidden');
    }

    addColumn() {
        const name = document.getElementById('columnNameInput').value.trim();
        const cell = document.getElementById('columnCellInput').value.trim().toUpperCase();
        const startRow = parseInt(document.getElementById('columnStartRowInput').value);

        if (!name || !cell) {
            this.showError('Заполните все поля');
            return;
        }

        if (!/^[A-Z]+$/.test(cell)) {
            this.showError('Неверный формат ячейки');
            return;
        }

        // Check availability
        if (this.columns.some(c => c.cell === cell)) {
             this.showError(`Столбец ${cell} уже добавлен в таблицу`);
             return;
        }

        const column = {
            id: Date.now(),
            name,
            cell,
            startRow
        };

        this.columns.push(column);
        this.renderColumns();
        this.hideColumnModal();
        
        // Обновляем редактор
        this.updateEditor();
        
        this.showSuccess(`Столбец "${name}" добавлен`);
    }

    removeColumn(columnId) {
        this.columns = this.columns.filter(col => col.id !== columnId);
        this.renderColumns();
        this.updateEditor();
        this.showSuccess('Столбец удален');
    }

    renderColumns() {
        const container = document.getElementById('columnsList');
        
        if (this.columns.length === 0) {
            container.innerHTML = '<div class="text-sm text-slate-400 text-center py-2">Не настроено</div>';
            return;
        }

        container.innerHTML = this.columns.map(col => `
            <div class="column-badge">
                <span>${col.name}</span>
                <span class="column-badge-cell">${col.cell}${col.startRow}+</span>
                <span class="column-badge-remove" onclick="excelManager.removeColumn(${col.id})">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </span>
            </div>
        `).join('');
    }

    addRow() {
        const newRow = {};
        this.columns.forEach(col => {
            newRow[col.id] = '';
        });
        
        this.rows.push(newRow);
        
        // Оптимизация: вместо полной перерисовки добавляем только новую строку
        const container = document.getElementById('dataRows');
        const index = this.rows.length - 1;
        const rowHTML = this.generateRowHTML(newRow, index);
        container.insertAdjacentHTML('beforeend', rowHTML);
        
        this.markAsModified();
        
        // Scroll to bottom
        // container.lastElementChild.scrollIntoView({ behavior: 'smooth' });
    }

    deleteRow(index) {
        this.rows.splice(index, 1);
        this.renderRows(); // При удалении нужен ререндер для обновления индексов
        this.markAsModified();
    }

    updateEditor() {
        if (this.columns.length === 0) {
            document.getElementById('emptyState').classList.remove('hidden');
            document.getElementById('dataContent').classList.add('hidden');
            return;
        }

        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('dataContent').classList.remove('hidden');
        
        // Если нет строк, добавляем первую
        if (this.rows.length === 0) {
            this.addRow();
        } else {
            this.renderRows();
        }

        document.getElementById('saveBtn').disabled = false;
    }

    generateRowHTML(row, index) {
        return `
            <div class="data-row">
                <div class="data-row-header" style="grid-column: 1 / -1;">
                    <span class="data-row-number">Строка ${index + 1}</span>
                    <div class="data-row-actions">
                        <button class="data-row-delete" onclick="excelManager.deleteRow(${index})">
                            Удалить
                        </button>
                    </div>
                </div>
                ${this.columns.map(col => {
                    const isCloud = col.cell === 'H';
                    // Escape quotes in value
                    const value = (row[col.id] || '').toString().replace(/"/g, '&quot;');
                    
                    return `
                    <div class="data-field">
                        <label class="data-field-label">
                            ${col.name} <span class="text-xs text-slate-500">(${col.cell}${col.startRow + index})</span>
                        </label>
                        <div class="flex gap-2">
                            <input 
                                type="text"
                                id="input_${index}_${col.id}"
                                class="data-field-input flex-1" 
                                placeholder="Введите значение"
                                value="${value}"
                                oninput="excelManager.updateCell(${index}, ${col.id}, this.value)"
                            >
                            ${isCloud ? `
                            <button class="px-2 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors border border-blue-500/20"
                                    onclick="excelManager.openCloudGallery(${index}, ${col.id})"
                                    title="Выбрать из облака">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                </svg>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    }

    renderRows() {
        const container = document.getElementById('dataRows');
        container.innerHTML = this.rows.map((row, index) => this.generateRowHTML(row, index)).join('');
    }

    duplicateToNextRow(rowIndex, colId) {
        // Если это последняя строка, создаем новую
        if (rowIndex === this.rows.length - 1) {
            this.addRow();
        }
        
        // Фокус на соответствующее поле в следующей строке
        setTimeout(() => {
            const nextRowInputs = document.querySelectorAll('.data-row')[rowIndex + 1]
                .querySelectorAll('input');
            
            // Находим индекс колонки
            const colIndex = this.columns.findIndex(c => c.id === colId);
            if (nextRowInputs[colIndex]) {
                nextRowInputs[colIndex].focus();
            }
        }, 50);
    }


    updateCell(rowIndex, columnId, value) {
        this.rows[rowIndex][columnId] = value;
        this.markAsModified();
    }

    markAsModified() {
        this.hasUnsavedChanges = true;
        document.getElementById('unsavedIndicator').classList.remove('hidden');
    }

    async saveExcel() {
        if (!this.currentFile) {
            this.showError('Файл не загружен');
            return;
        }

        try {
            this.showLoading('Сохранение файла на сервере...');

            // Prepare data for backend
            const payload = {
                file: this.currentFile,
                sheet: this.currentSheet, // Index
                columns: this.columns,
                data: this.rows
            };
            
            const response = await fetch('../backend/excel_handler.php?action=save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.hasUnsavedChanges = false;
                document.getElementById('unsavedIndicator').classList.add('hidden');
                this.showSuccess(result.message || 'Файл успешно сохранен');
                
                // Reload list to see new export file
                await this.loadSavedFiles();
                
                // Optional: Select the new file if we want to switch context?
                // For now, just stay on current file.
                
            } else {
                throw new Error(result.message || 'Ошибка сохранения');
            }

        } catch (error) {
            console.error('Save error:', error);
            this.showError('Ошибка при сохранении: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    getColumnIndex(cellLetter) {
        let column = 0;
        for (let i = 0; i < cellLetter.length; i++) {
            column += (cellLetter.charCodeAt(i) - 64) * Math.pow(26, cellLetter.length - i - 1);
        }
        return column - 1; // 0-based
    }

    openCloudGallery(rowIndex, colId) {
        this.activeCloudCell = { rowIndex, colId };
        this.selectedImages = new Set();
        this.updateSelectionUI();
        
        document.getElementById('cloudModal').classList.remove('hidden');
        document.getElementById('cloudSearch').focus();
        if (!this.cloudImagesLoaded) {
            this.loadCloudImages();
        }
    }

    closeCloudGallery() {
        document.getElementById('cloudModal').classList.add('hidden');
        this.activeCloudCell = null;
    }

    setCloudPage(page) {
        this.cloudPage = page;
        this.renderCloudGallery();
    }

    async loadCloudImages() {
        try {
            const response = await fetch('../backend/excel_handler.php?action=getCloudFiles');
            const data = await response.json();
            
            if (data.success) {
                this.cloudImages = data.files.filter(f => f.type === 'cloud');
                this.pubImages = data.files.filter(f => f.type === 'publication');
                this.cloudImagesLoaded = true;
                this.cloudPage = 1; // Reset to page 1
                this.renderCloudGallery();
                this.renderPubFolders();
            }
        } catch (error) {
            console.error('Cloud load error:', error);
        }
    }

    renderCloudGallery(query = '') {
        const container = document.getElementById('cloudGalleryList');
        if (!container) return;
        
        let images = this.cloudImages || [];
        if (query) {
            const q = query.toLowerCase();
            images = images.filter(img => img.name.toLowerCase().includes(q) || img.folder.toLowerCase().includes(q));
        }

        // Group by folder
        const groups = {};
        images.forEach(img => {
            if (!groups[img.folder]) groups[img.folder] = [];
            groups[img.folder].push(img);
        });
        
        // Sort folders (New to Old)
        const sortedFolders = Object.keys(groups).sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })); 
        
        if (sortedFolders.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-slate-500">Нет изображений</div>';
            return;
        }

        // Pagination
        const itemsPerPage = 5;
        const totalPages = Math.ceil(sortedFolders.length / itemsPerPage);
        
        // Ensure valid page
        if (!this.cloudPage || this.cloudPage < 1) this.cloudPage = 1;
        if (this.cloudPage > totalPages) this.cloudPage = totalPages;
        
        const startIndex = (this.cloudPage - 1) * itemsPerPage;
        const visibleFolders = sortedFolders.slice(startIndex, startIndex + itemsPerPage);

        let html = visibleFolders.map(folder => `
            <div class="folder-group bg-slate-900/30 rounded-lg border border-white/5 overflow-hidden mb-4">
                <div class="px-4 py-3 bg-slate-900/50 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
                     onclick="this.nextElementSibling.classList.toggle('hidden')">
                    <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
                        <span class="font-medium text-slate-200">${folder}</span>
                        <span class="text-xs text-slate-500 px-2 py-0.5 bg-slate-800 rounded-full">${groups[folder].length}</span>
                    </div>
                    <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </div>
                <div class="p-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    ${groups[folder].map(img => this.renderImageCard(img)).join('')}
                </div>
            </div>
        `).join('');

        // Add Pagination Controls if needed
        if (totalPages > 1) {
            html += `
                <div class="flex items-center justify-center gap-2 mt-6 py-4 border-t border-white/5">
                    <button class="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                            onclick="excelManager.setCloudPage(${this.cloudPage - 1})"
                            ${this.cloudPage === 1 ? 'disabled' : ''}>
                        &larr; Назад
                    </button>
                    
                    <span class="text-sm text-slate-400">
                        Страница ${this.cloudPage} из ${totalPages}
                    </span>
                    
                    <button class="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                            onclick="excelManager.setCloudPage(${this.cloudPage + 1})"
                            ${this.cloudPage === totalPages ? 'disabled' : ''}>
                        Вперед &rarr;
                    </button>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    renderImageCard(img) {
        const isSelected = this.selectedImages.has(img.url);
        return `
            <div class="group relative aspect-square bg-slate-950 rounded border ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-white/10 hover:border-blue-400/50'} cursor-pointer transition-all overflow-hidden"
                 onclick="excelManager.toggleImageSelection('${img.url}', this)">
                <img src="${img.thumb}" class="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy">
                <div class="absolute top-2 right-2 w-5 h-5 rounded border ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/40 bg-black/40'} flex items-center justify-center transition-colors">
                     ${isSelected ? '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
                </div>
                <div class="absolute inset-x-0 bottom-0 bg-black/70 p-1.5 text-[10px] text-zinc-300 truncate text-center">
                    ${img.name}
                </div>
            </div>
        `;
    }

    renderPubFolders() {
        const container = document.getElementById('pubFolderList');
        if (!container || !this.pubImages) return;

        const folders = [...new Set(this.pubImages.map(img => img.folder))].sort();
        
        if (folders.length === 0) {
            container.innerHTML = '<div class="text-xs text-slate-500 text-center py-4">Нет папок</div>';
            return;
        }

        container.innerHTML = folders.map(folder => `
            <div class="px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded cursor-pointer transition-colors flex items-center gap-2"
                 onclick="excelManager.appendPublicationImages('${folder}')">
                 <svg class="w-4 h-4 text-emerald-500/70" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
                 ${folder}
            </div>
        `).join('');
    }

    toggleImageSelection(url, el) {
        if (this.selectedImages.has(url)) {
            this.selectedImages.delete(url);
        } else {
            if (this.selectedImages.size >= 30) {
                alert('Максимум 30 изображений');
                return;
            }
            this.selectedImages.add(url);
        }
        this.updateSelectionUI();
        
        // Re-render specifically this card or just toggle class for performance
        // Simplest is full re-render or class toggle. Class toggle is better.
        // But for now, let's just re-render gallery to be safe and consistent with "isSelected" logic
        this.renderCloudGallery(document.getElementById('cloudSearch').value);
    }
    
    appendPublicationImages(folderName) {
        if (!this.pubImages) return;
        const images = this.pubImages.filter(img => img.folder === folderName).sort((a,b) => a.name.localeCompare(b.name));
        
        let count = 0;
        images.forEach(img => {
            if (this.selectedImages.size < 30 && !this.selectedImages.has(img.url)) {
                this.selectedImages.add(img.url);
                count++;
            }
        });
        
        if (count > 0) {
             this.updateSelectionUI();
             this.showSuccess(`Добавлено ${count} фото из папки ${folderName}`);
             // Also force render to show checks if these images are visible in current view (unlikely as they are pub, not cloud)
        } else {
             this.showSuccess('Все фото уже добавлены или лимит исчерпан');
        }
    }

    updateSelectionUI() {
        const count = this.selectedImages.size;
        const counter = document.getElementById('selectionCounter');
        const insertBtn = document.getElementById('insertBtn');
        const insertArtBtn = document.getElementById('insertArticleBtn');
        
        if (count > 0) {
            counter.textContent = `Выбрано: ${count}`;
            counter.classList.remove('hidden');
            insertBtn.classList.remove('hidden');
            insertArtBtn.classList.remove('hidden');
        } else {
            counter.classList.add('hidden');
            insertBtn.classList.add('hidden');
            insertArtBtn.classList.add('hidden');
        }
    }

    filterCloudImages(query) {
        this.renderCloudGallery(query);
    }

    insertSelectedImages() {
        if (!this.activeCloudCell) return;
        
        const { rowIndex, colId } = this.activeCloudCell;
        
        const sortedUrls = Array.from(this.selectedImages).sort((a, b) => {
            const isCloudA = a.includes('/uploads/cloud/');
            const isCloudB = b.includes('/uploads/cloud/');
            
            if (isCloudA && !isCloudB) return -1; // Cloud first
            if (!isCloudA && isCloudB) return 1;
            return 0; 
        });

        const urls = sortedUrls.join(';');
        
        this.updateCell(rowIndex, colId, urls);
        
        // Update input visually
        const input = document.getElementById(`input_${rowIndex}_${colId}`);
        if (input) input.value = urls;
        
        this.closeCloudGallery();
    }
    
    insertArticleFromSelection() {
        if (this.selectedImages.size === 0 || !this.activeCloudCell) return;
        
        // Get first selected image article
        const firstUrl = this.selectedImages.values().next().value;
        const imgObj = [...this.cloudImages, ...this.pubImages].find(i => i.url === firstUrl);
        
        if (imgObj && imgObj.article) {
            const { rowIndex } = this.activeCloudCell;
            
            // Find "Article" column (Assuming it's column B or id 1 based on defaults)
            // Better: find column with cell='B'
            const articleCol = this.columns.find(c => c.cell === 'B');
            
            if (articleCol) {
                this.updateCell(rowIndex, articleCol.id, imgObj.article);
                // Update input visually
                const input = document.getElementById(`input_${rowIndex}_${articleCol.id}`);
                if (input) input.value = imgObj.article;
                this.showSuccess(`Артикул ${imgObj.article} вставлен`);
            } else {
                this.showError('Колонка "Артикул" (B) не найдена');
            }
        }
    }

    // Вспомогательные методы для уведомлений
    showLoading(message) {
        // Можно добавить индикатор загрузки
        console.log('Loading:', message);
    }

    hideLoading() {
        console.log('Loading complete');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Простое уведомление через alert (можно заменить на более красивое)
        if (type === 'error') {
            alert('❌ ' + message);
        } else {
            console.log('✓', message);
        }
    }
}

// Инициализация при загрузке страницы
// let excelManager; // Make global on window
document.addEventListener('DOMContentLoaded', () => {
    window.excelManager = new ExcelManager();
});
