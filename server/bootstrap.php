<?php
declare(strict_types=1);

function configuration(): array {
    static $config;
    if ($config !== null) return $config;
    $file = getenv('KERNING_CONFIG') ?: __DIR__ . '/config.php';
    if (!is_file($file)) throw new RuntimeException('Сервер ещё не настроен.');
    $config = require $file;
    if (strlen($config['secret'] ?? '') < 32) throw new RuntimeException('Не задан секрет сервера.');
    $url = parse_url($config['base_url'] ?? '');
    if (!$url || !isset($url['host']) || !in_array($url['scheme'] ?? '', ['http', 'https'], true)) throw new RuntimeException('Неверный адрес сервиса.');
    if (($config['environment'] ?? '') !== 'local' && $url['scheme'] !== 'https') throw new RuntimeException('Для рабочей версии требуется HTTPS.');
    return $config;
}
function database(): PDO {
    static $pdo;
    if ($pdo) return $pdo;
    $db = configuration()['database'];
    $pdo = new PDO($db['dsn'], $db['username'] ?? null, $db['password'] ?? null, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    else $pdo->exec('PRAGMA foreign_keys=ON');
    return $pdo;
}
function query(string $sql, array $args = []): PDOStatement {
    $stmt=database()->prepare($sql);$stmt->execute($args);return $stmt;
}
function locking(): string {return database()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?' FOR UPDATE':'';}
function respond(array $data, int $status=200): never {
    http_response_code($status);header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;
}
class ApiError extends RuntimeException {
    public function __construct(string $message, public int $status=400){parent::__construct($message);}
}
function session_boot(): void {
    $config=configuration();
    ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');ini_set('session.gc_maxlifetime','86400');
    session_name('akademiya_session');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$config['environment']!=='local','httponly'=>true,'samesite'=>'Lax']);
    session_start();
    if (isset($_SESSION['last_activity']) && time()-$_SESSION['last_activity']>86400) {$_SESSION=[];session_regenerate_id(true);}
    $_SESSION['last_activity']=time();$_SESSION['csrf']??=bin2hex(random_bytes(32));
}
function csrf_check(): void {
    $token=$_SERVER['HTTP_X_CSRF_TOKEN']??'';
    if (!is_string($token) || !hash_equals($_SESSION['csrf'],$token)) throw new ApiError('Обновите страницу и попробуйте снова.',403);
    $origin=$_SERVER['HTTP_ORIGIN']??null;
    $url=parse_url(configuration()['base_url']);
    $expected=$url['scheme'].'://'.$url['host'].(isset($url['port'])?':'.$url['port']:'');
    if ($origin!==null && $origin!==$expected) throw new ApiError('Недопустимый источник запроса.',403);
}
function request_body(): array {
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>2000000) throw new ApiError('Слишком большой запрос.',413);
    if (!str_starts_with($_SERVER['CONTENT_TYPE']??'','application/json')) throw new ApiError('Ожидается JSON.',415);
    $raw=file_get_contents('php://input',false,null,0,2000001);
    if (strlen($raw)>2000000) throw new ApiError('Слишком большой запрос.',413);
    try {$value=json_decode($raw,true,64,JSON_THROW_ON_ERROR);}catch(JsonException){throw new ApiError('Некорректный запрос.');}
    if(!is_array($value))throw new ApiError('Некорректный запрос.');return $value;
}
function rate_limit(string $scope, string $subject, int $limit, int $seconds): void {
    $bucket=hash_hmac('sha256',$scope.':'.$subject,configuration()['secret']);$window=intdiv(time(),$seconds)*$seconds;
    $update=query('UPDATE request_limits SET hits=hits+1 WHERE bucket=? AND window_start=?',[$bucket,$window]);
    if(!$update->rowCount())try{query('INSERT INTO request_limits (bucket,window_start,hits) VALUES (?,?,1)',[$bucket,$window]);}catch(PDOException $e){if(!in_array($e->getCode(),['23000','23505'],true))throw $e;query('UPDATE request_limits SET hits=hits+1 WHERE bucket=? AND window_start=?',[$bucket,$window]);}
    $hits=(int)query('SELECT hits FROM request_limits WHERE bucket=? AND window_start=?',[$bucket,$window])->fetchColumn();
    if($hits>$limit)throw new ApiError('Слишком много попыток. Попробуйте позже.',429);
}
function send_message(string $recipient,string $subject,string $body): void {
    $config=configuration();$from=$config['mail']['from']??'';
    if(!filter_var($recipient,FILTER_VALIDATE_EMAIL)||!filter_var($from,FILTER_VALIDATE_EMAIL))throw new RuntimeException('Не настроен почтовый адрес.');
    if(($config['mail']['transport']??'mail')==='file'){
        if($config['environment']!=='local')throw new RuntimeException('Локальная почта запрещена в рабочем режиме.');
        $dir=$config['mail']['outbox'];if(!is_dir($dir))mkdir($dir,0700,true);
        file_put_contents($dir.'/'.bin2hex(random_bytes(12)).'.json',json_encode(compact('recipient','subject','body'),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),LOCK_EX);return;
    }
    $subject='=?UTF-8?B?'.base64_encode($subject).'?=';
    $headers=['From'=>'=?UTF-8?B?'.base64_encode('АКАДЕМИЯ').'?= <'.$from.'>','MIME-Version'=>'1.0','Content-Type'=>'text/plain; charset=UTF-8','Content-Transfer-Encoding'=>'base64'];
    if(!mail($recipient,$subject,chunk_split(base64_encode($body)), $headers, '-f'.escapeshellarg($from)))throw new RuntimeException('Почтовый сервер не принял письмо.');
}
