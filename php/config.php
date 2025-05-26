<?php
/**
 * 系統配置文件
 * 集中管理所有服務器地址、端口和資料庫連接信息
 */

// 服務器設置
$CONFIG = [
    // API 服務器設置
    'api' => [
        'host' => '192.168.1.105',  // API 服務器主機名/IP
        'port' => 5008,             // API 服務器端口
        'protocol' => 'http',       // 協議（http 或 https）
        'base_url' => null,         // 會被自動生成
    ],
    
    // 資料庫設置
    'databases' => [
        // MongoDB 設置
        'mongodb' => [
            'host' => '192.168.0.106',
            'port' => 27017,
            'dbname' => 'users',
            'username' => '',  
            'password' => '', 
            'connection_string' => null  // 會被自動生成
        ],
        
        // MySQL 設置
        'mysql' => [
            'host' => '127.0.0.1',
            'port' => 3306,
            'dbname' => 'unity_project',
            'username' => 'root', 
            'password' => '',
        ]
    ],
    
    // 其他設置
    'settings' => [
        'debug' => true,  // 是否開啟調試模式
        'timezone' => 'Asia/Taipei',  // 時區設置
    ]
];

// 生成完整 API URL
$CONFIG['api']['base_url'] = "{$CONFIG['api']['protocol']}://{$CONFIG['api']['host']}:{$CONFIG['api']['port']}";

// 生成 MongoDB 連接字符串
if (empty($CONFIG['databases']['mongodb']['username'])) {
    // 無認證連接字符串
    $CONFIG['databases']['mongodb']['connection_string'] = 
        "mongodb://{$CONFIG['databases']['mongodb']['host']}:{$CONFIG['databases']['mongodb']['port']}/";
} else {
    // 有認證連接字符串
    $CONFIG['databases']['mongodb']['connection_string'] = 
        "mongodb://{$CONFIG['databases']['mongodb']['username']}:{$CONFIG['databases']['mongodb']['password']}@" .
        "{$CONFIG['databases']['mongodb']['host']}:{$CONFIG['databases']['mongodb']['port']}/";
}

// 設置時區
date_default_timezone_set($CONFIG['settings']['timezone']);

/**
 * 獲取配置值的輔助函數
 * 
 * @param string $key 配置鍵，使用點符號來訪問嵌套配置，例如：api.host
 * @param mixed $default 如果找不到配置，返回的默認值
 * @return mixed 配置值
 */
function config($key, $default = null) {
    global $CONFIG;
    
    $keys = explode('.', $key);
    $value = $CONFIG;
    
    foreach ($keys as $segment) {
        if (!isset($value[$segment])) {
            return $default;
        }
        $value = $value[$segment];
    }
    
    return $value;
}