<?php
/**
 * 儲存商品資料到 MongoDB
 * 將商品資訊儲存到 furniture_db/{使用者公司}_product collection
 */

session_start();
header('Content-Type: application/json');

error_log("POST資料: " . print_r($_POST, true));
error_log("FILES資料: " . print_r($_FILES, true));

// 引入配置文件
require_once 'config.php';

// 檢查用戶是否已登入
if (!isset($_SESSION["login"]) || $_SESSION["login"] !== true) {
    echo json_encode(["success" => false, "message" => "用戶未登入"]);
    exit;
}

// 獲取登入的用戶名
$username = isset($_SESSION["username"]) ? $_SESSION["username"] : "";

if (empty($username)) {
    echo json_encode(["success" => false, "message" => "無法獲取用戶名"]);
    exit;
}

// 檢查是否為 POST 請求
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "僅支援 POST 請求"]);
    exit;
}

try {
    // 檢查是否安裝了 MongoDB 擴展
    if (!extension_loaded('mongodb')) {
        throw new Exception("MongoDB 擴展未安裝");
    }

    // 連接到 MongoDB
    $manager = new MongoDB\Driver\Manager(config('databases.mongodb.connection_string'));

    // **第一步：獲取使用者的公司資訊**
    $userFilter = ["account" => $username];
    $userQuery = new MongoDB\Driver\Query($userFilter, []);
    $userCursor = $manager->executeQuery(
        config('databases.mongodb.dbname') . ".profiles", 
        $userQuery
    );

    $userCompany = "default"; // 預設公司名稱
    foreach ($userCursor as $userDocument) {
        if (isset($userDocument->company) && !empty($userDocument->company)) {
            $userCompany = $userDocument->company;
        }
        break;
    }

    // 清理公司名稱，移除特殊字符，用於 collection 名稱
    $collectionSuffix = preg_replace('/[^a-zA-Z0-9_\x{4e00}-\x{9fff}]/u', '_', $userCompany);
    $collectionName = $collectionSuffix . "_product";

    // **【修改部分】第二步：從前端獲取產品資訊和資料夾結構**
    $productName = $_POST['name'] ?? '';
    $productId = $_POST['product_id'] ?? '';  // **【新增】從前端獲取產品序號**
    $productFolder = $_POST['product_folder'] ?? '';  // **【新增】從前端獲取資料夾名稱**
    
    if (empty($productName)) {
        throw new Exception("商品名稱為必填欄位");
    }
    
    // **【修改】如果沒有提供產品資訊，則生成新的（向後兼容）**
    if (empty($productId)) {
        $productId = uniqid();
        $cleanProductName = preg_replace('/[^a-zA-Z0-9_\x{4e00}-\x{9fff}]/u', '_', $productName);
        $productFolderName = $cleanProductName . "_product_" . $productId;
    } else {
        $productFolderName = $productFolder ?: $productName . "_product_" . $productId;
    }
    
    // 基礎路徑
    $baseDir = '../uploads/products/';
    $productDir = $baseDir . $productFolderName . '/';
    $imagesDir = $productDir . 'images/';
    $modelDir = $productDir . 'model/';
    
    // **【修改】檢查資料夾是否已存在（由 Python 端創建），不存在則創建**
    if (!file_exists($baseDir)) {
        mkdir($baseDir, 0755, true);
    }
    if (!file_exists($productDir)) {
        mkdir($productDir, 0755, true);
    }
    if (!file_exists($imagesDir)) {
        mkdir($imagesDir, 0755, true);
    }
    if (!file_exists($modelDir)) {
        mkdir($modelDir, 0755, true);
    }

    // **【修改部分】第三步：處理模態對話框中選擇的商品圖片**
    $uploadedImages = [];
    
    if (isset($_FILES['images']) && !empty($_FILES['images']['name'][0])) {
        $imageFiles = $_FILES['images'];
        $fileCount = count($imageFiles['name']);
        
        for ($i = 0; $i < $fileCount; $i++) {
            if ($imageFiles['error'][$i] === UPLOAD_ERR_OK) {
                $fileName = $imageFiles['name'][$i];
                $tempName = $imageFiles['tmp_name'][$i];
                $fileSize = $imageFiles['size'][$i];
                $fileType = $imageFiles['type'][$i];
                
                // 驗證檔案類型
                $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!in_array($fileType, $allowedTypes)) {
                    continue; // 跳過不支援的檔案類型
                }
                
                // 驗證檔案大小 (5MB)
                if ($fileSize > 5 * 1024 * 1024) {
                    continue; // 跳過過大的檔案
                }
                
                // **【修改部分】依序重新命名為 img1、img2、img3...**
                $imageNumber = $i + 1;
                $fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);
                $newImageName = "img" . $imageNumber . "." . $fileExtension;
                $uploadPath = $imagesDir . $newImageName;
                
                // 移動檔案
                if (move_uploaded_file($tempName, $uploadPath)) {
                    $uploadedImages[] = 'uploads/products/' . $productFolderName . '/images/' . $newImageName;
                }
            }
        }
    }

    // **【修改部分】第四步：處理3D模型檔案路徑**
    $modelUrl = $_POST['model_url'] ?? '';
    $localModelPath = '';
    
    if (!empty($modelUrl)) {
        // **【修改】檢查模型是否已經是本地路徑（由 Python 端處理）**
        if (strpos($modelUrl, '/uploads/products/') === 0) {
            // 已經是本地路徑，直接使用
            $localModelPath = $modelUrl;
            error_log("使用 Python 端提供的本地模型路徑: " . $localModelPath);
        } else {
            // 外部URL，需要下載到本地（向後兼容）
            $modelContent = file_get_contents($modelUrl);
            if ($modelContent !== false) {
                $localModelFileName = $productFolderName . ".glb";
                $localModelFilePath = $modelDir . $localModelFileName;
                
                if (file_put_contents($localModelFilePath, $modelContent)) {
                    $localModelPath = 'uploads/products/' . $productFolderName . '/model/' . $localModelFileName;
                    error_log("下載並儲存3D模型檔案: " . $localModelPath);
                } else {
                    error_log("無法儲存3D模型檔案: " . $localModelFilePath);
                    $localModelPath = '';
                }
            } else {
                error_log("無法下載3D模型檔案: " . $modelUrl);
            }
        }
    }

    // **第五步：準備商品資料**
    $productData = [
        'product_id' => $productId, // **【新增】唯一產品序號**
        'name' => $productName,
        'price' => isset($_POST['price']) ? (float)$_POST['price'] : 0,
        'category' => $_POST['category'] ?? '',
        'description' => $_POST['description'] ?? '',
        'url' => $_POST['url'] ?? '',
        'model_url' => $localModelPath, // **【修改】儲存本地模型路徑**
        'brand' => $userCompany,
        'images' => $uploadedImages, // **【修改】只儲存模態對話框中選擇的圖片**
        'size_options' => isset($_POST['size_options']) ? json_decode($_POST['size_options'], true) : null,
        'folder_path' => 'uploads/products/' . $productFolderName, // **【新增】產品資料夾路徑**
        'created_at' => new MongoDB\BSON\UTCDateTime(),
        'updated_at' => new MongoDB\BSON\UTCDateTime(),
        'created_by' => $username,
        'status' => 'active'
    ];

    // 驗證必填欄位
    if (empty($productData['name'])) {
        throw new Exception("商品名稱為必填欄位");
    }
    if (empty($productData['category'])) {
        throw new Exception("商品種類為必填欄位");
    }
    if ($productData['price'] <= 0) {
        throw new Exception("商品價格必須大於 0");
    }

    // **第六步：將商品資料插入到 MongoDB**
    $bulk = new MongoDB\Driver\BulkWrite;
    $insertedId = $bulk->insert($productData);
    
    $result = $manager->executeBulkWrite(
        "furniture_db." . $collectionName,
        $bulk
    );

    // 檢查插入結果
    if ($result->getInsertedCount() > 0) {
        // 成功插入，返回成功回應
        $response = [
            "success" => true,
            "message" => "商品儲存成功",
            "product" => [
                "id" => (string)$insertedId,
                "product_id" => $productId, // **【新增】回傳產品序號**
                "name" => $productData['name'],
                "price" => $productData['price'],
                "category" => $productData['category'],
                "brand" => $productData['brand'],
                "collection" => $collectionName,
                "folder_path" => $productData['folder_path'], // **【新增】回傳資料夾路徑**
                "model_url" => $productData['model_url'],
                "images_count" => count($uploadedImages)
            ]
        ];
        
        echo json_encode($response);
    } else {
        throw new Exception("商品儲存失敗，未知錯誤");
    }

} catch (MongoDB\Driver\Exception\Exception $e) {
    echo json_encode([
        "success" => false, 
        "message" => "MongoDB 錯誤: " . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        "success" => false, 
        "message" => $e->getMessage()
    ]);
}
?>