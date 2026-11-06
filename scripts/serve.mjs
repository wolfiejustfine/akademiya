import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const server = http.createServer((req,res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch {res.writeHead(400).end();return;}
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) {res.writeHead(403).end();return;}
  fs.stat(file,(err,stat)=>{
    if(err || !stat.isFile()){res.writeHead(404).end('Не найдено');return;}
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(Number(process.env.PORT || 4317), '127.0.0.1',()=>console.log('Local: http://127.0.0.1:' + server.address().port));
