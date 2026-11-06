<?php
declare(strict_types=1);
function visit_record(): void {
    if(preg_match('/bot|spider|crawler|headless/i',$_SERVER['HTTP_USER_AGENT']??''))return;
    // A classroom may share one public IP address.
    rate_limit('visits',$_SERVER['REMOTE_ADDR']??'unknown',3000,3600);
    $id=$_COOKIE['akademiya_visitor']??'';
    if(!preg_match('/^[a-f0-9]{64}$/',$id)){$id=bin2hex(random_bytes(32));setcookie('akademiya_visitor',$id,['expires'=>time()+31536000,'path'=>'/','secure'=>configuration()['environment']!=='local','httponly'=>false,'samesite'=>'Lax']);}
    $hash=hash_hmac('sha256',$id,configuration()['secret']);$day=(new DateTimeImmutable('now',new DateTimeZone(configuration()['reports']['timezone'])))->format('Y-m-d');
    $existing=query('SELECT visitor_hash FROM visits WHERE visitor_hash=? AND visit_day=?',[$hash,$day])->fetch();
    if(!$existing){try{query('INSERT INTO visits (visitor_hash,visit_day) VALUES (?,?)',[$hash,$day]);}catch(PDOException $e){if($e->getCode()!=='23000')throw $e;}}
}
function period_stats(string $start,string $end): array {
    return query('SELECT COUNT(DISTINCT visitor_hash) AS visitors FROM visits WHERE visit_day>=? AND visit_day<?',[$start,$end])->fetch();
}
function build_report(string $kind,?DateTimeImmutable $now=null): array {
    $zone=new DateTimeZone(configuration()['reports']['timezone']);$now=($now??new DateTimeImmutable('now',$zone))->setTimezone($zone);$today=$now->setTime(0,0);
    if($kind==='daily'){$start=$today->modify('-1 day');$end=$today;$title='Посещаемость за '.$start->format('d.m.Y');$key='daily:'.$start->format('Y-m-d');}
    elseif($kind==='monthly'){$end=$today->modify('first day of this month');$start=$end->modify('-1 month');$title='Посещаемость за '.$start->format('m.Y');$key='monthly:'.$start->format('Y-m');}
    else throw new InvalidArgumentException('Укажите daily или monthly.');
    $stats=period_stats($start->format('Y-m-d'),$end->format('Y-m-d'));
    $body=$title."\nЧасовой пояс: ".$zone->getName()."\n\nУникальные посетители (браузеры): ".$stats['visitors']."\n";
    if($kind==='daily'){$month=period_stats($start->modify('first day of this month')->format('Y-m-d'),$end->format('Y-m-d'));$body.="\nС начала отчётного месяца: ".$month['visitors']." уникальных посетителей.\n";}
    $body.="\nПосетитель определяется по случайному идентификатору cookie. Повторные заходы одного браузера не увеличивают число уникальных посетителей за выбранный период. Один человек с разных устройств или после очистки cookie может учитываться несколько раз. Известные поисковые роботы исключены.\n\nАКАДЕМИЯ — практика кириллицы.";
    return ['key'=>$key,'subject'=>'АКАДЕМИЯ — '.$title,'body'=>$body];
}
function deliver_report(string $kind): string {
    $recipient=configuration()['reports']['recipient']??'';if(!filter_var($recipient,FILTER_VALIDATE_EMAIL))throw new RuntimeException('Сначала укажите reports.recipient в закрытом config.php.');
    $report=build_report($kind);$pdo=database();$pdo->beginTransaction();
    try{
        $row=query('SELECT * FROM report_deliveries WHERE report_key=?'.locking(),[$report['key']])->fetch();
        if($row&&($row['status']==='sent'||($row['status']==='pending'&&(int)$row['claimed_at']>time()-600))){$pdo->commit();return 'already processed';}
        if($row)query('UPDATE report_deliveries SET status=?,claimed_at=? WHERE report_key=?',['pending',time(),$report['key']]);
        else query('INSERT INTO report_deliveries (report_key,status,claimed_at) VALUES (?,?,?)',[$report['key'],'pending',time()]);
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    try{send_message($recipient,$report['subject'],$report['body']);query('UPDATE report_deliveries SET status=?,sent_at=? WHERE report_key=?',['sent',time(),$report['key']]);}
    catch(Throwable $e){query('UPDATE report_deliveries SET status=? WHERE report_key=?',['failed',$report['key']]);throw $e;}
    return 'queued';
}
