import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const output=path.resolve(process.argv[2] || path.join(root,'artifacts','github','akademiya'));
if(output===root || root.startsWith(output+path.sep))throw new Error('Choose a separate destination.');
try{await fs.stat(output);throw new Error('Destination already exists; choose a new directory.');}
catch(error){if(error.code!=='ENOENT')throw error;}

// Export the current source snapshot, without local preview metadata or history.
const entries=['.gitignore','.gitattributes','.github','README.md','DESIGN.md','QA.md',
  'SELF_HOSTING.md','THIRD_PARTY_NOTICES.md','package.json','package-lock.json',
  'docs','dist','scripts','tests','web-api',
  'server/bootstrap.php','server/config.example.php','server/cron.php',
  'server/migrate.php','server/reports.php','server/schema.sql'];
const forbidden=/^(?:\.git|\.tools|\.openai|node_modules|artifacts|private|outbox|\.env(?:\..*)?|config\.php|config\.local\.php)$|\.(?:sqlite(?:3)?(?:-.*)?|db(?:-.*)?|log|pid|zip|pem|key)$/i;
const signatures=[/github_pat_[A-Za-z0-9_]{20,}/,/gh[pousr]_[A-Za-z0-9]{20,}/,
  /sk-[A-Za-z0-9_-]{20,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:password|secret|token)\s*['"]?\s*[:=]\s*['"][A-Za-z0-9+/=_-]{24,}['"]/i];
const files=[];
async function inspect(relative){
  if(relative.split('/').some(part=>forbidden.test(part)))throw new Error('Private file excluded: '+relative);
  const source=path.join(root,relative),stat=await fs.lstat(source);
  if(stat.isSymbolicLink())throw new Error('Symlinks are not exported: '+relative);
  if(stat.isDirectory()){
    for(const entry of (await fs.readdir(source)).filter(name=>name!=='__pycache__'&&!/\.py[co]$/.test(name)).sort())await inspect(relative+'/'+entry);
    return;
  }
  if(!stat.isFile())throw new Error('Unsupported file: '+relative);
  if(/\.(?:js|mjs|cjs|json|php|py|md|yml|yaml|css|html|txt|svg)$/.test(relative)){
    const content=await fs.readFile(source,'utf8');
    if(signatures.some(pattern=>pattern.test(content)))throw new Error('Review a possible credential in: '+relative);
  }
  files.push(relative);
}
for(const entry of entries)await inspect(entry);
await fs.mkdir(output,{recursive:true});
for(const relative of files){
  const destination=path.join(output,relative);
  await fs.mkdir(path.dirname(destination),{recursive:true});
  await fs.copyFile(path.join(root,relative),destination);
}
console.log(JSON.stringify({directory:output,files:files.length,history:false,localData:false}));
