<?php
declare(strict_types=1);
header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');header('Referrer-Policy: no-referrer');
require dirname(__DIR__,2).'/private/bootstrap.php';
require dirname(__DIR__,2).'/private/reports.php';
try{
    session_boot();$action=$_GET['action']??'';$method=$_SERVER['REQUEST_METHOD'];
    if($method==='GET'&&$action==='session')respond(['csrf'=>$_SESSION['csrf']]);
    if($action!=='visit')throw new ApiError('Страница не найдена.',404);
    if($method!=='POST')throw new ApiError('Метод не поддерживается.',405);
    csrf_check();$input=request_body();
    if($action==='visit'){visit_record();respond(['ok'=>true]);}
}catch(ApiError $e){respond(['error'=>$e->getMessage()],$e->status);}
catch(Throwable $e){error_log('Kerning API failure: '.get_class($e));respond(['error'=>'Сервис временно недоступен. Повторите позже.'],503);}
