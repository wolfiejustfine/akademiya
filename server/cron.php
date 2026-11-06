<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/bootstrap.php';require __DIR__.'/reports.php';
try{
    $kind=$argv[1]??'';
    if(in_array('--dry-run',$argv,true)){$report=build_report($kind);echo $report['subject']."\n\n".$report['body']."\n";}
    else echo deliver_report($kind)."\n";
    query('DELETE FROM request_limits WHERE window_start<?',[time()-172800]);
}catch(Throwable $e){fwrite(STDERR,$e->getMessage()."\n");exit(1);}
