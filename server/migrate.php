<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/bootstrap.php';
try{
    // Initial installation only. Never drops or replaces an existing schema.
    $sql=file_get_contents(__DIR__.'/schema.sql');
    foreach(array_filter(array_map('trim',explode(';',$sql))) as $statement)database()->exec($statement);
    echo "Database tables created.\n";
}catch(Throwable $e){fwrite(STDERR,'Migration failed; preserve existing tables and inspect the database. '.get_class($e)."\n");exit(1);}
