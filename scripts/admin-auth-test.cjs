const assert=require('node:assert/strict');
const path=require('node:path');
const compiled=path.join(process.cwd(),'.admin-test-build');
const auth=require(path.join(compiled,'admin-auth'));
const guard=require(path.join(compiled,'admin-guard'));
const SITE='https://nangman-hanjul.netlify.app';
const SECRET='a'.repeat(32);
process.env.NANGMAN_PUBLIC_URL=SITE;
const req=(url,init={})=>new Request(url,init);

// 설정이 없거나 짧으면 인증 자체를 열지 않는다
process.env.OFFICE_ADMIN_PASSWORD='';
assert.equal(auth.adminConfigured(),false);
process.env.OFFICE_ADMIN_PASSWORD='short-but-not-enough';
assert.equal(auth.adminSecret(),'',`${auth.MIN_ADMIN_SECRET}자 미만은 거절해야 합니다.`);
assert.equal(auth.adminConfigured(),false);
process.env.OFFICE_ADMIN_PASSWORD=SECRET;
assert.equal(auth.adminConfigured(),true);
assert.equal(auth.MIN_ADMIN_SECRET,24);

// 받는 호스트: 내 PC 와 정식 사이트. 그 밖은 거절
assert.equal(auth.adminOrigin(req('http://localhost:3000/api/office')),true);
assert.equal(auth.adminOrigin(req('http://127.0.0.1:3000/api/office')),true);
assert.equal(auth.adminOrigin(req(SITE+'/api/office')),true);
assert.equal(auth.adminOrigin(req('https://evil.example.com/api/office')),false);
// Netlify 가 Host 헤더로 실제 호스트를 전하므로 그것을 기준으로 본다
assert.equal(auth.adminOrigin(req('http://internal/api/office',{headers:{host:'nangman-hanjul.netlify.app'}})),true);
assert.equal(auth.adminOrigin(req('http://internal/api/office',{headers:{host:'attacker.example.com'}})),false);

// 쓰기 요청은 같은 출처에서만
const post=(origin)=>req(SITE+'/api/office',{method:'POST',headers:origin?{origin,host:'nangman-hanjul.netlify.app'}:{host:'nangman-hanjul.netlify.app'}});
assert.equal(auth.adminOrigin(post(SITE)),true);
assert.equal(auth.adminOrigin(post('https://evil.example.com')),false);
assert.equal(auth.adminOrigin(post(null)),false,'Origin 없는 쓰기 요청은 거절해야 합니다.');

// 비밀번호 비교
assert.equal(auth.validPassword(SECRET,SECRET),true);
assert.equal(auth.validPassword('a'.repeat(31),SECRET),false);
assert.equal(auth.validPassword(SECRET+'x',SECRET),false);
assert.equal(auth.validPassword(undefined,SECRET),false);
assert.equal(auth.validPassword(SECRET,'short'),false);

// 세션 쿠키
const secure=auth.sessionCookie(SECRET,true);
assert(secure.includes('HttpOnly')&&secure.includes('SameSite=Strict')&&secure.includes('Secure'));
assert(!auth.sessionCookie(SECRET,false).includes('Secure'));
assert(auth.clearedCookie(true).includes('Max-Age=0'));
const value=secure.split(';')[0];
const signed=(cookie,url=SITE+'/api/office')=>req(url,{headers:{cookie,host:'nangman-hanjul.netlify.app'}});
assert.equal(auth.authenticated(signed(value),SECRET),true);
assert.equal(auth.authenticated(signed(value),'b'.repeat(32)),false,'다른 비밀번호로 서명한 쿠키는 거절해야 합니다.');
assert.equal(auth.authenticated(signed(''),SECRET),false);
assert.equal(auth.authenticated(signed('nangman_admin_session=1.2'),SECRET),false);
// 다른 호스트에서는 유효한 쿠키여도 통하지 않는다
assert.equal(auth.authenticated(req('https://evil.example.com/api/office',{headers:{cookie:value,host:'evil.example.com'}}),SECRET),false);
// 만료된 쿠키
const old=String(Date.now()-1000);
const crypto=require('node:crypto');
const expired='nangman_admin_session='+old+'.'+crypto.createHmac('sha256',SECRET).update(old).digest('hex');
assert.equal(auth.authenticated(signed(expired),SECRET),false);

// HTTPS 판정은 전달 헤더를 먼저 본다
assert.equal(auth.secureRequest(req('http://internal/x',{headers:{'x-forwarded-proto':'https'}})),true);
assert.equal(auth.secureRequest(req('http://internal/x',{headers:{'x-forwarded-proto':'http,https'}})),false);
assert.equal(auth.secureRequest(req('https://nangman-hanjul.netlify.app/x')),true);

// 시도 제한: 같은 곳에서 5회 실패하면 막히고, 성공하면 풀린다
(async()=>{
 const from=ip=>req(SITE+'/api/office',{method:'POST',headers:{origin:SITE,host:'nangman-hanjul.netlify.app','x-nf-client-connection-ip':ip}});
 assert.equal(await guard.blockedFor(from('1.1.1.1')),0);
 for(let i=0;i<guard.MAX_HOST_FAILURES-1;i++)await guard.recordFailure(from('1.1.1.1'));
 assert.equal(await guard.blockedFor(from('1.1.1.1')),0,'마지막 한 번 전까지는 막지 않습니다.');
 await guard.recordFailure(from('1.1.1.1'));
 const wait=await guard.blockedFor(from('1.1.1.1'));
 assert(wait>0&&wait<=guard.BLOCK_MS,'5회 실패하면 막아야 합니다.');
 assert.equal(await guard.blockedFor(from('2.2.2.2')),0,'다른 곳의 시도까지 막지는 않습니다.');
 // 차단 시간이 지나면 풀린다
 assert.equal(await guard.blockedFor(from('1.1.1.1'),Date.now()+guard.BLOCK_MS+1),0);
 await guard.clearFailures(from('1.1.1.1'));
 assert.equal(await guard.blockedFor(from('1.1.1.1')),0,'성공하면 기록을 지웁니다.');
 // 전체 한도: 여러 곳에서 나눠 시도해도 결국 막힌다
 for(let i=0;i<guard.MAX_TOTAL_FAILURES;i++)await guard.recordFailure(from('10.0.0.'+(i%200)));
 assert((await guard.blockedFor(from('9.9.9.9')))>0,'전체 한도를 넘으면 모두 막아야 합니다.');
 // 저장소가 늦어도 로그인이 멈추지 않도록 시간 제한이 걸려 있다
 assert.equal(typeof guard.GUARD_TIMEOUT_MS,'number');
 assert(guard.GUARD_TIMEOUT_MS>0&&guard.GUARD_TIMEOUT_MS<=5000,'저장소 대기는 함수 제한시간보다 짧아야 합니다.');
 console.log('PASS admin secret length floor, host and origin checks, password comparison, signed session cookie with Secure, expiry and cross-host rejection, forwarded protocol, per-host and total lockout.');
})().catch(error=>{console.error(error);process.exitCode=1;});
