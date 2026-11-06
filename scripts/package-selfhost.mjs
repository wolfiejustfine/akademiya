import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const out=path.join(root,'artifacts','spaceweb');
await fs.mkdir(path.join(out,'public_html','api'),{recursive:true});
await fs.mkdir(path.join(out,'private'),{recursive:true});
await fs.cp(path.join(root,'dist'),path.join(out,'public_html'),{recursive:true});
// The owner's final domain will be supplied during installation.
const htmlPath=path.join(out,'public_html','index.html');
await fs.writeFile(htmlPath,(await fs.readFile(htmlPath,'utf8')).replace(/^.*(?:rel="canonical"|property="og:url").*\r?\n/gm,''));
for(const entry of await fs.readdir(path.join(root,'server'))){if(entry==='config.php')continue;await fs.cp(path.join(root,'server',entry),path.join(out,'private',entry),{recursive:true});}
await fs.copyFile(path.join(root,'web-api','index.php'),path.join(out,'public_html','api','index.php'));
await fs.writeFile(path.join(out,'public_html','config.js'),"window.KERNING_CONFIG=Object.freeze({analytics:true,api:'./api/index.php'});\n");
// Remove only named obsolete files in this generated package, never user data.
for(const name of ['public_html/account.js','public_html/style.css','private/auth.php','private/progress.php','private/curriculum.json']){
  const target=path.resolve(out,name);
  if(!target.startsWith(out+path.sep))throw new Error('Invalid package cleanup path');
  try{const stat=await fs.stat(target);if(stat.isFile())await fs.unlink(target);}catch(error){if(error.code!=='ENOENT')throw error;}
}
await fs.writeFile(path.join(out,'public_html','.htaccess'),`Options -Indexes\n<FilesMatch "\\.(?:sql|log|ini|env|bak)$">\nRequire all denied\n</FilesMatch>\n<IfModule mod_headers.c>\nHeader always set X-Content-Type-Options "nosniff"\nHeader always set Referrer-Policy "no-referrer"\nHeader always set X-Frame-Options "SAMEORIGIN"\n</IfModule>\n`);
await fs.copyFile(path.join(root,'SELF_HOSTING.md'),path.join(out,'Установка.md'));
console.log(JSON.stringify({directory:out,levels:18,registration:false,analytics:true}));
