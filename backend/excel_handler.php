<?php
// backend/excel_handler.php
// Обработчик для работы с Excel файлами

require_once __DIR__ . '/init.php';
require_once __DIR__ . '/utils.php';

// Подключаем PhpSpreadsheet
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
}

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

header('Content-Type: application/json');

// Директории для хранения
define('EXCEL_UPLOAD_DIR', __DIR__ . '/../uploads/excel/');
define('EXCEL_HISTORY_DIR', __DIR__ . '/../uploads/excel/history/');
define('EXCEL_DATA_DIR', __DIR__ . '/../data/excel/');

// Создаем директории если их нет
if (!is_dir(EXCEL_UPLOAD_DIR)) {
    mkdir(EXCEL_UPLOAD_DIR, 0755, true);
}
if (!is_dir(EXCEL_HISTORY_DIR)) {
    mkdir(EXCEL_HISTORY_DIR, 0755, true);
}
if (!is_dir(EXCEL_DATA_DIR)) {
    mkdir(EXCEL_DATA_DIR, 0755, true);
}

// Увеличиваем лимит памяти для работы с большими файлами
ini_set('memory_limit', '2048M');

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'upload':
            handleUpload();
            break;
        
        case 'getSheet':
            getSheet();
            break;
        
        case 'save':
            saveExcel();
            break;
        
        case 'list':
            listFiles();
            break;
        
        case 'delete':
            deleteFile();
            break;

        case 'getCloudFiles':
            getCloudFiles();
            break;
        
        default:
            throw new Exception('Неизвестное действие');
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}

function handleUpload() {
    if (!isset($_FILES['file'])) {
        throw new Exception('Файл не загружен');
    }

    $file = $_FILES['file'];
    
    // Проверка ошибок загрузки
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Ошибка при загрузке файла');
    }

    // Проверка расширения
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['xlsx', 'xls'])) {
        throw new Exception('Неподдерживаемый формат файла. Используйте .xlsx или .xls');
    }

    // Генерируем уникальное имя файла
    $fileId = uniqid('excel_', true);
    $fileName = $fileId . '.' . $ext;
    
    // Если это экспорт (загрузка из JS), сохраняем в историю
    $isExport = isset($_POST['is_export']) && $_POST['is_export'] === 'true';
    $targetDir = $isExport ? EXCEL_HISTORY_DIR : EXCEL_UPLOAD_DIR;
    $filePath = $targetDir . $fileName;

    // Перемещаем загруженный файл
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception('Не удалось сохранить файл');
    }

    // Читаем информацию о файле
    $sheets = getExcelSheets($filePath);
    
    // Сохраняем метаданные
    $metadata = [
        'id' => $fileId,
        'originalName' => $file['name'],
        'fileName' => $fileName,
        'filePath' => $filePath,
        'uploadDate' => date('Y-m-d H:i:s'),
        'sheets' => $sheets,
        'size' => $file['size'],
        'is_export' => $isExport
    ];

    file_put_contents(
        EXCEL_DATA_DIR . $fileId . '.json',
        json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );

    echo json_encode([
        'success' => true,
        'file' => $fileId,
        'fileName' => $file['name'],
        'sheets' => $sheets,
        'message' => 'Файл успешно загружен'
    ]);
}

function getExcelSheets($filePath) {
    try {
        // Проверяем наличие ZipArchive для чтения .xlsx
        if (!class_exists('ZipArchive')) {
            error_log("ZipArchive not available, cannot read Excel file");
            return ['Sheet1']; // Возвращаем заглушку
        }
        
        $spreadsheet = IOFactory::load($filePath);
        $sheets = [];
        
        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $sheets[] = $sheet->getTitle();
        }
        
        return $sheets;
    } catch (Throwable $e) {
        error_log("Error reading Excel sheets: " . $e->getMessage());
        return ['Sheet1'];
    }
}

function getSheet() {
    $fileId = $_GET['file'] ?? '';
    $sheetIndex = $_GET['sheet'] ?? 0;

    if (empty($fileId)) {
        throw new Exception('Не указан файл');
    }

    // Загружаем метаданные
    $metadataPath = EXCEL_DATA_DIR . $fileId . '.json';
    if (!file_exists($metadataPath)) {
        throw new Exception('Файл не найден');
    }

    $metadata = json_decode(file_get_contents($metadataPath), true);
    $filePath = $metadata['filePath'];

    if (!file_exists($filePath)) {
        throw new Exception('Файл Excel не найден');
    }

    // Если нужна клиентская обработка для некоторых файлов
    $clientSideParsing = true; // FORCE client side parsing to avoid memory usage on just reading headers

    if ($clientSideParsing) {
         $urlBase = ($metadata['is_export'] ?? false) ? '../uploads/excel/history/' : '../uploads/excel/';
         echo json_encode([
            'success' => true,
            'clientSideParsingRequired' => true,
            'fileUrl' => $urlBase . basename($filePath),
            'message' => 'Switching to client-side parsing for performance'
        ]);
        return;
    }

    try {
        if (!class_exists('ZipArchive') || !class_exists('PhpOffice\PhpSpreadsheet\IOFactory')) {
             throw new Exception('Server-side parsing unavailable');
        }

        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getSheet($sheetIndex);
        
        // Читаем заголовки из 3-й строки для колонок B, D, H (как в JS)
        // В JS: 'B3', 'D3', 'H3'
        $headers = [
            'B' => $sheet->getCell('B3')->getValue() ?: 'Артикул WB',
            'D' => $sheet->getCell('D3')->getValue() ?: 'Наименование',
            'H' => $sheet->getCell('H3')->getValue() ?: 'Ссылки на фото'
        ];
        
        echo json_encode([
            'success' => true,
            'sheet' => $sheet->getTitle(),
            'headers' => $headers, 
            'data' => [] 
        ]);
    } catch (Throwable $e) {
        $urlBase = ($metadata['is_export'] ?? false) ? '../uploads/excel/history/' : '../uploads/excel/';
        echo json_encode([
            'success' => true,
            'clientSideParsingRequired' => true,
            'fileUrl' => $urlBase . basename($filePath),
            'message' => 'Backend parsing failed, switching to client-side'
        ]);
    }
}

function saveExcel() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $fileId = $input['file'] ?? '';
    // $sheetIndex может быть числом или строкой
    $sheetIndex = isset($input['sheet']) ? (int)$input['sheet'] : 0;
    $columns = $input['columns'] ?? [];
    $data = $input['data'] ?? [];

    if (empty($fileId)) {
        throw new Exception('Не указан файл');
    }

    // Загружаем метаданные исходного файла
    $metadataPath = EXCEL_DATA_DIR . $fileId . '.json';
    if (!file_exists($metadataPath)) {
        throw new Exception('Файл не найден');
    }

    $metadata = json_decode(file_get_contents($metadataPath), true);
    $filePath = $metadata['filePath'];

    if (!file_exists($filePath)) {
        throw new Exception('Файл Excel не найден');
    }

    try {
        // С ZipArchive можем читать существующий файл
        if (!class_exists('ZipArchive')) {
             throw new Exception('ZipArchive missing on server');
        }
        
        $spreadsheet = IOFactory::load($filePath);
        
        // Получаем лист
        if ($sheetIndex >= $spreadsheet->getSheetCount()) {
            $sheet = $spreadsheet->getSheet(0); // Fallback
        } else {
            $sheet = $spreadsheet->getSheet($sheetIndex);
        }

        // Записываем данные в Excel
        $rowCount = 0;
        foreach ($data as $rowIndex => $rowData) {
            foreach ($columns as $column) {
                $cell = $column['cell']; // "B"
                $colId = $column['id'];  // ID из JS (например, 1, 2)
                $startRow = isset($column['startRow']) ? (int)$column['startRow'] : 5;
                
                $excelRow = $startRow + $rowIndex;
                
                // В JS данные лежат по ID колонки
                $value = $rowData[$colId] ?? '';
                
                $sheet->setCellValue($cell . $excelRow, $value);
            }
            $rowCount++;
        }

        $writer = new Xlsx($spreadsheet);

        // Проверяем, является ли текущий файл уже экспортным (из истории)
        if (!empty($metadata['is_export']) && $metadata['is_export'] === true) {
            // Если это файл из истории, перезаписываем его
            $writer->save($filePath);
            
            // Обновляем дату изменения и размер в метаданных
            $metadata['uploadDate'] = date('Y-m-d H:i:s');
            clearstatcache(true, $filePath);
            $metadata['size'] = filesize($filePath);
            
            file_put_contents(
                EXCEL_DATA_DIR . $fileId . '.json',
                json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            );

            echo json_encode([
                'success' => true,
                'message' => 'Файл обновлен',
                'fileId' => $fileId,
                'fileName' => $metadata['originalName']
            ]);

        } else {
            // Если это шаблон, создаем новый файл в истории
            
            // Генерируем имя для истории
            $originalName = pathinfo($metadata['originalName'], PATHINFO_FILENAME);
            // Очищаем имя от "export_" префиксов если есть
            $originalName = preg_replace('/^export_/', '', $originalName);
            
            $exportFileName = $originalName . '_' . date('Y-m-d_H-i-s') . '.xlsx';
            $exportPath = EXCEL_HISTORY_DIR . $exportFileName;
            
            $writer->save($exportPath);

            // Создаем новые метаданные для экспортированного файла
            $newFileId = uniqid('excel_hist_', true);
            $newMetadata = [
                'id' => $newFileId,
                'originalName' => $exportFileName, // Имя файла в списке
                'fileName' => $exportFileName,
                'filePath' => $exportPath,
                'uploadDate' => date('Y-m-d H:i:s'),
                'sheets' => $metadata['sheets'], // Листы те же
                'size' => filesize($exportPath),
                'is_export' => true,
                'parent_id' => $fileId
            ];
            
            file_put_contents(
                EXCEL_DATA_DIR . $newFileId . '.json',
                json_encode($newMetadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            );

            echo json_encode([
                'success' => true,
                'message' => 'Файл успешно сохранен в истории',
                'fileId' => $newFileId,
                'fileName' => $exportFileName
            ]);
        }
    } catch (Exception $e) {
        throw new Exception('Ошибка при сохранении Excel: ' . $e->getMessage());
    }
}

function listFiles() {
    $files = [];
    $dataFiles = glob(EXCEL_DATA_DIR . '*.json');

    foreach ($dataFiles as $file) {
        $basename = basename($file);
        if (strpos($basename, '_data.json') !== false) {
            continue; // Пропускаем файлы данных
        }

        $metadata = json_decode(file_get_contents($file), true);
        
        if (!$metadata) continue;

        $isExport = isset($metadata['is_export']) && $metadata['is_export'];
        $urlBase = $isExport ? '../uploads/excel/history/' : '../uploads/excel/';

        $files[] = [
            'id' => $metadata['id'],
            'name' => $metadata['originalName'],
            'uploadDate' => $metadata['uploadDate'],
            'sheets' => $metadata['sheets'] ?? ['Sheet1'],
            'sheetsCount' => is_array($metadata['sheets'] ?? null) ? count($metadata['sheets']) : 0,
            'size' => $metadata['size'] ?? 0, // Return raw bytes to JS
            'formattedSize' => formatBytes($metadata['size'] ?? 0),
            'url' => $urlBase . $metadata['fileName'],
            'is_export' => $isExport
        ];
    }

    // Сортируем по дате загрузки (новые первыми)
    usort($files, function($a, $b) {
        return strtotime($b['uploadDate']) - strtotime($a['uploadDate']);
    });

    echo json_encode([
        'success' => true,
        'files' => $files
    ]);
}

function deleteFile() {
    $fileId = $_GET['id'] ?? '';

    if (empty($fileId)) {
        throw new Exception('Не указан файл');
    }

    $metadataPath = EXCEL_DATA_DIR . $fileId . '.json';
    if (!file_exists($metadataPath)) {
        throw new Exception('Файл не найден');
    }

    $metadata = json_decode(file_get_contents($metadataPath), true);
    $filePath = $metadata['filePath'];

    // Удаляем файлы
    if (file_exists($filePath)) {
        unlink($filePath);
    }
    if (file_exists($metadataPath)) {
        unlink($metadataPath);
    }

    $dataPath = EXCEL_DATA_DIR . $fileId . '_data.json';
    if (file_exists($dataPath)) {
        unlink($dataPath);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Файл удален'
    ]);
}

function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}

function getCloudFiles() {
    $cloudDir = __DIR__ . '/../uploads/cloud/';
    $result = [];
    $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
    $host = $_SERVER['HTTP_HOST'];

    // Scan Cloud Folder
    if (is_dir($cloudDir)) {
        $folders = scandir($cloudDir);
        foreach ($folders as $folder) {
            if ($folder === '.' || $folder === '..') continue;
            
            $productDir = $cloudDir . $folder . '/products/';
            if (is_dir($productDir)) {
                $files = scandir($productDir);
                foreach ($files as $file) {
                    if (preg_match('/\.(jpg|jpeg|png)$/i', $file)) {
                        $url = '/uploads/cloud/' . $folder . '/products/' . $file;
                        $fullUrl = $protocol . "://" . $host . $url;
                        
                        $result[] = [
                            'name' => $file,
                            'folder' => $folder,
                            'type' => 'cloud',
                            'url' => $fullUrl,
                            'thumb' => $url,
                            'article' => pathinfo($file, PATHINFO_FILENAME)
                        ];
                    }
                }
            }
        }
    }
    
    // Scan Publication Folder (Virtual Folders from folders.json)
    $foldersFile = __DIR__ . '/../data/folders.json';
    if (file_exists($foldersFile)) {
        $foldersData = json_decode(file_get_contents($foldersFile), true);
        
        // Iterate over keys usually like "publication_SomeTitle"
        foreach ($foldersData as $sectionKey => $folders) {
            if (strpos($sectionKey, 'publication_') === 0) {
                foreach ($folders as $folderName => $files) {
                    if (is_array($files)) {
                        foreach ($files as $file) {
                             if (preg_match('/\.(jpg|jpeg|png)$/i', $file)) {
                                $url = '/uploads/publication/' . $file; // Flat structure
                                
                                // Check if file actually exists before adding
                                if (file_exists(__DIR__ . '/../uploads/publication/' . $file)) {
                                    $fullUrl = $protocol . "://" . $host . $url;
                                    
                                    $result[] = [
                                        'name' => $file,
                                        'folder' => $folderName, // Virtual folder name
                                        'type' => 'publication',
                                        'url' => $fullUrl,
                                        'thumb' => $url,
                                        'article' => pathinfo($file, PATHINFO_FILENAME)
                                    ];
                                }
                             }
                        }
                    }
                }
            }
        }
    }
    
    echo json_encode(['success' => true, 'files' => $result]);
}
