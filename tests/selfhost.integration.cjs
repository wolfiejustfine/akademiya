const assert=require('node:assert/strict');
const {request}=require('playwright');
(async()=>{
 const api=await request.newContext({baseURL:'http://127.0.0.1:4318',userAgent:'Mozilla/5.0 Akademiya-local-check'});
 const session=await(await api.get('/api/index.php?action=session')).json();
 assert.ok(session.csrf);assert.equal('user' in session,false);
 const html=await(await api.get('/')).text();assert.ok(html.includes('press.css'));assert.ok(!html.includes('account.js'));assert.ok(!html.includes('type="password"'));
 assert.equal((await api.post('/api/index.php?action=visit',{data:{}})).status(),403);
 for(const action of ['register','login','forgot','reset','progress','restart-progress','dev-mail']){
  const response=await api.post('/api/index.php?action='+action,{data:{}});assert.equal(response.status(),404,action);
 }
 const obsolete=await api.get('/account.js');
 // PHP's local static server may fall back to index.html for a missing file.
 assert.ok(obsolete.status()===404||(obsolete.headers()['content-type']||'').includes('text/html'));
 assert.ok(!(await obsolete.text()).includes('KerningAccount'));
 for(let i=0;i<2;i++)assert.equal((await api.post('/api/index.php?action=visit',{headers:{'X-CSRF-Token':session.csrf},data:{}})).status(),200);
 const cookies=(await api.storageState()).cookies;const visitor=cookies.find(c=>c.name==='akademiya_visitor');
 assert.match(visitor.value,/^[a-f0-9]{64}$/);assert.equal(visitor.sameSite,'Lax');
 assert.ok(visitor.expires-Date.now()/1000>300*86400);
 const before=visitor.value;await api.post('/api/index.php?action=visit',{headers:{'X-CSRF-Token':session.csrf},data:{}});
 assert.equal((await api.storageState()).cookies.find(c=>c.name==='akademiya_visitor').value,before);
 await api.dispose();console.log('PASS: no registration routes or assets; anonymous session exposes no user; CSRF enforced; stable year-long visitor cookie and repeated visits.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
