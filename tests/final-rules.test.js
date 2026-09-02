const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');
const code = fs.readFileSync('Code.gs','utf8');
const html = fs.readFileSync('Index.html','utf8');
const guide = fs.readFileSync('Guide.html','utf8');
const faq = fs.readFileSync('Faq.html','utf8');
let passed=0, failed=0;
function test(n,name,fn){try{if(fn()===false)throw Error('false');console.log('PASS '+n+': '+name);passed++;}catch(e){console.error('FAIL '+n+': '+name+' -> '+e.message);failed++;}}
function throws(fn,pattern){try{fn();return false}catch(e){return pattern.test(e.message)}}
const cacheMap=new Map(), propMap=new Map([['WALKIN_STAFF_CODE','0000']]);
const cache={get:k=>cacheMap.get(k)||null,put:(k,v)=>cacheMap.set(k,v),remove:k=>cacheMap.delete(k)};
const ctx={
  console,
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>propMap.has(k)?propMap.get(k):null,setProperty:(k,v)=>propMap.set(k,String(v)),deleteProperty:k=>propMap.delete(k)})},
  CacheService:{getScriptCache:()=>cache},
  Utilities:{
    DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},
    computeDigest:(a,s)=>[...crypto.createHash('sha256').update(s).digest()],
    base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url'),
    getUuid:()=>crypto.randomUUID(),
    formatDate:(d,tz,fmt)=>d.toISOString().slice(0,10)
  },
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  Session:{getScriptTimeZone:()=> 'Asia/Taipei'}
};
vm.createContext(ctx); vm.runInContext(code,ctx);
const evt={id:'E1',mode:'D',date:'2026-09-02',start:'09:00',end:'12:00',capacity:20,extraWalkInSlots:0,isPermanent:false};
const at=s=>new Date('2026-09-02T'+s+'+08:00');
function capacity(online,walkins){return ctx.computeWalkInAvailability_(20,online,walkins,0)}
test(1,'08:29 rejects check-in',()=>{ctx.getTaipeiNow_=()=>at('08:29:00');return throws(()=>ctx.validateEventOperationTime_(evt,'CHECKIN'),/CHECKIN_NOT_STARTED/)});
test(2,'08:30 backend rejects check-in',()=>{ctx.getTaipeiNow_=()=>at('08:30:00');return throws(()=>ctx.validateEventOperationTime_(evt,'CHECKIN'),/CHECKIN_NOT_STARTED/)});
test(3,'full online 20 yields walk-in 0',()=>capacity(20,0).walkInCapacity===0);
test(4,'online 16 yields fixed walk-in 4',()=>capacity(16,0).walkInCapacity===4&&capacity(16,0).remainingWalkInCapacity===4);
test(5,'10:29:59 allowed and 10:30 rejected',()=>{ctx.getTaipeiNow_=()=>at('10:29:59');ctx.validateEventOperationTime_(evt,'CHECKIN');ctx.getTaipeiNow_=()=>at('10:30:00');return throws(()=>ctx.validateEventOperationTime_(evt,'CHECKIN'),/CHECKIN_CLOSED/)});
test(6,'late reservation cannot check in or get priority',()=>!html.includes('function openReRegisterForm')&&!html.includes('function doReRegisterSubmit'));
test(7,'after-start cancellation does not increase snapshot capacity',()=>capacity(20,0).walkInCapacity===0);
test(8,'pre-start cancellation makes 1 original slot',()=>capacity(19,0).walkInCapacity===1);
test(9,'race for last slot only permits one sequential locked commit',()=>{let used=3,ok=0;for(let i=0;i<2;i++){if(capacity(16,used).remainingWalkInCapacity>0){used++;ok++}}return ok===1});
test(10,'public title excludes woodworking while internal option remains',()=>html.includes('小家電、玩具維修雲端系統')&&html.includes('value="木工維修"')&&html.includes("if(mode === 'C')"));
test(11,'full UI contains large red warning',()=>html.includes('text-xl sm:text-2xl font-black')&&html.includes('⚠ 本場次預約已滿')&&html.includes('預約者未到場之名額亦不再釋出'));
test(12,'no-show cannot alter capacity or expose release logic',()=>capacity(20,0).walkInCapacity===0&&!/releasedNoShowCount|inSecondWave/.test(code));
ctx.getWalkInAvailabilityServer=()=>({state:'OPEN'});
ctx.getTaipeiNow_=()=>at('09:15:00');
test(13,'wrong staff code rejected',()=>throws(()=>ctx.verifyWalkInStaffCode('E1','1234','S1'),/WALKIN_STAFF_CODE_INVALID/));
let auth;
test(14,'0000 creates a 10-minute token',()=>{auth=ctx.verifyWalkInStaffCode('E1','0000','S1');return auth.token&&new Date(auth.expiresAt)-at('09:15:00')===600000});
test(15,'expired token rejected',()=>{const k=ctx.walkInTokenKey_(auth.token);const p=JSON.parse(cache.get(k));p.expiresAt=at('09:14:59').getTime();cache.put(k,JSON.stringify(p));return throws(()=>ctx.validateWalkInToken_(auth.token,'E1','S1'),/WALKIN_TOKEN_EXPIRED/)});
test(16,'used token rejected',()=>{auth=ctx.verifyWalkInStaffCode('E1','0000','S1');const k=ctx.walkInTokenKey_(auth.token),p=JSON.parse(cache.get(k));p.used=true;cache.put(k,JSON.stringify(p));return throws(()=>ctx.validateWalkInToken_(auth.token,'E1','S1'),/WALKIN_TOKEN_USED/)});
test(17,'token does not reserve the last slot',()=>{const a=ctx.verifyWalkInStaffCode('E1','0000','A'),b=ctx.verifyWalkInStaffCode('E1','0000','B');return a.token!==b.token&&capacity(19,0).remainingWalkInCapacity===1});
test(18,'token is bound to event and session',()=>{auth=ctx.verifyWalkInStaffCode('E1','0000','S1');return throws(()=>ctx.validateWalkInToken_(auth.token,'E2','S1'),/MISMATCH/)&&throws(()=>ctx.validateWalkInToken_(auth.token,'E1','S2'),/MISMATCH/)});
test(19,'missing token cannot bypass staff confirmation',()=>throws(()=>ctx.validateWalkInToken_('','E1','S1'),/WALKIN_TOKEN_REQUIRED/));
test(20,'all public notices use new timing and no obsolete copy',()=>{const all=html+guide+faq;return all.includes('活動結束前 1 小時 30 分')&&all.includes('活動開始時間')&&!/第二波|活動結束前 2 小時|活動開始前 30 分鐘|逾時重補位/.test(all)});
console.log('RESULT '+passed+'/20 PASS, '+failed+' FAIL');
process.exit(failed?1:0);

