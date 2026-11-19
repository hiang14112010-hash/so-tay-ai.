import {vocabulary,exercises} from './learning-data.mjs';

const fresh=()=>({users:[],cards:[],reviews:[],awards:[],attempts:[],conversations:[]});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const field=(v,min,max,label)=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)throw fail(`${label} cần từ ${min} đến ${max} ký tự.`);return v.trim();};
const publicUser=({id,username,name,intro,guide,goal,publicRank,socialProvider,testSlot})=>({id,username,name,intro,guide,goal,publicRank,...(socialProvider?{socialProvider}:{}),...(testSlot?{testAccount:true}:{})});
const shuffle=list=>[...list].sort(()=>Math.random()-.5);
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');

// Same UI contract as the Node API, with browser-local storage only.
export function createLocalAPI({read,write,session,crypto=globalThis.crypto,now=()=>Date.now(),lock=fn=>fn(),socialIdentity=()=>null}){
  const day=(offset=0,time=now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time+offset*86400000));
  const passwordHash=async(password,salt)=>{const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:210000,hash:'SHA-256'},key,256)));};
  async function createProfile(username,name,password,created=now()){
    const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
    return {id:crypto.randomUUID(),username,name,salt,password:await passwordHash(password,salt),intro:false,guide:0,goal:10,publicRank:false,created};
  }
  async function installTestAccounts(state){
    const {testNames,testPassword,addTestProgress}=await import('./test-accounts.mjs');
    const profiles=[],created=now();
    let added=0;
    for(const [index,name] of testNames.entries()){
      const testSlot=index+1;
      let profile=state.users.find(u=>u.testSlot===testSlot);
      if(!profile){
        const base='kiemthu.'+String(testSlot).padStart(2,'0');
        let username=base;
        for(let suffix=2;state.users.some(u=>u.username===username);suffix++){
          username=base+'-'+suffix;
        }
        profile=await createProfile(username,name,testPassword,created);
        Object.assign(profile,{testSlot,intro:true,guide:4,publicRank:true,goal:index<5?10:5});
        state.users.push(profile);
        addTestProgress(state,profile.id,index,offset=>day(offset,created));
        added++;
      }
      profiles.push({name:profile.name,username:profile.username});
    }
    if(added)await write(state);
    return {profiles,password:testPassword,added};
  }
  function deck(state,uid){return [...vocabulary,...state.cards.filter(c=>c.userId===uid)].map(w=>{const r=state.reviews.find(r=>r.userId===uid&&r.wordId===w.id);return {...w,seen:!!r,level:r?.level||0,due:r?.due||day(),isDue:!!r&&r.due<=day()};});}
  function mark(state,uid,id,remembered){let r=state.reviews.find(x=>x.userId===uid&&x.wordId===id);if(!r){r={userId:uid,wordId:id,level:0};state.reviews.push(r);}r.level=remembered?Math.min(4,r.level+1):0;r.due=day(remembered?[0,1,3,7,14][r.level]:0);}
  function award(state,uid,item){if(state.awards.some(a=>a.userId===uid&&a.item===item&&a.day===day()))return 0;state.awards.push({userId:uid,item,day:day(),xp:10});return 10;}
  function next(a){const q=a.questions[a.position];if(!q)return null;const {correct,explanation,item,...safe}=q;return {...safe,index:a.position+1,total:a.questions.length};}
  let queue=Promise.resolve();
  async function execute(path,data,method){
    const state=await read()||fresh(),b=data||{};
    const url=new URL(path,'https://local.invalid/'),route=url.pathname.slice(1);
    const verb=method||(data?'POST':'GET');let user=state.users.find(u=>u.id===session.get());
    let result,dirty=false;
    if(route==='session')return {user:user?publicUser(user):null,aiConfigured:false,local:true};
    if(route==='install-test-accounts'&&verb==='POST')return installTestAccounts(state);
    if(route==='social-login'&&verb==='POST'){
      const identity=socialIdentity();
      if(!identity)throw fail('Cần xác thực bằng Google hoặc Facebook trước.',401);
      let found=state.users.find(profile=>profile.socialKey===identity.key);
      if(!found){
        const displayName=(identity.name||'').trim().slice(0,32);
        found={id:crypto.randomUUID(),username:'',name:displayName.length>=2?displayName:'Học viên',socialKey:identity.key,
          socialProvider:identity.provider,intro:false,guide:0,goal:10,publicRank:false,created:now()};
        state.users.push(found);
        await write(state);
      }
      session.set(found.id);
      return {user:publicUser(found)};
    }
    if((route==='register'||route==='login')&&verb==='POST'){
      const username=field(b.username,3,30,'Tên đăng nhập').toLowerCase();
      if(!/^[a-z0-9_.-]+$/.test(username))throw fail('Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.');
      if(typeof b.password!=='string'||b.password.length<8||b.password.length>128)throw fail('Mật khẩu cần từ 8 đến 128 ký tự.');
      let found=state.users.find(u=>!u.socialKey&&u.username===username);
      if(route==='register'){
        if(found)throw fail('Tên đăng nhập này đã tồn tại trên trình duyệt này.');
        const name=field(b.name,2,32,'Tên hiển thị');
        found=await createProfile(username,name,b.password);
        state.users.push(found);await write(state);
      }else if(!found||await passwordHash(b.password,found.salt)!==found.password)throw fail('Tên đăng nhập hoặc mật khẩu chưa đúng trên trình duyệt này.',401);
      session.set(found.id);return {user:publicUser(found)};
    }
    if(!user)throw fail('Vui lòng đăng nhập hồ sơ trên trình duyệt này.',401);
    const uid=user.id;
    if(route==='logout'){session.clear();return {ok:true};}
    if(route==='profile'&&verb==='POST'){
      const goal=b.goal??user.goal,guide=b.guide??user.guide;
      if(![5,10,15].includes(goal)||!Number.isInteger(guide)||guide<0||guide>4||(b.publicRank!==undefined&&typeof b.publicRank!=='boolean')||(b.intro!==undefined&&typeof b.intro!=='boolean'))throw fail('Cài đặt không hợp lệ.');
      if(b.name!==undefined)user.name=field(b.name,2,32,'Tên hiển thị');
      user.goal=goal;user.guide=Math.max(guide,user.guide);user.intro=!!(b.intro||user.intro);if(b.publicRank!==undefined&&!user.testSlot)user.publicRank=b.publicRank;
      result={user:publicUser(user)};dirty=true;
    }else if(route==='conversations'&&verb==='GET'){
      return {conversations:(state.conversations??[]).filter(thread=>thread.userId===uid).sort((a,b)=>b.updated-a.updated)};
    }else if(route==='conversations'&&verb==='POST'){
      if(b.userId!==uid)throw fail('Hồ sơ trò chuyện đã thay đổi.',409);
      const id=field(b.id,36,36,'Mã cuộc trò chuyện');
      const turnId=field(b.turnId,36,36,'Mã tin nhắn');
      const question=field(b.question,1,6000,'Câu hỏi');
      const answer=field(b.answer,1,16000,'Câu trả lời');
      const conversations=state.conversations??=[];
      let thread=conversations.find(item=>item.id===id&&item.userId===uid);
      if(b.existing&&!thread)throw fail('Cuộc trò chuyện này đã bị xóa.',409);
      if(!thread){
        thread={id,userId:uid,title:question.replace(/\s+/g,' ').slice(0,64),updated:now(),messages:[]};
        conversations.push(thread);
      }
      if(thread.messages.some(message=>message.turnId===turnId))return {thread};
      const sources=Array.isArray(b.sources)?b.sources.slice(0,2).flatMap(source=>{
        try{
          const url=new URL(source.url);
          if(url.protocol!=='https:'||!['vi.wikipedia.org','en.wikipedia.org','en.wiktionary.org'].includes(url.host)||!url.pathname.startsWith('/wiki/'))return [];
          return [{url:url.href,title:field(source.title,1,240,'Tên nguồn')}];
        }catch{return [];}
      }):[];
      thread.messages.push({role:'user',content:question,turnId},{role:'assistant',content:answer,sources,note:String(b.note||'').slice(0,300)});
      thread.updated=now();
      result={thread};dirty=true;
    }else if(route==='conversations'&&verb==='DELETE'){
      if(b.userId!==uid)throw fail('Hồ sơ trò chuyện đã thay đổi.',409);
      state.conversations=(state.conversations??[]).filter(thread=>!(thread.id===b.id&&thread.userId===uid));
      result={ok:true};dirty=true;
    }else if(route==='words'&&verb==='GET')return {words:deck(state,uid)};
    else if(route==='words'&&verb==='POST'){
      const word=field(b.word,1,80,'Từ mới').toLowerCase(),meaning=field(b.meaning,1,200,'Nghĩa'),example=b.example?field(b.example,1,300,'Ví dụ'):'';
      if(deck(state,uid).some(w=>w.word.toLowerCase()===word))throw fail('Từ này đã có trong bộ thẻ của bạn.');
      if(state.cards.filter(c=>c.userId===uid).length>=500)throw fail('Đã đạt giới hạn 500 thẻ cá nhân.');
      const id=crypto.randomUUID();state.cards.push({id,userId:uid,word,meaning,example,custom:true,pos:'Từ của bạn'});result={id};dirty=true;
    }else if(route.startsWith('words/')&&verb==='DELETE'){
      const id=route.split('/')[1];if(!state.cards.some(c=>c.id===id&&c.userId===uid))throw fail('Không tìm thấy thẻ cá nhân.',404);
      state.cards=state.cards.filter(c=>!(c.id===id&&c.userId===uid));state.reviews=state.reviews.filter(r=>!(r.wordId===id&&r.userId===uid));result={ok:true};dirty=true;
    }else if(route==='study'){
      if(typeof b.remembered!=='boolean'||!deck(state,uid).some(w=>w.id===b.id))throw fail('Thẻ hoặc kết quả không hợp lệ.');
      mark(state,uid,b.id,b.remembered);result={ok:true};dirty=true;
    }else if(route==='dashboard'){
      const awards=state.awards.filter(a=>a.userId===uid),dates=new Set(awards.map(a=>a.day));let streak=0,offset=dates.has(day())?0:-1;while(dates.has(day(offset))){streak++;offset--;}
      const words=deck(state,uid);return {xp:awards.reduce((n,a)=>n+a.xp,0),today:awards.filter(a=>a.day===day()).length,streak,learned:words.filter(w=>w.seen).length,due:words.filter(w=>w.isDue).length,week:Array.from({length:7},(_,i)=>({day:day(i-6),xp:awards.filter(a=>a.day===day(i-6)).reduce((n,a)=>n+a.xp,0)}))};
    }else if(route==='quiz'){
      if(!['review','exercise'].includes(b.kind))throw fail('Loại bài tập không hợp lệ.');let questions;
      if(b.kind==='exercise')questions=shuffle(exercises).slice(0,8).map(q=>({...q,item:q.id}));
      else{const words=deck(state,uid),seen=words.filter(w=>w.seen),due=seen.filter(w=>w.isDue);if(!seen.length)throw fail('Học ít nhất một flashcard trước khi ôn tập.');questions=shuffle(due.length?due:seen).slice(0,10).map(w=>{const options=shuffle([w.meaning,...shuffle([...new Set(words.filter(x=>x.meaning!==w.meaning).map(x=>x.meaning))]).slice(0,3)]);return {id:w.id,item:'review:'+w.id,question:`“${w.word}” có nghĩa là gì?`,options,correct:options.indexOf(w.meaning),explanation:`${w.word}: ${w.meaning}. ${w.example}`};});}
      const a={id:crypto.randomUUID(),userId:uid,kind:b.kind,questions,position:0,score:0,earned:0,expires:now()+3600000};
      state.attempts=state.attempts.filter(a=>a.expires>now()).slice(-49);state.attempts.push(a);result={id:a.id,question:next(a)};dirty=true;
    }else if(route==='answer'){
      const a=state.attempts.find(a=>a.id===b.id&&a.userId===uid&&a.expires>now());if(!a)throw fail('Lượt làm bài đã hết hạn.',404);
      const q=a.questions[a.position];if(!q||b.index!==a.position+1)throw fail('Câu này đã được chấm. Hãy chuyển sang câu tiếp theo.',409);
      if(!Number.isInteger(b.answer)||b.answer<0||b.answer>=q.options.length)throw fail('Hãy chọn một đáp án.');
      const correct=b.answer===q.correct,xp=correct?award(state,uid,q.item):0;
      if(a.kind==='review')mark(state,uid,q.id,correct);a.position++;a.score+=Number(correct);a.earned+=xp;
      result={correct,correctIndex:q.correct,explanation:q.explanation,xp,score:a.score,earned:a.earned,total:a.questions.length,next:next(a)};dirty=true;
    }else if(route==='leaderboard'){
      const period=url.searchParams.get('period')==='all'?'all':'week',since=period==='all'?'0000-00-00':day(-6);
      const rows=state.users.filter(u=>u.publicRank||u.testSlot).map(u=>({
        id:u.id,name:u.name,created:u.created,testSlot:u.testSlot,
        xp:state.awards.filter(a=>a.userId===u.id&&a.day>=since).reduce((sum,a)=>sum+a.xp,0)
      })).filter(u=>u.xp>0||u.testSlot).sort((a,b)=>b.xp-a.xp||a.created-b.created);
      const visibleRows=rows.map((r,i)=>({
        name:r.name,xp:r.xp,rank:i+1,me:r.id===uid,...(r.testSlot?{testAccount:true}:{})
      })).filter(r=>r.rank<=50||r.testAccount);
      return {rows:visibleRows,myRank:rows.findIndex(r=>r.id===uid)+1||null,participating:!!(user.publicRank||user.testSlot),period,local:true};
    }else if(route==='ai')throw fail('Bản GitHub Pages chưa kết nối AI. Dùng công cụ ghép prompt với AI của bạn.',503);
    else throw fail('Không tìm thấy chức năng này.',404);
    if(dirty)await write(state);return result;
  }
  return {request(path,data,method){const task=queue.then(()=>lock(()=>execute(path,data,method)));queue=task.catch(()=>{});return task;}};
}

export function browserLocalAPI(socialIdentity){
  const prefix='so-tay-ai-pages:'+new URL('.',import.meta.url).pathname;
  let connection;
  function database(){return connection??=new Promise((resolve,reject)=>{const r=indexedDB.open(prefix,1);r.onupgradeneeded=()=>r.result.createObjectStore('storage');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(fail('Không mở được dữ liệu trình duyệt. Hãy cho phép lưu dữ liệu website.'));});}
  async function transaction(mode,value){const db=await database();return new Promise((resolve,reject)=>{const t=db.transaction('storage',mode),store=t.objectStore('storage'),r=mode==='readonly'?store.get('state'):store.put(value,'state');t.oncomplete=()=>resolve(r.result);t.onabort=t.onerror=()=>reject(fail('Không lưu được dữ liệu. Hãy kiểm tra dung lượng trình duyệt.'));});}
  return createLocalAPI({socialIdentity,read:()=>transaction('readonly'),write:s=>transaction('readwrite',s),session:{get:()=>sessionStorage.getItem(prefix),set:id=>sessionStorage.setItem(prefix,id),clear:()=>sessionStorage.removeItem(prefix)},lock:fn=>navigator.locks?navigator.locks.request(prefix,fn):fn()});
}
