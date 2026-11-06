<?php
declare(strict_types=1);
$dir=$argv[1]??'';if(!$dir||is_dir($dir))throw new RuntimeException('Use a new test directory.');mkdir($dir,0700,true);$dir=realpath($dir);
$cfg=require __DIR__.'/../../server/config.example.php';$cfg['environment']='local';$cfg['base_url']='http://127.0.0.1:4318';$cfg['secret']=bin2hex(random_bytes(32));$cfg['database']=['dsn'=>'sqlite:'.$dir.'/database.sqlite','username'=>null,'password'=>null];$cfg['mail']=['transport'=>'file','from'=>'practice@example.test','outbox'=>$dir.'/outbox'];$cfg['reports']['recipient']='owner@example.test';
file_put_contents($dir.'/config.php',"<?php\nreturn ".var_export($cfg,true).";\n");putenv('KERNING_CONFIG='.$dir.'/config.php');
require __DIR__.'/../../server/bootstrap.php';
$sql=file_get_contents(__DIR__.'/../../server/schema.sql');$sql=preg_replace('/\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4/',')',$sql);$sql=preg_replace('/,\s*INDEX visits_day \(visit_day\)/','',$sql);
foreach(array_filter(array_map('trim',explode(';',$sql))) as $statement)database()->exec($statement);
echo "Test database initialized.\n";
