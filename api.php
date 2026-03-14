<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 错误显示
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// 处理OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 设置时区为 UTC
date_default_timezone_set('UTC');

// 文件路径
define('DATA_DIR', __DIR__ . '/data');
define('USERS_FILE', DATA_DIR . '/users.json');
define('CHANNELS_FILE', DATA_DIR . '/channels.json');
define('MSG1_FILE', DATA_DIR . '/1.json');
define('MSG2_FILE', DATA_DIR . '/2.json');
define('ONLINE_FILE', DATA_DIR . '/online.json');
define('KICKED_FILE', DATA_DIR . '/kicked.json');
define('MUTE_FILE', DATA_DIR . '/mute.json');

// 确保目录存在
if (!file_exists(DATA_DIR)) mkdir(DATA_DIR, 0777, true);

// 初始化文件
if (!file_exists(USERS_FILE)) file_put_contents(USERS_FILE, '[]');
if (!file_exists(CHANNELS_FILE)) {
    file_put_contents(CHANNELS_FILE, json_encode([
        ['id' => '1', 'name' => 'general'],
        ['id' => '2', 'name' => 'random']
    ]));
}
if (!file_exists(MSG1_FILE)) file_put_contents(MSG1_FILE, '[]');
if (!file_exists(MSG2_FILE)) file_put_contents(MSG2_FILE, '[]');
if (!file_exists(ONLINE_FILE)) file_put_contents(ONLINE_FILE, '[]');
if (!file_exists(KICKED_FILE)) file_put_contents(KICKED_FILE, '[]');
if (!file_exists(MUTE_FILE)) file_put_contents(MUTE_FILE, '[]');

// 获取请求
$path = $_GET['path'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// 获取POST数据
$input = file_get_contents('php://input');
$data = [];
if ($input) {
    $data = json_decode($input, true);
}

// 返回JSON
function jsonout($success, $data = null, $message = null) {
    $res = ['success' => $success];
    if ($data !== null) $res['data'] = $data;
    if ($message !== null) $res['message'] = $message;
    echo json_encode($res, JSON_UNESCAPED_UNICODE);
    exit;
}

// 带文件锁的 JSON 读取
function readJsonFile($filepath, $default = []) {
    if (!file_exists($filepath)) {
        return $default;
    }

    $fp = fopen($filepath, 'r');
    if (!$fp) {
        error_log("无法打开文件: $filepath");
        return $default;
    }

    // 获取共享锁（读锁）
    if (flock($fp, LOCK_SH)) {
        $content = stream_get_contents($fp);
        flock($fp, LOCK_UN);
        fclose($fp);

        $data = json_decode($content, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $data;
        } else {
            error_log("JSON 解析错误: " . json_last_error_msg());
            return $default;
        }
    } else {
        fclose($fp);
        error_log("无法获取文件锁: $filepath");
        return $default;
    }
}

// 带文件锁的 JSON 写入
function writeJsonFile($filepath, $data) {
    $fp = fopen($filepath, 'c');
    if (!$fp) {
        error_log("无法打开文件: $filepath");
        return false;
    }

    // 获取独占锁（写锁）
    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $result = fwrite($fp, $json);
        flock($fp, LOCK_UN);
        fclose($fp);

        return $result !== false;
    } else {
        fclose($fp);
        error_log("无法获取文件锁: $filepath");
        return false;
    }
}

// 获取header里的token（兼容各种 PHP 环境）
function getToken() {
    // 方法1: 使用 getallheaders()（Apache 环境）
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        return $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    
    // 方法2: 从 $_SERVER 中获取（Nginx/CGI 环境）
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        return $_SERVER['HTTP_AUTHORIZATION'];
    }
    
    // 方法3: 处理 Apache mod_php 的特殊情况
    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    
    // 方法4: 遍历所有 headers
    foreach ($_SERVER as $key => $value) {
        if (strcasecmp($key, 'HTTP_AUTHORIZATION') === 0) {
            return $value;
        }
    }
    
    return '';
}

// ========== 用户认证 ==========

// 注册
if ($path === 'auth/register' && $method === 'POST') {
    $users = readJsonFile(USERS_FILE);

    $email = $data['email'] ?? '';
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (!$email || !$username || !$password) {
        jsonout(false, null, '请填写所有字段');
    }

    foreach ($users as $u) {
        if ($u['email'] === $email) jsonout(false, null, '邮箱已存在');
        if ($u['username'] === $username) jsonout(false, null, '用户名已存在');
    }

    $id = 'u' . time() . rand(100, 999);
    $token = md5($id . time() . rand());

    $new = [
        'id' => $id,
        'email' => $email,
        'username' => $username,
        'password' => md5($password),
        'token' => $token,
        'role' => 'user',
        'created_at' => date('Y-m-d H:i:s')
    ];

    $users[] = $new;
    if (writeJsonFile(USERS_FILE, $users)) {
        jsonout(true, [
            'token' => $token,
            'user' => ['id' => $id, 'username' => $username, 'email' => $email, 'role' => 'user']
        ]);
    } else {
        jsonout(false, null, '注册失败，请稍后重试');
    }
}

// 登录
if ($path === 'auth/login' && $method === 'POST') {
    $users = readJsonFile(USERS_FILE);

    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (!$email || !$password) {
        jsonout(false, null, '请填写邮箱和密码');
    }

    $pwd = md5($password);

    foreach ($users as $u) {
        if ($u['email'] === $email && $u['password'] === $pwd) {
            jsonout(true, [
                'token' => $u['token'],
                'user' => [
                    'id' => $u['id'],
                    'username' => $u['username'],
                    'email' => $u['email'],
                    'role' => $u['role'] ?? 'user'
                ]
            ]);
        }
    }
    jsonout(false, null, '邮箱或密码错误');
}

// 获取当前用户
if ($path === 'auth/me' && $method === 'GET') {
    $username = $_GET['username'] ?? '';
    $users = readJsonFile(USERS_FILE);

    if (empty($username)) {
        jsonout(false, null, '未提供用户名');
    }

    foreach ($users as $u) {
        if ($u['username'] === $username) {
            jsonout(true, [
                'id' => $u['id'],
                'username' => $u['username'],
                'email' => $u['email'],
                'role' => $u['role'] ?? 'user'
            ]);
        }
    }
    jsonout(false, null, '用户不存在');
}

// ========== 频道 ==========

// 频道列表
if ($path === 'channels' && $method === 'GET') {
    $channels = readJsonFile(CHANNELS_FILE);
    jsonout(true, $channels);
}

// ========== 频道1消息 ==========

// 获取频道1消息
if ($path === 'channels/1/messages' && $method === 'GET') {
    $msgs = readJsonFile(MSG1_FILE);

    // 为每条消息添加author字段
    foreach ($msgs as &$msg) {
        $msg['author'] = [
            'id' => $msg['user_id'] ?? '',
            'username' => $msg['username'] ?? '用户'
        ];
    }

    jsonout(true, $msgs);
}

// 发送消息到频道1
if ($path === 'channels/1/messages' && $method === 'POST') {
    $content = $data['content'] ?? '';
    $username = $data['username'] ?? '游客';
    $clientTimestamp = $data['timestamp'] ?? null;
    $isWhisper = $data['isWhisper'] ?? false;
    $targetUser = $data['targetUser'] ?? '';

    if (empty(trim($content))) {
        jsonout(false, null, '消息不能为空');
    }

    $msgs = readJsonFile(MSG1_FILE);

    // 使用客户端时间戳（毫秒），如果没有则使用服务器时间（秒）
    $timestamp = $clientTimestamp ? floor($clientTimestamp / 1000) : time();

    $newMsg = [
        'id' => 'msg_' . time() . '_' . rand(1000, 9999),
        'user_id' => 'user_' . time(),
        'username' => $username,
        'content' => trim($content),
        'created_at' => $timestamp,
        'isWhisper' => $isWhisper,
        'targetUser' => $isWhisper ? $targetUser : ''
    ];

    $msgs[] = $newMsg;
    if (writeJsonFile(MSG1_FILE, $msgs)) {
        $newMsg['author'] = [
            'id' => $newMsg['user_id'],
            'username' => $newMsg['username']
        ];

        jsonout(true, $newMsg);
    } else {
        jsonout(false, null, '发送失败，请稍后重试');
    }
}

// ========== 频道2消息 ==========

// 获取频道2消息
if ($path === 'channels/2/messages' && $method === 'GET') {
    $msgs = readJsonFile(MSG2_FILE);

    foreach ($msgs as &$msg) {
        $msg['author'] = [
            'id' => $msg['user_id'] ?? '',
            'username' => $msg['username'] ?? '用户'
        ];
    }

    jsonout(true, $msgs);
}

// 发送消息到频道2
if ($path === 'channels/2/messages' && $method === 'POST') {
    $content = $data['content'] ?? '';
    $username = $data['username'] ?? '游客';
    $clientTimestamp = $data['timestamp'] ?? null;
    $isWhisper = $data['isWhisper'] ?? false;
    $targetUser = $data['targetUser'] ?? '';

    if (empty(trim($content))) {
        jsonout(false, null, '消息不能为空');
    }

    $msgs = readJsonFile(MSG2_FILE);

    // 使用客户端时间戳（毫秒），如果没有则使用服务器时间（秒）
    $timestamp = $clientTimestamp ? floor($clientTimestamp / 1000) : time();

    $newMsg = [
        'id' => 'msg_' . time() . '_' . rand(1000, 9999),
        'user_id' => 'user_' . time(),
        'username' => $username,
        'content' => trim($content),
        'created_at' => $timestamp,
        'isWhisper' => $isWhisper,
        'targetUser' => $isWhisper ? $targetUser : ''
    ];

    $msgs[] = $newMsg;
    if (writeJsonFile(MSG2_FILE, $msgs)) {
        $newMsg['author'] = [
            'id' => $newMsg['user_id'],
            'username' => $newMsg['username']
        ];

        jsonout(true, $newMsg);
    } else {
        jsonout(false, null, '发送失败，请稍后重试');
    }
}

// ========== 长轮询 ==========

// 长轮询获取新消息
if ($path === 'poll_messages' && $method === 'GET') {
    $channel = $_GET['channel'] ?? '1';
    $lastId = $_GET['last_id'] ?? '';
    $timeout = 5; // 最长等待5秒

    // 选择对应的消息文件
    $msgFile = $channel === '1' ? MSG1_FILE : MSG2_FILE;

    $startTime = time();
    $newMessages = [];

    // 循环等待新消息
    while (time() - $startTime < $timeout) {
        $messages = readJsonFile($msgFile);

        if ($lastId) {
            // 找到最后一条消息之后的 messages
            $found = false;
            foreach ($messages as $msg) {
                if ($msg['id'] === $lastId) {
                    $found = true;
                    continue;
                }
                if ($found) {
                    // 添加作者信息
                    $msg['author'] = [
                        'id' => $msg['user_id'] ?? '',
                        'username' => $msg['username'] ?? '用户'
                    ];
                    $newMessages[] = $msg;
                }
            }
        } else {
            // 第一次连接，返回最后10条
            $recent = array_slice($messages, -10);
            foreach ($recent as $msg) {
                $msg['author'] = [
                    'id' => $msg['user_id'] ?? '',
                    'username' => $msg['username'] ?? '用户'
                ];
                $newMessages[] = $msg;
            }
        }

        if (!empty($newMessages)) {
            break;
        }

        // 等0.2秒再查
        usleep(200000);
    }

    jsonout(true, $newMessages);
}

// ========== 在线用户 ==========

// 心跳接口
if ($path === 'heartbeat' && $method === 'POST') {
    $username = $data['username'] ?? '';

    if ($username) {
        $online = readJsonFile(ONLINE_FILE, []);

        // 更新或添加用户
        $online[$username] = [
            'username' => $username,
            'last_seen' => time()
        ];

        // 清理超过5秒没更新的用户
        foreach ($online as $name => $info) {
            if (time() - $info['last_seen'] > 5) {
                unset($online[$name]);
            }
        }

        if (writeJsonFile(ONLINE_FILE, $online)) {
            jsonout(true);
        } else {
            jsonout(false, null, '心跳更新失败');
        }
    }
    jsonout(false, null, '需要用户名');
}

// 获取在线用户列表
if ($path === 'online_users' && $method === 'GET') {
    $online = readJsonFile(ONLINE_FILE, []);

    // 再次检查超时5s
    foreach ($online as $name => $info) {
        if (time() - $info['last_seen'] > 5) {
            unset($online[$name]);
        }
    }

    // 重新保存清理后的列表
    writeJsonFile(ONLINE_FILE, $online);

    // 获取用户角色信息
    $users = readJsonFile(USERS_FILE, []);
    $userRoles = [];
    foreach ($users as $u) {
        $userRoles[$u['username']] = $u['role'] ?? 'user';
    }

    // 返回用户列表（包含角色）
    $result = [];
    foreach ($online as $name => $info) {
        $result[] = [
            'username' => $name,
            'last_seen' => $info['last_seen'],
            'role' => $userRoles[$name] ?? 'user'
        ];
    }

    jsonout(true, $result);
}

// ========== 用户角色管理 ==========

// 获取所有用户列表（需要管理员权限）
if ($path === 'users' && $method === 'GET') {
    $users = readJsonFile(USERS_FILE);
    
    // 从请求参数或 body 获取用户名
    $username = $_GET['username'] ?? ($data['username'] ?? '');
    
    // 查找用户并检查权限
    $isAdmin = false;
    foreach ($users as $u) {
        if ($u['username'] === $username && ($u['role'] ?? 'user') === 'admin') {
            $isAdmin = true;
            break;
        }
    }

    if (!$isAdmin) {
        jsonout(false, ['username' => $username], '没有权限访问');
    }

    // 返回用户列表（不包含密码和token）
    $userList = [];
    foreach ($users as $u) {
        $userList[] = [
            'id' => $u['id'],
            'username' => $u['username'],
            'email' => $u['email'],
            'role' => $u['role'] ?? 'user',
            'created_at' => $u['created_at'] ?? ''
        ];
    }

    jsonout(true, $userList);
}

// 设置用户角色（需要管理员权限）
if ($path === 'users/role' && $method === 'POST') {
    $users = readJsonFile(USERS_FILE);
    
    // 从请求中获取当前用户名
    $currentUsername = $data['_currentUser'] ?? '';
    
    // 检查是否是管理员
    $currentUser = null;
    foreach ($users as $u) {
        if ($u['username'] === $currentUsername) {
            $currentUser = $u;
            break;
        }
    }

    if (!$currentUser || ($currentUser['role'] ?? 'user') !== 'admin') {
        jsonout(false, null, '没有权限执行此操作（需要管理员权限）');
    }

    $targetUsername = $data['username'] ?? '';
    $newRole = $data['role'] ?? '';

    if (!$targetUsername || !$newRole) {
        jsonout(false, null, '请提供用户名和角色');
    }

    // 验证角色值
    if (!in_array($newRole, ['admin', 'user'])) {
        jsonout(false, null, '无效的角色');
    }

    // 查找并更新用户角色
    $found = false;
    foreach ($users as &$u) {
        if ($u['username'] === $targetUsername) {
            // 不能修改自己的角色
            if ($u['id'] === $currentUser['id']) {
                jsonout(false, null, '不能修改自己的角色');
            }
            $u['role'] = $newRole;
            $found = true;
            break;
        }
    }

    if (!$found) {
        jsonout(false, null, '用户不存在');
    }

    if (writeJsonFile(USERS_FILE, $users)) {
        jsonout(true, ['username' => $targetUsername, 'role' => $newRole], '角色已更新');
    } else {
        jsonout(false, null, '更新失败，请稍后重试');
    }
}

// ========== 清除频道消息（管理员权限）==========

// ========== 删除用户（管理员权限）==========

// 删除用户
if (preg_match('#^users/delete$#', $path) && $method === 'DELETE') {
    $users = readJsonFile(USERS_FILE);
    
    // 从请求中获取当前用户名
    $currentUsername = $data['_currentUser'] ?? '';

    // 检查是否是管理员
    $currentUser = null;
    foreach ($users as $u) {
        if ($u['username'] === $currentUsername) {
            $currentUser = $u;
            break;
        }
    }

    if (!$currentUser || ($currentUser['role'] ?? 'user') !== 'admin') {
        jsonout(false, null, '没有权限执行此操作（需要管理员权限）');
    }

    $targetUsername = $data['username'] ?? '';

    if (!$targetUsername) {
        jsonout(false, null, '请提供用户名');
    }

    // 不能删除自己
    if ($targetUsername === $currentUser['username']) {
        jsonout(false, null, '不能删除自己的账户');
    }

    // 查找并删除用户
    $found = false;
    $newUsers = [];
    foreach ($users as $u) {
        if ($u['username'] === $targetUsername) {
            $found = true;
        } else {
            $newUsers[] = $u;
        }
    }

    if (!$found) {
        jsonout(false, null, '用户不存在');
    }

    if (writeJsonFile(USERS_FILE, $newUsers)) {
        // 将被踢用户添加到 kicked.json
        $kicked = readJsonFile(KICKED_FILE);
        $kicked[] = [
            'username' => $targetUsername,
            'kicked_at' => time()
        ];
        writeJsonFile(KICKED_FILE, $kicked);
        
        jsonout(true, ['username' => $targetUsername], '用户已删除');
    } else {
        jsonout(false, null, '删除失败，请稍后重试');
    }
}

// ========== 检查是否被踢出 ==========

// 检查用户是否被踢出
if ($path === 'auth/check_kicked' && $method === 'GET') {
    $username = $_GET['username'] ?? '';
    
    if (empty($username)) {
        jsonout(false, null, '未提供用户名');
    }
    
    $kicked = readJsonFile(KICKED_FILE);
    
    foreach ($kicked as $k) {
        if ($k['username'] === $username) {
            // 找到被踢记录，从列表中移除（一次性检查）
            $newKicked = [];
            foreach ($kicked as $item) {
                if ($item['username'] !== $username) {
                    $newKicked[] = $item;
                }
            }
            writeJsonFile(KICKED_FILE, $newKicked);
            
            jsonout(true, ['kicked' => true], '您已被管理员踢出');
        }
    }
    
    jsonout(true, ['kicked' => false]);
}

// ========== 管理员注册用户 ==========

if ($path === 'admin/register' && $method === 'POST') {
    $users = readJsonFile(USERS_FILE);
    
    // 从请求中获取当前用户名
    $currentUsername = $data['_currentUser'] ?? '';

    // 检查是否是管理员
    $currentUser = null;
    foreach ($users as $u) {
        if ($u['username'] === $currentUsername) {
            $currentUser = $u;
            break;
        }
    }

    if (!$currentUser || ($currentUser['role'] ?? 'user') !== 'admin') {
        jsonout(false, null, '没有权限执行此操作（需要管理员权限）');
    }

    $email = $data['email'] ?? '';
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? 'user';

    // 验证参数
    if (!$email || !$username || !$password) {
        jsonout(false, null, '请填写所有字段');
    }

    if (!in_array($role, ['admin', 'user'])) {
        jsonout(false, null, '角色只能是 admin 或 user');
    }

    // 检查邮箱和用户名是否已存在
    foreach ($users as $u) {
        if ($u['email'] === $email) jsonout(false, null, '邮箱已存在');
        if ($u['username'] === $username) jsonout(false, null, '用户名已存在');
    }

    $id = 'u' . time() . rand(100, 999);
    $token = md5($id . time() . rand());

    $newUser = [
        'id' => $id,
        'email' => $email,
        'username' => $username,
        'password' => md5($password),
        'token' => $token,
        'role' => $role,
        'created_at' => date('Y-m-d H:i:s')
    ];

    $users[] = $newUser;
    if (writeJsonFile(USERS_FILE, $users)) {
        jsonout(true, [
            'user' => [
                'id' => $id,
                'username' => $username,
                'email' => $email,
                'role' => $role
            ]
        ], '用户注册成功');
    } else {
        jsonout(false, null, '注册失败，请稍后重试');
    }
}

// ========== 禁言管理 ==========

// 禁言用户
if ($path === 'mute/add' && $method === 'POST') {
    $users = readJsonFile(USERS_FILE);
    
    // 从请求中获取当前用户名
    $currentUsername = $data['_currentUser'] ?? '';

    // 检查是否是管理员
    $currentUser = null;
    foreach ($users as $u) {
        if ($u['username'] === $currentUsername) {
            $currentUser = $u;
            break;
        }
    }

    if (!$currentUser || ($currentUser['role'] ?? 'user') !== 'admin') {
        jsonout(false, null, '没有权限执行此操作（需要管理员权限）');
    }

    $targetUsername = $data['username'] ?? '';
    $duration = $data['duration'] ?? 0; // 秒数，-1 表示永久

    if (!$targetUsername) {
        jsonout(false, null, '请提供用户名');
    }

    // 不能禁言自己
    if ($targetUsername === $currentUser['username']) {
        jsonout(false, null, '不能禁言自己');
    }

    // 检查用户是否存在
    $userExists = false;
    foreach ($users as $u) {
        if ($u['username'] === $targetUsername) {
            $userExists = true;
            break;
        }
    }

    if (!$userExists) {
        jsonout(false, null, '用户不存在');
    }

    // 添加禁言记录
    $muted = readJsonFile(MUTE_FILE);
    
    // 计算解除时间
    $unmuteTime = $duration === -1 ? -1 : time() + $duration;
    
    // 检查是否已被禁言，如果是则更新
    $found = false;
    foreach ($muted as &$m) {
        if ($m['username'] === $targetUsername) {
            $m['unmute_time'] = $unmuteTime;
            $m['muted_by'] = $currentUser['username'];
            $m['muted_at'] = time();
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        $muted[] = [
            'username' => $targetUsername,
            'unmute_time' => $unmuteTime,
            'muted_by' => $currentUser['username'],
            'muted_at' => time()
        ];
    }

    if (writeJsonFile(MUTE_FILE, $muted)) {
        jsonout(true, ['username' => $targetUsername, 'unmute_time' => $unmuteTime], '用户已被禁言');
    } else {
        jsonout(false, null, '禁言失败，请稍后重试');
    }
}

// 解除禁言
if ($path === 'mute/remove' && $method === 'POST') {
    $users = readJsonFile(USERS_FILE);
    
    // 从请求中获取当前用户名
    $currentUsername = $data['_currentUser'] ?? '';

    // 检查是否是管理员
    $currentUser = null;
    foreach ($users as $u) {
        if ($u['username'] === $currentUsername) {
            $currentUser = $u;
            break;
        }
    }

    if (!$currentUser || ($currentUser['role'] ?? 'user') !== 'admin') {
        jsonout(false, null, '没有权限执行此操作（需要管理员权限）');
    }

    $targetUsername = $data['username'] ?? '';

    if (!$targetUsername) {
        jsonout(false, null, '请提供用户名');
    }

    $muted = readJsonFile(MUTE_FILE);
    $found = false;
    $newMuted = [];

    foreach ($muted as $m) {
        if ($m['username'] === $targetUsername) {
            $found = true;
        } else {
            $newMuted[] = $m;
        }
    }

    if (!$found) {
        jsonout(false, null, '该用户未被禁言');
    }

    if (writeJsonFile(MUTE_FILE, $newMuted)) {
        jsonout(true, ['username' => $targetUsername], '已解除禁言');
    } else {
        jsonout(false, null, '解除禁言失败，请稍后重试');
    }
}

// 获取禁言列表
if ($path === 'mute/list' && $method === 'GET') {
    $users = readJsonFile(USERS_FILE);
    
    // 从请求中获取当前用户名
    $currentUsername = $_GET['username'] ?? '';

    // 检查是否是管理员
    $currentUser = null;
    foreach ($users as $u) {
        if ($u['username'] === $currentUsername) {
            $currentUser = $u;
            break;
        }
    }

    if (!$currentUser || ($currentUser['role'] ?? 'user') !== 'admin') {
        jsonout(false, null, '没有权限执行此操作（需要管理员权限）');
    }

    $muted = readJsonFile(MUTE_FILE);
    $now = time();
    
    // 过滤掉已过期的禁言
    $activeMuted = [];
    foreach ($muted as $m) {
        if ($m['unmute_time'] === -1 || $m['unmute_time'] > $now) {
            $activeMuted[] = $m;
        }
    }

    jsonout(true, $activeMuted);
}

// 检查用户是否被禁言
if ($path === 'mute/check' && $method === 'GET') {
    $username = $_GET['username'] ?? '';
    
    if (empty($username)) {
        jsonout(false, null, '未提供用户名');
    }
    
    $muted = readJsonFile(MUTE_FILE);
    $now = time();
    
    // 清理过期的禁言记录，同时检查目标用户
    $validMuted = [];
    $isMuted = false;
    $unmuteTime = 0;
    
    foreach ($muted as $m) {
        // 永久禁言或未过期
        if ($m['unmute_time'] === -1 || $m['unmute_time'] > $now) {
            $validMuted[] = $m;
            
            // 检查是否是目标用户
            if ($m['username'] === $username) {
                $isMuted = true;
                $unmuteTime = $m['unmute_time'];
            }
        }
        // 过期的记录不加入 validMuted，自动清理
    }
    
    // 如果清理了过期记录，更新文件
    if (count($validMuted) !== count($muted)) {
        writeJsonFile(MUTE_FILE, $validMuted);
    }
    
    if ($isMuted) {
        jsonout(true, [
            'muted' => true,
            'unmute_time' => $unmuteTime
        ]);
    }
    
    jsonout(true, ['muted' => false]);
}

// 404
jsonout(false, null, '接口不存在');
?>