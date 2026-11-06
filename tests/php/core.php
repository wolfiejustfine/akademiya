<?php
declare(strict_types=1);
require __DIR__.'/../../server/bootstrap.php';require __DIR__.'/../../server/reports.php';
function check(bool $condition,string $name): void {if(!$condition)throw new RuntimeException($name);echo 'PASS '.$name."\n";}
query('INSERT INTO visits (visitor_hash,visit_day) VALUES (?,?)',[str_repeat('a',64),'2026-11-05']);
query('INSERT INTO visits (visitor_hash,visit_day) VALUES (?,?)',[str_repeat('b',64),'2026-11-05']);
query('INSERT INTO visits (visitor_hash,visit_day) VALUES (?,?)',[str_repeat('a',64),'2026-11-04']);
$stats=period_stats('2026-11-01','2026-12-01');check((int)$stats['visitors']===2,'unique browsers deduplicate across the month');
$stats=period_stats('2026-11-04','2026-11-05');check((int)$stats['visitors']===1,'daily period boundaries');
$report=build_report('daily',new DateTimeImmutable('2026-11-06 09:00:00',new DateTimeZone('Europe/Moscow')));check(str_contains($report['subject'],'05.11.2026')&&str_contains($report['body'],'Уникальные посетители (браузеры): 2'),'previous day report');
check(!str_contains($report['body'],'аккаунт')&&!str_contains($report['body'],'кабинет'),'reports contain no account metrics');
$report=build_report('monthly',new DateTimeImmutable('2026-12-01 09:00:00',new DateTimeZone('Europe/Moscow')));check(str_contains($report['subject'],'11.2026'),'previous calendar month report');
check(deliver_report('daily')==='queued'&&deliver_report('daily')==='already processed','report delivery deduplication');
rate_limit('test','scope',2,60);rate_limit('test','scope',2,60);try{rate_limit('test','scope',2,60);throw new RuntimeException('Missing rate limit');}catch(ApiError $e){check($e->status===429,'public endpoint rate limit');}
echo "All anonymous reporting checks passed.\n";
