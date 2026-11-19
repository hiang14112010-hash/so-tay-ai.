(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons={home:'<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',book:'<path d="M12 6Q7 3 3 5v15q5-2 9 1 4-3 9-1V5q-5-2-9 1Zm0 0v15"/>',cards:'<rect x="6" y="5" width="15" height="16" rx="3"/><path d="M17 5V3H3v14h3m4-5h7m-7 4h5"/>',exercise:'<rect x="5" y="4" width="15" height="18" rx="2"/><path d="M9 2h7v4H9zm0 9 2 2 4-4m-6 9h7"/>',review:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2"/>',translate:'<path d="M2 5h12M8 2v3m4 0c0 5-4 9-9 11M5 8c1 3 3 5 7 7m1 6 4.5-10L22 21m-7-4h5"/>',trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0zm0 2H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4m-4 2v6m-5 1h10"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',diagonal:'<path d="M6 18 18 6M7 6h11v11"/>',check:'<path d="m5 12 4 4L20 5"/>',fire:'<path d="M13 2c2 6-2 6-1 10 2-1 3-3 3-5 9 9 4 15-3 15-8 0-11-9-4-15 0 4 1 5 2 5-1-5 2-7 3-10z"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',volume:'<path d="m4 9 4 0 5-4v14l-5-4H4zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6zm-4 10 3 3 5-6"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>'};
  const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.spark}</svg>`;
  const brand=`<span class="brand"><img class="brand-mark" src="book.png" alt=""><span>Sổ tay <b>AI</b><small>HỌC CHỦ ĐỘNG, NHỚ DÀI LÂU</small></span></span>`;
  const nav=[['home','Tổng quan','home'],['tools','Công cụ AI','spark'],['exercises','Bài tập','exercise'],['flashcards','Flashcard','cards'],['review','Ôn tập','review'],['translate','Dịch thuật','translate'],['leaderboard','Xếp hạng','trophy'],['ai','Mây AI','spark']];
  let grading=false,flipping=false,guideBusy=false;
  let user=null,aiConfigured=false,currentRoute='home',routeVersion=0,screen='boot',introStep=0,introChoice='',guideStep=-1,guideReplay=false,words=[],flashIndex=0,flipped=false,deckFilter='all',search='',attempt=null,selectedAnswer=null,answerResult=null,rankPeriod='week',chat=[],chatDraft='',toastTimer,translationController;
  const localTutor=window.studyAI;
  let chatThreads=[],chatSelection,chatJob=null,deletingChat=false;
  const canChat=()=>!chatJob&&!deletingChat&&(localTutor?localTutor.ready&&!localTutor.busy:aiConfigured);
  function resetChat(){
    chat=[];chatDraft='';chatThreads=[];chatSelection=undefined;chatJob=null;deletingChat=false;
  }
  let promptDraft={goal:'Hiểu và dùng từ theo ngữ cảnh',word:'sustainable',context:'Our school needs a sustainable way to reduce plastic waste.',level:'Lớp 11 · A2–B1',format:'Theo từng mục ngắn',request:'Giải thích nghĩa, từ loại và cho 2 ví dụ có bản dịch. Tạo 1 câu điền từ và chờ tôi trả lời trước khi đưa đáp án.'};
  async function api(path,data,method){if(window.studyLocal){try{return await window.studyLocal.request(path,data,method);}catch(e){if(e.status===401&&user){user=null;resetChat();attempt=null;words=[];showAuth();}throw e;}}const response=await fetch('/api/'+path,{method:method||(data?'POST':'GET'),headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,credentials:'same-origin',signal:AbortSignal.timeout(path==='ai'?35000:15000)});const result=await response.json();if(!response.ok){if(response.status===401&&user){user=null;resetChat();attempt=null;words=[];showAuth();}throw new Error(result.error||'Không thể hoàn thành yêu cầu.');}return result;}
  function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4000);}
  function showScreen(id){screen=id;for(const key of ['boot','auth-screen','intro-screen','guide-screen','app-shell'])$(key).hidden=key!==id;window.scrollTo(0,0);}
  function focusTitle(container){const title=container.querySelector('h1,h2');if(title){title.tabIndex=-1;title.focus({preventScroll:true});}}
  function heading(title,subtitle,extra=''){return `<div class="page-heading"><div><p class="eyebrow">KHÔNG GIAN CỦA BẠN</p><h1>${title}</h1><p>${subtitle}</p></div>${extra}</div>`;}
  function empty(title,description,route,label){return `<div class="card empty-state">${icon('book')}<h2>${title}</h2><p>${description}</p>${route?`<a class="button primary" href="#${route}">${label} ${icon('arrow')}</a>`:''}</div>`;}
  function showAuth(register=false){
    showScreen('auth-screen');
    const local=!!window.studyLocal;
    const storageSummary=local?'Hồ sơ lưu trên trình duyệt này':'Tiến độ được lưu theo tài khoản';
    const storageDetail=local?'Hồ sơ, flashcard và tiến độ chỉ nằm trong trình duyệt này, không tự đồng bộ sang thiết bị khác. Xóa dữ liệu website sẽ xóa hồ sơ. Mật khẩu hồ sơ không thay thế bảo mật tài khoản trực tuyến.':'Hồ sơ, flashcard và lịch ôn được lưu trên máy chủ website để bạn tiếp tục học khi đăng nhập lại.';
    $('auth-screen').innerHTML=`<div class="auth-layout">
      <div class="auth-art">
        <div class="auth-brand-row">${brand}<span class="auth-edition">TIẾNG ANH 11</span></div>
        <div class="auth-art-copy">
          <p class="eyebrow auth-kicker"><span class="status-dot"></span>MỖI NGÀY, MỘT CHÚT TIẾN BỘ</p>
          <h1>Học cùng AI.<br><em>Nhớ dài lâu.</em></h1>
          <p class="auth-description">Một không gian nhỏ để hỏi rõ hơn,<br>hiểu sâu hơn và tự tin dùng từ mới.</p>
          <div class="sculpture orbit-scene" aria-hidden="true"><div class="orb"></div><div class="orbit-satellite"><div class="floating-word"><span class="word-card-label">TỪ MỚI, CƠ HỘI MỚI</span><strong>grow <span>↗</span></strong><small>/ɡrəʊ/ · tiến bộ, trưởng thành</small></div></div><div class="orbit-satellite second"><div class="floating-word second"><span class="word-card-spark">✧</span><div><strong>A little, every day.</strong><small>Một chút hôm nay. Khác biệt ngày mai.</small></div></div></div><span class="tiny-spark">✳</span></div>
        </div>
        <div class="auth-learning-path"><span><i>01</i>Hỏi rõ</span><b>·</b><span><i>02</i>Tự luyện</span><b>·</b><span><i>03</i>Nhớ lâu</span></div>
      </div>
      <div class="auth-form-side"><div class="auth-inner">
        <img class="auth-welcome-symbol" src="book.png" alt="">
        <p class="eyebrow">${register?'MỘT KHỞI ĐẦU DÀNH RIÊNG CHO BẠN':'CHÀO MỪNG BẠN TRỞ LẠI'}</p>
        <h2>${register?'Bắt đầu điều mới.':'Tiếp tục hành trình.'}</h2>
        <p class="auth-subtitle">${register?'Tạo hồ sơ và bắt đầu từ một từ mới hôm nay.':'Một chút tập trung hôm nay, thêm tự tin ngày mai.'}</p>
        <div class="auth-tabs" role="tablist" aria-label="Chọn đăng nhập hoặc đăng ký"><button type="button" role="tab" aria-selected="${!register}" data-action="login-tab">Đăng nhập</button><button type="button" role="tab" aria-selected="${register}" data-action="register-tab">Tạo tài khoản</button></div>
        <form id="auth-form" data-register="${register}">
          ${register?'<label for="auth-name">Tên hiển thị</label><div class="auth-input-wrap">'+icon('user')+'<input id="auth-name" name="name" autocomplete="nickname" required minlength="2" maxlength="32" placeholder="Bạn muốn được gọi là gì?"></div>':''}
          <label for="auth-username">Tên đăng nhập</label><div class="auth-input-wrap">${icon('user')}<input id="auth-username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required minlength="3" maxlength="30" placeholder="Ví dụ: minh.anh11"></div>
          <label for="auth-password">Mật khẩu</label><div class="auth-input-wrap password-wrap">${icon('shield')}<input id="auth-password" type="password" name="password" autocomplete="${register?'new-password':'current-password'}" required minlength="8" maxlength="128" placeholder="Tối thiểu 8 ký tự"><button type="button" class="password-toggle" data-action="toggle-password" aria-label="Hiện mật khẩu" aria-pressed="false">Hiện</button></div>
          ${register?'<label class="check-label auth-consent"><input type="checkbox" required><span>'+ (local?'Tôi hiểu hồ sơ và tiến độ được lưu trên trình duyệt này.':'Tôi hiểu tiến độ học được lưu theo tài khoản.')+'</span></label>':''}
          <p class="form-status" id="auth-status" role="status"></p>
          <button class="button primary full auth-submit" type="submit"><span>${register?'Tạo tài khoản của tôi':'Vào không gian học'}</span>${icon('arrow')}</button>
        </form>
        <p class="auth-note">Không cần email. Chỉ cần một chút tò mò.</p>
        <details class="auth-storage"><summary>${icon('shield')}<span>${storageSummary}</span><span class="storage-plus" aria-hidden="true">＋</span></summary><p>${storageDetail} ${local?'Bảng xếp hạng chỉ gồm các hồ sơ trên cùng trình duyệt.':'Bạn tự chọn có hiển thị trên bảng xếp hạng hay không.'}</p><p>Hãy ghi nhớ tên đăng nhập và mật khẩu của bạn.</p></details>
      </div><p class="auth-panel-footer">HỌC CHỦ ĐỘNG <span>✦</span> TIẾN BỘ MỖI NGÀY</p></div>
    </div>`;
  }
  const introSlides=[
    {eyebrow:'01 / NHÌN LẠI CÁCH MÌNH HỌC',title:'Bạn đang dùng AI.<br>Nhưng đã <em>thực sự học?</em>',text:'Một câu trả lời đến rất nhanh. Nhưng kiến thức chỉ ở lại khi bạn hiểu và tự mình sử dụng nó.',chips:['Có đáp án ≠ đã hiểu','Tư duy vẫn là của bạn']},
    {eyebrow:'02 / ĐIỀU GÌ ĐANG GIỮ BẠN LẠI?',title:'Bạn thấy mình<br>trong <em>tình huống nào?</em>',text:'Chọn điều gần với bạn nhất. Chúng ta sẽ bắt đầu từ đó.',chips:['Học theo cách của bạn','Không cần hoàn hảo']},
    {eyebrow:'03 / THAY ĐỔI MỘT THÓI QUEN NHỎ',title:'Hỏi đúng hơn.<br><em>Hiểu sâu hơn.</em>',text:'Hỏi mơ hồ dễ nhận câu trả lời chung chung. Chép đáp án dễ bỏ qua việc luyện tập. Tin ngay vào AI có thể khiến bạn học sai nghĩa.',chips:['Thêm ngữ cảnh','Luôn kiểm chứng']},
    {eyebrow:'04 / SẴN SÀNG CHO MỘT KHỞI ĐẦU MỚI',title:'AI là người đồng hành.<br><em>Bạn là người học.</em>',text:'Hỏi rõ, kiểm tra lại, tự dùng từ rồi ôn đúng lúc. Cuốn sách nhỏ tiếp theo sẽ dẫn bạn qua từng bước.',chips:['Mỗi ngày một chút','Bắt đầu từ hôm nay']}
  ];
  function showIntro(){showScreen('intro-screen');const s=introSlides[introStep];$('intro-screen').innerHTML=`<div class="intro-top">${brand}<button class="text-link" data-action="logout">Đổi tài khoản</button></div><div class="intro-inner route-enter"><div class="intro-progress" aria-label="Bước ${introStep+1} trên 4">${introSlides.map((_,i)=>`<span class="${i===introStep?'active':''}"></span>`).join('')}</div><div class="intro-orbit orbit-scene" aria-hidden="true"><div class="orb"></div><div class="orbit-satellite"><span class="orbit-chip">${s.chips[0]}</span></div><div class="orbit-satellite second"><span class="orbit-chip">${s.chips[1]}</span></div></div><p class="eyebrow">${s.eyebrow}</p><h1>${s.title}</h1><p>${introStep===2&&introChoice?esc(introChoice)+'. ':''}${s.text}</p>${introStep===1?`<div class="intro-options">${['Chưa biết hỏi AI thế nào','Hay chép mà chưa hiểu','Học trước, quên sau','Muốn học chủ động hơn'].map(x=>`<button class="intro-option" data-intro-choice="${esc(x)}" aria-pressed="${introChoice===x}">${x}</button>`).join('')}</div>`:''}<div class="row" style="justify-content:center">${introStep?'<button class="button ghost" data-action="intro-back" aria-label="Quay lại bước trước">←</button>':''}<button class="button lime" data-action="intro-next">${introStep===3?'Mở hành trình của tôi':'Tiếp tục'} ${icon('arrow')}</button></div></div><p class="intro-bottom">Không cần giỏi AI để bắt đầu. Chỉ cần một chút tò mò.</p>`;focusTitle($('intro-screen'));}
  const chapters=[
    {name:'Hỏi đúng',title:'Một câu hỏi tốt,<br>một khởi đầu tốt.',description:'Dùng Công cụ AI để ghép một prompt có mục tiêu, ngữ cảnh và yêu cầu rõ ràng.',label:'THỬ MỘT PROMPT CÓ NGỮ CẢNH',example:'Tôi học lớp 11. Giải thích “sustainable” trong “a sustainable study routine”. Cho nghĩa tiếng Việt, từ loại và hai ví dụ ngắn.',tips:['Chọn từ bạn muốn học và giữ lại câu gốc.','Điền mục tiêu, trình độ và cách trình bày.','Sao chép prompt để dùng với AI của bạn.']},
    {name:'Hiểu & kiểm tra',title:'Câu trả lời hay<br>vẫn cần kiểm chứng.',description:'Dịch thuật giúp bạn hiểu câu. Một từ điển đáng tin cậy giúp bạn đối chiếu cách dùng.',label:'MỘT TỪ, NHIỀU NGỮ CẢNH',example:'“Sustainable” không chỉ là “thân thiện với môi trường”. Trong “a sustainable routine”, từ này nói về một thói quen có thể duy trì lâu dài.',tips:['Đọc cả câu trước khi chọn nghĩa.','Đối chiếu từ loại, nghĩa và ví dụ với từ điển.','Bỏ thông tin cá nhân trước khi gửi cho AI.']},
    {name:'Tự luyện tập',title:'Từ “biết nghĩa”<br>đến “dùng được”.',description:'Bài tập nằm ở một không gian riêng. Tự chọn đáp án rồi xem lời giải để hiểu lỗi của mình.',label:'THỬ NHỚ TRƯỚC KHI XEM ĐÁP ÁN',example:'“Students ___ in the school project.” → participate. Cụm “participate in” có nghĩa là “tham gia vào”.',tips:['Làm trắc nghiệm và điền từ theo ngữ cảnh.','Đọc lời giải dù bạn trả lời đúng.','Tự viết thêm một câu gần với cuộc sống của bạn.']},
    {name:'Ghi nhớ dài lâu',title:'Một chút mỗi ngày.<br>Nhớ thêm từng từ.',description:'Lật flashcard, tự đánh giá rồi ôn lại bằng trắc nghiệm từ chính những từ bạn đã học.',label:'HÀNH TRÌNH GHI NHỚ CỦA BẠN',example:'Học flashcard → tự nhớ lại → làm bài ôn → kiểm tra tiến độ. Lịch ôn tăng dần: 1, 3, 7 và 14 ngày; từ chưa nhớ được ôn lại sớm.',tips:['Thêm từ và ví dụ của riêng bạn vào bộ thẻ.','Ưu tiên những từ đã đến ngày ôn.','Chọn mục tiêu vừa sức. Xếp hạng là tùy chọn.']}
  ];
  function guidePages(step){const c=chapters[step];return '<div class="book-page left"><span class="chapter-number">0'+(step+1)+'</span><h2>'+c.title+'</h2><p>'+c.description+'</p></div><div class="book-page right"><p class="eyebrow">'+c.label+'</p><div class="book-example"><strong>'+icon('spark')+' Ghi nhớ điều này</strong>'+c.example+'</div><ul>'+c.tips.map(t=>'<li>'+t+'</li>').join('')+'</ul><p class="eyebrow page-number">SỔ TAY AI · 0'+(step+1)+'</p></div>';}
  function guideNavigation(){
    document.querySelectorAll('[data-chapter]').forEach(b=>{const i=Number(b.dataset.chapter);b.classList.toggle('active',i===guideStep);b.toggleAttribute('aria-current',i===guideStep);if(i===guideStep)b.setAttribute('aria-current','step');b.disabled=guideBusy||(!guideReplay&&i>user.guide);b.firstElementChild.textContent=i<user.guide?'✓':'0'+(i+1);});
    const back=document.querySelector('[data-action="guide-back"]'),next=document.querySelector('[data-action="guide-next"]');
    if(back){back.disabled=guideBusy;back.textContent='← '+(guideStep?'Trang trước':'Về bìa');}
    if(next){next.disabled=guideBusy;next.innerHTML=(guideStep===3?'Vào không gian học tập':guideReplay?'Trang tiếp theo':'Hoàn thành & lật trang')+' '+icon('arrow');}
    for(const button of document.querySelectorAll('[data-action="guide-open"],[data-action="guide-close"]'))button.disabled=guideBusy;
    if($('guide-location'))$('guide-location').textContent='Chặng '+(guideStep+1)+' / 4';
  }
  function showGuide(){showScreen('guide-screen');let html='<div class="guide-top">'+brand+'<span class="pill">'+(guideReplay?'ĐỌC LẠI HƯỚNG DẪN':'KHỞI ĐẦU HÀNH TRÌNH')+'</span></div>';
    if(guideStep<0){html+='<div class="guide-heading"><p class="eyebrow">CUỐN SÁCH ĐẦU TIÊN CỦA BẠN</p><h1>Bốn chặng nhỏ.<br>Một cách học mới.</h1><p class="subtext">Mở sách, làm quen với không gian học tập rồi bắt đầu.</p></div><div class="book-cover" aria-hidden="true"><small>SỔ TAY HỌC TẬP</small><h2>Học cùng AI<br>nhớ dài lâu</h2><img class="book-emblem" src="book.png" alt=""><small>TIẾNG ANH · 11</small></div><div class="guide-center"><button class="button primary" data-action="guide-open">Mở sách hướng dẫn '+icon('book')+'</button>'+(guideReplay?'<br><button class="button ghost" data-action="guide-close">Về trang chính</button>':'')+'</div>';}
    else{html+='<div class="guide-heading"><p class="eyebrow">LẬT MỘT TRANG, TIẾN MỘT BƯỚC</p><h1>Làm quen với Sổ tay AI</h1></div><div class="chapter-track">'+chapters.map((x,i)=>'<button class="chapter-step" aria-label="Chặng '+(i+1)+': '+x.name+'" data-chapter="'+i+'"><span></span><span class="chapter-name">'+x.name+'</span></button>').join('')+'</div><div class="journey-book" data-chapter-index="'+guideStep+'">'+guidePages(guideStep)+'</div><div class="guide-controls"><button class="button ghost" data-action="guide-back"></button><span id="guide-location" class="muted" role="status" aria-live="polite"></span><button class="button primary" data-action="guide-next"></button></div>';}
    $('guide-screen').innerHTML=html;guideNavigation();
    if(!guideBusy)focusTitle($('guide-screen'));
  }
  async function animateGuideCover(opening){
    const update=()=>{
      guideStep=opening?(guideReplay?0:Math.min(user.guide,3)):-1;
      showGuide();
    };
    if(window.studyMotion)await window.studyMotion.moveBookCover($('guide-screen'),opening,update);
    else update();
  }
  async function moveGuideCover(opening){
    if(guideBusy)return;
    guideBusy=true;guideNavigation();
    try{await animateGuideCover(opening);}
    finally{
      guideBusy=false;guideNavigation();focusTitle($('guide-screen'));
    }
  }
  async function changeGuide(target,complete=false){
    if(guideBusy||target===guideStep||target<0||target>3)return;
    guideBusy=true;guideNavigation();
    const from=guideStep;
    try{
      if(complete&&!guideReplay)user=(await api('profile',{guide:from+1})).user;
      const book=document.querySelector('.journey-book');
      if(window.studyMotion)await window.studyMotion.turnBook(book,guidePages(target),target>from?1:-1);
      else book.innerHTML=guidePages(target);
      guideStep=target;book.dataset.chapterIndex=String(target);
      const title=book.querySelector('h2');title.tabIndex=-1;title.focus({preventScroll:true});
    }finally{guideBusy=false;guideNavigation();}
  }
  function enter(){if(!user)return showAuth();if(!user.intro){introStep=0;return showIntro();}if(user.guide<4){guideReplay=false;guideStep=user.guide===0?-1:user.guide;return showGuide();}showScreen('app-shell');$('profile-button').textContent=user.name.slice(0,2).toUpperCase();renderRoute();}
  function navigate(route){if(location.hash==='#'+route)renderRoute();else location.hash=route;}
  async function renderRoute(){if(!user||screen!=='app-shell')return;const version=++routeVersion;translationController?.abort();currentRoute=location.hash.slice(1)||'home';if(![...nav.map(x=>x[0]),'account'].includes(currentRoute))currentRoute='home';$('route-label').textContent=nav.find(x=>x[0]===currentRoute)?.[1]||'Tài khoản';document.title=$('route-label').textContent+' · Sổ tay AI';$('main-nav').innerHTML=nav.map(([id,label,i])=>`${id==='leaderboard'?'<div class="nav-separator"></div>':''}<a href="#${id}" class="nav-item ${currentRoute===id?'active':''}" ${currentRoute===id?'aria-current="page"':''} aria-label="${label}">${icon(i)}<span>${label}</span>${id==='ai'?'<span class="nav-mini">RIÊNG</span>':''}</a>`).join('');$('main-content').innerHTML='<div class="loading" role="status">Đang mở trang…</div>';
    try{let html='';if(currentRoute==='home'){const [stats,data]=await Promise.all([api('dashboard'),api('words')]);words=data.words;html=home(stats);}else if(currentRoute==='tools')html=toolsPage();else if(currentRoute==='exercises')html=exercisePage();else if(currentRoute==='flashcards'||currentRoute==='review'){words=(await api('words')).words;html=currentRoute==='flashcards'?flashPage():reviewPage();}else if(currentRoute==='translate')html=translationPage();else if(currentRoute==='leaderboard')html=rankPage(await api('leaderboard?period='+rankPeriod));else if(currentRoute==='ai'){
      if(localTutor){
        const {conversations}=await api('conversations');
        if(version!==routeVersion||screen!=='app-shell')return;
        chatThreads=conversations;
        if(!chatJob){
          const thread=chatSelection===undefined?chatThreads[0]:chatThreads.find(item=>item.id===chatSelection);
          selectChat(thread);
        }
      }
      html=aiPage();
    }else html=accountPage();if(version!==routeVersion||screen!=='app-shell')return;$('main-content').innerHTML=html;$('main-content').classList.remove('route-enter');void $('main-content').offsetWidth;$('main-content').classList.add('route-enter');if(currentRoute==='tools')updatePrompt();if(currentRoute==='flashcards')renderFlash();if(currentRoute==='ai'){
      $('chat-input').value=chatDraft;
      chatDraft='';
      syncTutor();
      renderChat();
      renderChatHistory();
    }restoreQuizState();window.scrollTo(0,0);$('main-content').focus({preventScroll:true});}catch(e){if(version===routeVersion&&screen==='app-shell')$('main-content').innerHTML=`<div class="error-card" role="alert">${esc(e.message)} <button class="button small" data-action="retry">Thử lại</button></div>`;}
  }
  function home(s){const date=new Date().toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',weekday:'long',day:'numeric',month:'long'});const w=words[(Math.floor(Date.now()/86400000))%40];const stat=(n,label,i)=>`<div class="stat"><span class="stat-icon">${icon(i)}</span><div><strong>${n}</strong><small>${label}</small></div></div>`;return heading(`Chào ${esc(user.name)} <span class="greeting-mark">✳</span>`,'Một ngày mới, một cơ hội để tiến bộ. Hôm nay mình học gì nhỉ?',`<span class="heading-date">${date}</span>`)+`<div class="dashboard-grid"><section class="card hero"><p class="eyebrow">HỌC CÓ CHỦ ĐÍCH · NHỚ CÓ PHƯƠNG PHÁP</p><h2>Mỗi từ mới,<br>mở thêm một thế giới.</h2><p>Bắt đầu từ một bộ thẻ nhỏ. Hiểu thật rõ, luyện thật đều, để kiến thức ở lại lâu hơn.</p><a class="button lime" href="#${s.due?'review':'flashcards'}">${s.due?'Ôn '+s.due+' từ đến hạn':'Bắt đầu học hôm nay'} ${icon('arrow')}</a><div class="hero-art" aria-hidden="true"><img class="hero-book" src="book.png" alt=""><span class="hero-spark">✧</span></div></section><section class="card daily-word"><p class="eyebrow">MỘT TỪ HAY CHO HÔM NAY</p><div class="word-heading"><h2 lang="en">${esc(w.word)}</h2><button class="icon-button" data-speak="${esc(w.word)}" aria-label="Nghe phát âm ${esc(w.word)}">${icon('volume')}</button></div><span class="word-pos">${esc(w.pos)}</span><p class="meaning">${esc(w.meaning)}</p><p class="sentence" lang="en">“${esc(w.example)}”</p><button class="text-link" data-open-word="${w.id}">Khám phá trong Flashcard ↗</button></section></div><div class="stats-row">${stat(s.learned,'TỪ ĐÃ HỌC','book')}${stat(s.streak,'NGÀY LIÊN TIẾP','fire')}${stat(s.xp,'ĐIỂM KINH NGHIỆM','spark')}${stat(s.due,'TỪ ĐẾN LỊCH ÔN','review')}</div><div class="dashboard-grid"><section><div class="section-heading"><h2>Góc công cụ của bạn</h2><a class="text-link" href="#tools">Khám phá công cụ ↗</a></div><div class="tool-grid">${toolCard('tools','spark','Ghép prompt','Biến ý tưởng thành câu hỏi rõ ràng, hiệu quả.')}${toolCard('flashcards','cards','Flashcard','Lật thẻ, tự nhớ và lưu từ của riêng bạn.')}${toolCard('translate','translate','Dịch thuật','Hiểu từ và câu trong đúng ngữ cảnh.')}</div><div class="next-session">${icon('exercise')}<div><strong>Một chút thử thách, thêm chút tự tin.</strong><p>8 câu hỏi · Từ vựng & kỹ năng dùng AI</p></div><a class="button small" href="#exercises">Làm bài tập →</a></div></section><section class="card progress-card"><div class="section-heading"><h2>Nhịp học của bạn</h2><span class="pill green">7 ngày qua</span></div><p>Đều đặn một chút, mỗi ngày.</p><div class="goal-line"><span>Mục tiêu hôm nay</span><strong>${Math.min(s.today,user.goal)} / ${user.goal} câu đúng</strong></div><progress value="${Math.min(s.today,user.goal)}" max="${user.goal}" aria-label="Mục tiêu câu đúng hôm nay"></progress><div class="week-bars" aria-label="Điểm trong 7 ngày qua">${s.week.map(d=>`<div class="day-bar" title="${d.day}: ${d.xp} XP"><i style="height:${Math.max(6,Math.round(d.xp/Math.max(10,...s.week.map(x=>x.xp))*62))}px"></i>${new Date(d.day+'T12:00:00+07:00').toLocaleDateString('vi-VN',{weekday:'short'}).replace('Th ','T')}</div>`).join('')}</div><div class="daily-tip">${icon('spark')}Mỗi câu đúng mới là một bước tiến.</div></section></div>`;}
  function toolCard(route,i,title,text){return `<a class="tool-card" href="#${route}"><span class="tool-icon">${icon(i)}</span><span class="tool-arrow">${icon('diagonal')}</span><h3>${title}</h3><p>${text}</p></a>`;}
  function toolsPage(){return heading('Hỏi AI, rõ ràng hơn.','Ghép một prompt có mục tiêu. Giữ quyền chủ động trong cách bạn học.')+`<div class="template-row" aria-label="Mẫu prompt"><button class="template-chip" data-template="learn">✧ Học một từ mới</button><button class="template-chip" data-template="quiz">✎ Tạo bài luyện tập</button><button class="template-chip" data-template="check">✓ Kiểm tra câu đã viết</button></div><div class="two-columns"><form id="prompt-form" class="card"><div class="section-heading"><h2>Công thức prompt của bạn</h2><span class="pill green">5 thành phần</span></div><div class="form-grid"><label class="full-width">01 · Mục tiêu học tập<input name="goal" maxlength="180" required value="${esc(promptDraft.goal)}"></label><label>02 · Từ cần học<input name="word" maxlength="80" required value="${esc(promptDraft.word)}"></label><label>03 · Trình độ<select name="level">${['Lớp 11 · A2–B1','Cơ bản · A1–A2','Nâng cao · B1–B2'].map(x=>`<option ${promptDraft.level===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="full-width">Ngữ cảnh hoặc câu bạn muốn kiểm tra<textarea name="context" rows="3" maxlength="500" required>${esc(promptDraft.context)}</textarea></label><label class="full-width">04 · Yêu cầu cụ thể<textarea name="request" rows="3" maxlength="600" required>${esc(promptDraft.request)}</textarea></label><label class="full-width">05 · Cách trình bày<select name="format">${['Theo từng mục ngắn','Bảng dễ so sánh','Từng bước, có ví dụ'].map(x=>`<option ${promptDraft.format===x?'selected':''}>${x}</option>`).join('')}</select></label></div></form><section class="card prompt-preview"><span class="mini-label">${icon('spark')} PROMPT ĐƯỢC GHÉP TRỰC TIẾP</span><div id="prompt-output" class="prompt-output"></div><div class="row wrap" style="margin-top:18px"><button class="button primary" data-action="copy-prompt">${icon('copy')} Sao chép prompt</button><button class="button" data-action="prompt-to-ai">Dùng với Mây AI ↗</button></div><ul class="tips-list"><li>${icon('check')}Có câu gốc giúp AI hiểu đúng nghĩa.</li><li>${icon('check')}Tự trả lời trước khi xem lời giải.</li><li>${icon('check')}Đối chiếu thông tin quan trọng với từ điển.</li></ul></section></div>`;}
  function updatePrompt(){const form=$('prompt-form');if(!form)return;promptDraft=Object.fromEntries(new FormData(form));$('prompt-output').textContent=`Bạn là gia sư tiếng Anh. Trình độ của tôi: ${promptDraft.level}.\n\nMục tiêu: ${promptDraft.goal}.\nTừ cần học: ${promptDraft.word}.\nNgữ cảnh: ${promptDraft.context}\n\n${promptDraft.request}\n\nTrình bày: ${promptDraft.format}. Nếu chưa chắc, hãy nói rõ; không tự bịa thông tin. Hướng dẫn tôi tự suy nghĩ thay vì làm hộ.`;}
  function exercisePage(){if(attempt?.kind==='exercise')return quizPage();return heading('Tự thử sức. Hiểu sâu hơn.','Bài tập riêng biệt, có lời giải ngay sau mỗi câu trả lời.')+`<section class="feature-banner"><div><p class="eyebrow">BÀI LUYỆN TỔNG HỢP</p><h2>Từ vựng & kỹ năng học với AI</h2><p>8 câu hỏi ngẫu nhiên về nghĩa, điền từ và cách dùng AI. Mỗi đáp án là một cơ hội để hiểu thêm.</p></div><button class="button primary" data-start-quiz="exercise">Bắt đầu luyện tập ${icon('arrow')}</button></section><div class="exercise-features">${[['01','Hiểu đúng nghĩa','Nhận ra nghĩa phù hợp của từ trong từng ngữ cảnh.'],['02','Dùng từ trong câu','Chọn từ còn thiếu, phân biệt từ loại và cụm từ.'],['03','Học AI chủ động','Luyện viết prompt, kiểm chứng thông tin và tự học.']].map(([n,t,p])=>`<div class="card"><span class="big-number">${n}</span><h3>${t}</h3><p>${p}</p></div>`).join('')}</div><p class="privacy-note">+10 XP cho mỗi câu trả lời đúng lần đầu trong ngày. Làm lại giúp củng cố kiến thức và không cộng điểm trùng.</p>`;}
  function filteredWords(){return words.filter(w=>(deckFilter==='all'||(deckFilter==='custom'?w.custom:w.seen))&&(`${w.word} ${w.meaning}`.toLowerCase().includes(search.toLowerCase())));}
  function flashPage(){return heading('Mỗi thẻ, một điều mới.','Thử nhớ trước, lật thẻ sau. Từ của bạn được lưu riêng theo tài khoản.',`<button class="button primary" data-action="add-card">＋ Thêm từ mới</button>`)+`<div class="deck-toolbar"><div class="segmented" aria-label="Chọn bộ thẻ">${[['all','Tất cả'],['seen','Đã học'],['custom','Của tôi']].map(([id,t])=>`<button data-filter="${id}" aria-pressed="${deckFilter===id}">${t}</button>`).join('')}</div><input id="word-search" type="search" value="${esc(search)}" placeholder="Tìm từ hoặc nghĩa…" aria-label="Tìm trong bộ thẻ"></div><div id="flash-content"></div>`;}
  function renderFlash(){const list=filteredWords();flashIndex=Math.min(flashIndex,Math.max(0,list.length-1));const w=list[flashIndex];if(!w){$('flash-content').innerHTML=empty('Chưa có từ phù hợp.','Thử đổi bộ lọc, tìm từ khác hoặc thêm một từ mới.');return;}$('flash-content').innerHTML=`<div class="flash-layout"><section><button class="flashcard ${flipped?'flipped':''}" data-action="flip" aria-label="${flipped?'Mặt nghĩa. Bấm để xem từ':'Lật thẻ để xem nghĩa'}"><span class="eyebrow">${flipped?'NGHĨA & NGỮ CẢNH':'BẠN CÓ NHỚ TỪ NÀY?'}</span><strong ${flipped?'':'lang="en"'}>${esc(flipped?w.meaning:w.word)}</strong><p>${esc(flipped?w.example:w.pos)}</p><span class="flip-hint">${icon('cards')} Bấm vào thẻ để lật</span></button><div class="flashcard-actions"><button class="button" data-action="remember-no" ${!flipped?'disabled':''}>Ôn lại sớm</button><button class="button primary" data-action="remember-yes" ${!flipped?'disabled':''}>${icon('check')} Mình đã nhớ</button><button class="button" data-speak="${esc(w.word)}" aria-label="Nghe phát âm">${icon('volume')}</button></div><div class="row between"><button class="button ghost" data-action="flash-prev" aria-label="Thẻ trước">←</button><span class="deck-counter">Thẻ ${flashIndex+1} / ${list.length} · ${w.seen?'Đã học':'Từ mới'}</span><button class="button ghost" data-action="flash-next" aria-label="Thẻ sau">→</button></div><p class="privacy-note">Tự đánh giá để lên lịch ôn. Điểm XP được tính khi làm bài trắc nghiệm.</p></section><section class="card"><div class="section-heading"><h2>Trong bộ thẻ này</h2><span class="pill">${list.length} từ</span></div><div class="word-list">${list.map((word,i)=>`<div class="word-row"><button data-flash-index="${i}" style="text-align:left;flex:1"><strong lang="en">${esc(word.word)}</strong><small>${esc(word.meaning)}</small></button><span class="word-state">${word.isDue?'Đến hạn':word.seen?'✓ Đã học':'Mới'}</span>${word.custom?`<button data-delete-word="${word.id}" aria-label="Xóa từ ${esc(word.word)}">${icon('close')}</button>`:''}</div>`).join('')}</div></section></div>`;}
  function reviewPage(){if(attempt?.kind==='review')return quizPage();const seen=words.filter(w=>w.seen),due=seen.filter(w=>w.isDue);return heading('Gặp lại để nhớ lâu.','Ôn bằng trắc nghiệm từ chính những flashcard bạn đã học.')+(seen.length?`<div class="review-summary"><div class="card"><strong>${seen.length}</strong><span>Từ đã học</span></div><div class="card"><strong>${due.length}</strong><span>Từ đến hạn hôm nay</span></div><div class="card"><strong>${seen.filter(w=>w.level>=3).length}</strong><span>Từ đã củng cố nhiều lần</span></div></div><section class="feature-banner"><div><p class="eyebrow">LƯỢT ÔN DÀNH RIÊNG CHO BẠN</p><h2>${due.length?'Đã đến lúc gặp lại '+due.length+' từ.':'Bạn đã theo kịp lịch ôn.'}</h2><p>${due.length?'Ưu tiên từ đến hạn. Tối đa 10 câu mỗi lượt, có lời giải và lịch ôn tiếp theo.':'Bạn vẫn có thể luyện lại các từ đã học để củng cố thêm.'}</p></div><button class="button primary" data-start-quiz="review">${due.length?'Bắt đầu ôn tập':'Luyện thêm một lượt'} ${icon('arrow')}</button></section><section class="card"><div class="section-heading"><h2>Sổ từ đã học</h2><span class="pill">Lịch ôn cá nhân</span></div><div class="word-list">${[...seen].sort((a,b)=>a.due.localeCompare(b.due)).map(w=>`<div class="word-row"><div><strong>${esc(w.word)}</strong><small>${esc(w.meaning)}</small></div><span class="word-state">${w.isDue?'Ôn hôm nay':new Date(w.due+'T12:00:00+07:00').toLocaleDateString('vi-VN')}</span></div>`).join('')}</div></section>`:empty('Bắt đầu với một flashcard.','Học và tự đánh giá ít nhất một từ. Sổ tay sẽ tạo bài ôn từ những từ đó, không trộn từ bạn chưa học.','flashcards','Mở Flashcard'));}
  function quizPage(){const q=attempt.question;if(!q)return '';return heading(attempt.kind==='review'?'Nhớ lại, từng từ một.':'Tự thử sức, từng câu một.','Chọn đáp án bạn tin là đúng. Lời giải sẽ xuất hiện sau khi kiểm tra.')+`<div class="quiz-wrap"><div class="quiz-head"><span>Câu ${q.index} / ${q.total}</span><button class="text-link" data-action="quit-quiz">Kết thúc lượt này</button></div><progress max="${q.total}" value="${q.index-1}" aria-label="Tiến độ bài tập"></progress><div class="card quiz-card"><p class="eyebrow">${attempt.kind==='review'?'ÔN TỪ ĐÃ HỌC':'LUYỆN TẬP TỔNG HỢP'}</p><h2>${esc(q.question)}</h2><div class="quiz-options" role="group" aria-label="Chọn đáp án">${q.options.map((x,i)=>`<button class="quiz-option" data-answer="${i}" aria-pressed="false"><span class="option-letter">${'ABCD'[i]}</span>${esc(x)}</button>`).join('')}</div><div id="quiz-feedback" role="status"></div><button class="button primary full" data-action="grade" id="grade-button" style="margin-top:22px" disabled>Kiểm tra đáp án</button></div></div>`;}
  function restoreQuizState(){
    const button=$('grade-button');if(!button||!attempt)return;
    document.querySelectorAll('[data-answer]').forEach(el=>{const n=Number(el.dataset.answer);el.setAttribute('aria-pressed',String(n===selectedAnswer));el.disabled=!!answerResult||grading;el.classList.toggle('correct',!!answerResult&&n===answerResult.correctIndex);el.classList.toggle('wrong',!!answerResult&&n===selectedAnswer&&!answerResult.correct);});
    if(!answerResult){button.disabled=selectedAnswer===null||grading;return;}
    const r=answerResult;
    $('quiz-feedback').innerHTML='<div class="quiz-feedback '+(r.correct?'':'wrong')+'"><strong>'+(r.correct?'Chính xác!':'Chưa đúng, mình cùng xem lại.')+' '+(r.xp?'+'+r.xp+' XP':'')+'</strong>'+esc(r.explanation)+(r.correct&&!r.xp?'<p style="margin:8px 0 0">Câu này đã được cộng điểm hôm nay.</p>':'')+'</div>';
    button.disabled=false;button.dataset.action='next-question';button.textContent=r.next?'Câu tiếp theo →':'Xem kết quả';
  }
  function translationPage(){return heading('Hiểu nghĩa. Nắm ngữ cảnh.','Dịch hai chiều Anh – Việt, rồi đối chiếu cách dùng của từ.')+`<form id="translate-form"><div class="two-columns equal"><section class="card translation-card"><div class="translation-header"><label for="translation-direction" class="muted">Ngôn ngữ gốc</label><select id="translation-direction" name="direction"><option value="en-vi">Tiếng Anh → Tiếng Việt</option><option value="vi-en">Tiếng Việt → Tiếng Anh</option></select></div><textarea id="translation-source" name="source" rows="7" maxlength="600" required aria-label="Nội dung cần dịch" placeholder="Ví dụ: Small steps lead to meaningful progress."></textarea><div class="translation-foot"><span id="translation-count">0 / 600 ký tự</span><button class="button primary small" type="submit">Dịch văn bản ${icon('arrow')}</button></div></section><section class="card translation-card translation-output"><div class="translation-header"><strong>Bản dịch</strong><span class="pill green">Đọc để hiểu</span></div><textarea id="translation-result" rows="7" readonly aria-label="Bản dịch" placeholder="Bản dịch sẽ xuất hiện ở đây…"></textarea><div class="translation-foot"><span id="translation-provider">Anh ↔ Việt</span><button class="button small" type="button" data-action="copy-translation" id="copy-translation" disabled>${icon('copy')} Sao chép</button></div></section></div><p id="translation-status" role="status" class="form-status"></p><p class="privacy-note">Khi bấm Dịch, nội dung được gửi tới Google; nếu dịch vụ không phản hồi, website thử MyMemory. Tránh gửi thông tin cá nhân. Bản dịch tự động cần được kiểm tra theo ngữ cảnh.</p><a class="text-link" href="https://www.oxfordlearnersdictionaries.com/" target="_blank" rel="noopener noreferrer">Đối chiếu từ với Oxford Learner’s Dictionaries ↗</a></form>`;}
  function rankPage(data){return heading('Xếp hạng trên máy.','So sánh tiến độ giữa các hồ sơ trong trình duyệt này, không phải bảng xếp hạng trực tuyến.',`<span class="pill green">${data.myRank?'Hạng của bạn: #'+data.myRank:'Học theo nhịp của mình'}</span>`)+`<div class="two-columns"><section class="card"><div class="section-heading"><h2>Bảng xếp hạng</h2><div class="segmented"><button data-rank-period="week" aria-pressed="${rankPeriod==='week'}">7 ngày</button><button data-rank-period="all" aria-pressed="${rankPeriod==='all'}">Tất cả</button></div></div>${data.rows.length?`<table class="leaderboard-table"><thead><tr><th>HẠNG</th><th>NGƯỜI HỌC</th><th>XP</th></tr></thead><tbody>${data.rows.map(r=>`<tr class="${r.me?'me':''}"><td class="rank-number">${r.rank<=3?'✧ ':''}${r.rank}</td><td><span class="rank-avatar">${esc(r.name.slice(0,2).toUpperCase())}</span>${esc(r.name)} ${r.me?'<span class="pill green">Bạn</span>':''}</td><td><strong>${r.xp}</strong></td></tr>`).join('')}</tbody></table>`:'<div class="empty-state"><h2>Chưa có thứ hạng.</h2><p>Người học tham gia và có điểm sẽ xuất hiện ở đây. Bạn có thể là người đầu tiên.</p></div>'}</section><aside><div class="card" style="margin-bottom:20px"><h2>Chọn cách bạn tham gia</h2><p class="subtext">Chỉ tên hiển thị và điểm của các hồ sơ trên máy này được đưa lên bảng.</p><label class="check-label"><input id="rank-opt-in" type="checkbox" ${user.publicRank?'checked':''}><span>Hiển thị tôi trên bảng xếp hạng</span></label><p class="privacy-note">Bạn luôn học và tích điểm được khi tắt tùy chọn này.</p><a class="button primary full" href="#exercises">Luyện tập để tiến bộ ${icon('arrow')}</a></div><div class="leaderboard-rules"><h3>Điểm đến từ nỗ lực thật</h3><ul><li>+10 XP cho mỗi câu đúng mới trong ngày.</li><li>Câu làm lại không cộng điểm trùng.</li><li>Tự đánh giá flashcard không cộng XP.</li><li>Bảng 7 ngày dùng múi giờ Việt Nam.</li></ul><p>Điểm lưu trên máy nhằm tạo động lực tự học, không dùng để chứng nhận hay thi đua trực tuyến.</p></div></aside></div>`;}
  function aiPage(){
    const setup=localTutor?`<section id="ai-setup" class="notice ai-setup">
      <label for="ai-model">Mô hình trả lời</label>
      <div class="row ai-model-row">
        <select id="ai-model">
          <option value="cloud">Đám mây · Gemma 4</option>
          <option value="standard">Nhẹ · Qwen 1.5B</option>
          <option value="advanced">Mạnh hơn · Qwen 3B</option>
        </select>
        <button class="button primary small" type="button" data-action="ai-enable">Bật Mây AI</button>
      </div>
      <p id="ai-model-info"></p>
      <a class="text-link" href="#tools">Ghép và sao chép prompt</a>
      <progress id="ai-progress" max="100" hidden aria-label="Tiến độ tải mô hình"></progress>
      <p id="ai-detail" role="status"></p>
    </section>`:aiConfigured?'':'<div class="notice">Mây AI đang chờ kết nối. <a href="#tools">Ghép và sao chép prompt</a></div>';
    const disabled=canChat()?'':'disabled';
    const history=localTutor?`<aside class="chat-history">
      <details open><summary>Lịch sử trò chuyện</summary>
        <div class="row">
          <button class="button small" type="button" data-action="chat-new">Cuộc trò chuyện mới</button>
          <button class="text-link" type="button" data-action="chat-delete" hidden>Xóa</button>
        </div>
        <div id="chat-history-list"></div>
      </details>
    </aside>`:'';
    const search=localTutor?`<label class="check-label chat-search"><input name="web" type="checkbox">
      <span><strong>Tìm trên web</strong><small>Khi bật, web gửi từ khóa từ câu hỏi tới Wikimedia.</small></span>
    </label>`:'';
    const privacy=localTutor?'Lịch sử lưu theo hồ sơ trên trình duyệt này.':'Tin nhắn được gửi tới nhà cung cấp AI khi bạn bấm Gửi.';
    return heading('Mây AI, bạn học của bạn.','Hỏi nghĩa một từ, luyện đặt câu hoặc kiểm tra điều bạn chưa chắc.')+`<div class="chat-layout ${localTutor?'with-history':''}">
      ${history}
      <div class="chat-panel">
        <div class="ai-welcome"><div class="orb" aria-hidden="true"></div><h2>Hôm nay, mình cùng học gì?</h2></div>
        ${setup}
        <div class="ai-prompts"><button data-ai-prompt="Giải thích sustainable trong cụm a sustainable study routine cho học sinh lớp 11.">✧ Giải thích một từ theo ngữ cảnh</button><button data-ai-prompt="Hãy giúp tôi luyện đặt câu với contribute. Cho gợi ý, chờ tôi viết rồi mới góp ý.">✎ Luyện đặt câu, từng bước một</button></div>
        <div id="chat-log" class="chat-log" aria-live="polite" aria-label="Cuộc trò chuyện"></div>
        <form id="chat-form">
          ${search}
          <div class="chat-compose">
            <textarea id="chat-input" name="message" rows="2" maxlength="${localTutor?6000:2000}" required aria-label="Tin nhắn cho Mây AI" placeholder="Nhập điều bạn muốn học…" ${!localTutor&&!aiConfigured?'disabled':''}></textarea>
            <button class="button primary" type="submit" ${disabled} aria-label="Gửi tin nhắn">${icon('arrow')}</button>
          </div>
        </form>
        <p id="chat-status" class="form-status" role="status"></p>
        <p id="chat-privacy" class="privacy-note">${privacy} Hãy kiểm chứng câu trả lời.</p>
      </div>
    </div>`;
  }
  function selectChat(thread){
    chatSelection=thread?.id??null;
    chat=thread?.messages.slice()??[];
  }
  function renderChatHistory(){
    const list=$('chat-history-list');
    if(!list)return;
    list.innerHTML=chatThreads.length?chatThreads.map(thread=>`<button type="button" data-chat-id="${esc(thread.id)}"
      aria-pressed="${thread.id===chatSelection}" ${chatJob||deletingChat?'disabled':''}>${esc(thread.title)}</button>`).join('')
      :'<p class="muted">Chưa có cuộc trò chuyện nào.</p>';
    const remove=document.querySelector('[data-action="chat-delete"]');
    remove.hidden=!chatSelection;
    remove.disabled=!!chatJob||deletingChat;
    document.querySelector('[data-action="chat-new"]').disabled=!!chatJob||deletingChat;
  }
  function openChat(thread){
    selectChat(thread);
    renderChatHistory();
    renderChat();
    $('chat-input').value='';
    $('chat-status').textContent='';
    $('chat-input').focus();
  }
  function syncTutor(){
    const setup=$('ai-setup');
    if(!setup||!localTutor)return;
    const {state,detail,progress,model,selection,activeModel,ready}=localTutor;
    const selector=$('ai-model');
    selector.value=selection;
    selector.disabled=state==='loading'||state==='unsupported'||!!chatJob;
    const button=setup.querySelector('button');
    button.hidden=state==='unsupported'||ready;
    setup.querySelector('a').hidden=ready;
    button.disabled=state==='loading'||!!chatJob;
    button.textContent=state==='loading'?'Đang bật…':state==='error'?'Thử lại':activeModel?'Đổi mô hình':'Bật Mây AI';
    $('ai-model-info').textContent=selection==='cloud'?'Gửi câu hỏi ngay, không cần tải mô hình.'
      :ready?'Đang dùng '+model.label+'.'
      :`Lần đầu tải khoảng ${model.download}.${selection==='advanced'?' Dành cho bài luận và câu hỏi nhiều ý. Cần nhiều bộ nhớ đồ họa hơn.':''}`;
    $('chat-privacy').textContent=selection==='cloud'
      ?'Khi gửi, câu hỏi và tối đa 4 lượt hỏi đáp gần nhất được chuyển tới Cloudflare để tạo câu trả lời. Lịch sử vẫn lưu trên trình duyệt này.'
      :'Mô hình chạy trên thiết bị. Lịch sử lưu theo hồ sơ trên trình duyệt này. Hãy kiểm chứng câu trả lời.';
    const meter=$('ai-progress');
    meter.hidden=state!=='loading';
    if(progress===null)meter.removeAttribute('value');
    else meter.value=progress;
    const status=$('ai-detail');
    if(status.textContent!==detail)status.textContent=detail;
    $('chat-form').querySelector('button').disabled=!canChat();
    const chatStatus=$('chat-status');
    if(chatJob)chatStatus.textContent=chatJob.status;
  }
  window.addEventListener('study-ai-state',syncTutor);
  function renderChat(){
    const log=$('chat-log');
    if(!log)return;
    log.innerHTML=chat.map(message=>{
      const links=(message.sources||[]).map((source,index)=>`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">[${index+1}] ${esc(source.title)}</a>`).join('');
      const sources=links?`<div class="chat-sources"><strong>Nguồn tìm được</strong>${links}</div>`:'';
      const note=message.note?`<small class="chat-source-note">${esc(message.note)}</small>`:'';
      return `<div class="message ${message.role==='user'?'user':''}"><strong>${message.role==='user'?'Bạn':'Mây AI'}</strong>${esc(message.content)}${sources}${note}</div>`;
    }).join('');
    if(chatJob?.partial){
      log.insertAdjacentHTML('beforeend','<div id="chat-partial" class="message" aria-hidden="true"><strong>Mây AI</strong><span></span></div>');
      log.lastElementChild.lastElementChild.textContent=chatJob.partial;
    }
    log.scrollTop=log.scrollHeight;
  }
  function showChatChunk(job, text){
    if(chatJob!==job)return;
    job.partial=text;
    const bubble=$('chat-partial');
    if(!bubble){renderChat();return;}
    bubble.lastElementChild.textContent=text;
    const log=$('chat-log');
    log.scrollTop=log.scrollHeight;
  }
  function accountPage(){return heading('Không gian mang tên bạn.','Điều chỉnh một mục tiêu vừa sức, rồi kiên trì với nó.')+`<div class="two-columns account-grid"><form id="profile-form" class="card"><h2>Hồ sơ học tập</h2><label>Tên hiển thị<input name="name" value="${esc(user.name)}" required minlength="2" maxlength="32"></label><label>Tên đăng nhập<input value="${esc(user.username)}" readonly aria-readonly="true"></label><label>Mục tiêu mỗi ngày<select name="goal">${[5,10,15].map(n=>`<option value="${n}" ${user.goal===n?'selected':''}>${n} câu trả lời đúng mới</option>`).join('')}</select></label><label>Hiệu ứng chuyển động<select id="motion-mode" name="motion">${[["system","Theo cài đặt hệ thống"],["full","Bật đầy đủ hiệu ứng"],["reduced","Giảm chuyển động"]].map(([v,t])=>`<option value="${v}" ${window.studyMotion?.preference()===v?"selected":""}>${t}</option>`).join("")}</select></label><p class="privacy-note">Tùy chọn chuyển động áp dụng riêng cho trình duyệt này.</p><p id="profile-status" class="form-status" role="status"></p><button class="button primary full">Lưu thay đổi</button></form><div class="card"><h2>Hành trình của bạn</h2><p class="subtext">Tiến độ, từ cá nhân và lịch ôn được lưu trong trình duyệt này. Không tự đồng bộ sang máy khác. Xóa dữ liệu website sẽ xóa hồ sơ.</p><button class="button full" data-action="guide-replay">${icon('book')} Đọc lại sách hướng dẫn</button><button class="button full" data-action="intro-replay" style="margin-top:12px">${icon('spark')} Xem lại intro</button><hr style="border:0;border-top:1px solid var(--line);margin:27px 0"><button class="button full danger" data-action="logout">Đăng xuất</button></div></div>`;}

  document.addEventListener('click',async event=>{
    const b=event.target.closest('button,[data-route]');if(!b||b.disabled)return;
    try{
      if(b.dataset.route)return navigate(b.dataset.route);
      if(b.dataset.introChoice){introChoice=b.dataset.introChoice;showIntro();return;}
      if(b.dataset.chapter!==undefined){await changeGuide(Number(b.dataset.chapter));return;}
      if(b.dataset.template){const type=b.dataset.template;promptDraft.request=type==='quiz'?'Tạo 5 câu trắc nghiệm với 4 lựa chọn về từ này. Hỏi từng câu và đợi tôi trả lời trước khi giải thích đáp án.':type==='check'?'Kiểm tra câu tôi viết: nghĩa, ngữ pháp, cách dùng từ. Chỉ rõ lỗi và gợi ý để tôi tự sửa trước khi đưa câu mẫu.':'Giải thích nghĩa, từ loại và cho 2 ví dụ có bản dịch. Tạo 1 câu điền từ và chờ tôi trả lời trước khi đưa đáp án.';promptDraft.goal=type==='quiz'?'Luyện nhớ và dùng từ':type==='check'?'Tự sửa câu để dùng từ chính xác':'Hiểu và dùng từ theo ngữ cảnh';$('prompt-form').elements.request.value=promptDraft.request;$('prompt-form').elements.goal.value=promptDraft.goal;document.querySelectorAll('[data-template]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));updatePrompt();return;}
      if(b.dataset.filter){deckFilter=b.dataset.filter;flashIndex=0;flipped=false;document.querySelectorAll('[data-filter]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));renderFlash();return;}
      if(b.dataset.flashIndex!==undefined){flashIndex=Number(b.dataset.flashIndex);flipped=false;renderFlash();return;}
      if(b.dataset.openWord){deckFilter='all';search='';flashIndex=words.findIndex(w=>w.id===b.dataset.openWord);flipped=false;navigate('flashcards');return;}
      if(b.dataset.speak){if(!('speechSynthesis'in window))throw new Error('Trình duyệt này chưa hỗ trợ đọc từ.');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(b.dataset.speak);u.lang='en-US';u.rate=.85;speechSynthesis.speak(u);return;}
      if(b.dataset.deleteWord){if(!confirm('Xóa từ cá nhân này và lịch ôn của từ?'))return;await api('words/'+b.dataset.deleteWord,null,'DELETE');words=words.filter(w=>w.id!==b.dataset.deleteWord);renderFlash();toast('Đã xóa từ cá nhân.');return;}
      if(b.dataset.startQuiz){b.disabled=true;const version=routeVersion;const data=await api('quiz',{kind:b.dataset.startQuiz});if(version!==routeVersion||screen!=='app-shell')return;attempt={...data,kind:b.dataset.startQuiz};selectedAnswer=null;answerResult=null;$('main-content').innerHTML=quizPage();focusTitle($('main-content'));return;}
      if(b.dataset.answer!==undefined){if(answerResult||grading)return;selectedAnswer=Number(b.dataset.answer);document.querySelectorAll('[data-answer]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));$('grade-button').disabled=false;return;}
      if(b.dataset.rankPeriod){rankPeriod=b.dataset.rankPeriod;return renderRoute();}
      if(b.dataset.aiPrompt){if(!localTutor&&!aiConfigured){toast('Mây AI chưa được kết nối. Bạn có thể dùng Công cụ AI để ghép prompt.');return;}$('chat-input').value=b.dataset.aiPrompt;$('chat-input').focus();return;}
      if(b.dataset.chatId){
        if(!chatJob&&!deletingChat)openChat(chatThreads.find(thread=>thread.id===b.dataset.chatId));
        return;
      }
      const action=b.dataset.action;
      if(action==='chat-new'&&!chatJob&&!deletingChat)openChat();
      if(action==='chat-delete'&&!chatJob&&!deletingChat&&chatSelection&&confirm('Xóa cuộc trò chuyện này?')){
        const id=chatSelection,owner=user.id;
        deletingChat=true;
        syncTutor();
        renderChatHistory();
        try{
          await api('conversations',{id,userId:owner},'DELETE');
          if(user?.id===owner){
            chatThreads=chatThreads.filter(thread=>thread.id!==id);
            if($('chat-input'))openChat(chatThreads[0]);
            else selectChat(chatThreads[0]);
          }
        }finally{
          if(user?.id===owner){deletingChat=false;syncTutor();renderChatHistory();}
        }
      }
      if(action==='toggle-password'){const field=$('auth-password');const show=field.type==='password';field.type=show?'text':'password';b.textContent=show?'Ẩn':'Hiện';b.setAttribute('aria-label',show?'Ẩn mật khẩu':'Hiện mật khẩu');b.setAttribute('aria-pressed',String(show));}
      if(action==='login-tab')showAuth(false);
      if(action==='register-tab')showAuth(true);
      if(action==='retry')renderRoute();
      if(action==='logout'){b.disabled=true;await api('logout',{});user=null;resetChat();attempt=null;words=[];promptDraft.context='';deckFilter='all';search='';flashIndex=0;introChoice='';$('card-dialog').close();history.replaceState(null,'',location.pathname);showAuth();}
      if(action==='intro-back'){introStep--;showIntro();}
      if(action==='intro-next'){if(introStep<3){introStep++;showIntro();}else{b.disabled=true;user=(await api('profile',{intro:true})).user;guideReplay=user.guide>=4;guideStep=-1;showGuide();}}
      if(action==='intro-replay'){introStep=0;showIntro();}
      if(action==='guide-replay'){guideReplay=true;guideStep=-1;showGuide();}
      if(action==='guide-open')await moveGuideCover(true);
      if(action==='guide-back'){
        if(guideBusy)return;
        if(guideStep>0)await changeGuide(guideStep-1);
        else await moveGuideCover(false);
      }
      if(action==='guide-close'){showScreen('app-shell');navigate('home');}
      if(action==='guide-next'){
        if(guideBusy)return;
        if(guideStep<3)await changeGuide(guideStep+1,true);
        else{
          guideBusy=true;guideNavigation();
          try{
            if(!guideReplay)user=(await api('profile',{guide:4})).user;
            await animateGuideCover(false);
            showScreen('app-shell');$('profile-button').textContent=user.name.slice(0,2).toUpperCase();navigate('home');
          }finally{guideBusy=false;guideNavigation();}
        }
      }
      if(action==='ai-enable'){
        await localTutor.enable();
        if(localTutor.ready&&$('chat-input')){
          $('chat-status').textContent='Mây AI đã sẵn sàng.';
          $('chat-input').focus();
        }
      }
      if(action==='copy-prompt'){if(!$('prompt-form').reportValidity())return;await copy($('prompt-output').textContent);}
      if(action==='prompt-to-ai'){
        if(!$('prompt-form').reportValidity())return;
        chatDraft=$('prompt-output').textContent;
        navigate('ai');
      }
      if(action==='add-card'){$('card-form').reset();$('card-error').textContent='';$('card-dialog').showModal();}
      if(action==='close-card')$('card-dialog').close();
      if(action==='flip'){if(flipping)return;flipping=true;const update=()=>{flipped=!flipped;renderFlash();};try{if(window.studyMotion)await window.studyMotion.flip(b,update);else update();}finally{flipping=false;}}
      if(action==='flash-next'||action==='flash-prev'){const list=filteredWords();flashIndex=(flashIndex+(action==='flash-next'?1:-1)+list.length)%list.length;flipped=false;renderFlash();}
      if(action==='remember-yes'||action==='remember-no'){if(!flipped)return;b.disabled=true;const w=filteredWords()[flashIndex];await api('study',{id:w.id,remembered:action==='remember-yes'});words=(await api('words')).words;flashIndex=(flashIndex+1)%Math.max(1,filteredWords().length);flipped=false;if($('flash-content'))renderFlash();toast(action==='remember-yes'?'Đã lưu. Hẹn gặp lại từ này ở lượt ôn sau.':'Đã đưa từ vào lượt ôn sớm.');}
      if(action==='quit-quiz'){if(!confirm('Kết thúc lượt này? Điểm các câu đã làm vẫn được giữ.'))return;attempt=null;renderRoute();}
      if(action==='grade'){if(selectedAnswer===null||answerResult||grading)return;b.disabled=true;grading=true;const a=attempt;try{const result=await api('answer',{id:a.id,index:a.question.index,answer:selectedAnswer});if(attempt!==a)return;answerResult=result;}finally{grading=false;if(b.isConnected)b.disabled=false;}if(attempt===a)restoreQuizState();}
      if(action==='next-question'){if(answerResult.next){attempt.question=answerResult.next;answerResult=null;selectedAnswer=null;$('main-content').innerHTML=quizPage();}else{const r=answerResult;const kind=attempt.kind;attempt=null;answerResult=null;selectedAnswer=null;$('main-content').innerHTML=`<div class="quiz-wrap"><div class="card quiz-result"><div class="result-medal">✧</div><p class="eyebrow">THÊM MỘT BƯỚC TIẾN</p><h1>Bạn đã hoàn thành lượt học!</h1><div class="score">${r.score} / ${r.total}</div><p class="subtext">câu trả lời đúng · +${r.earned} XP</p><p>${r.score===r.total?'Bạn đã nắm rất tốt. Hãy thử dùng từ trong câu của riêng mình.':'Mỗi lỗi sai chỉ ra một điều cần ôn. Cứ tiến thêm từng chút nhé.'}</p><div class="row wrap" style="justify-content:center"><button class="button primary" data-start-quiz="${kind}">Luyện lượt mới</button><a class="button" href="#home">Về tổng quan</a></div></div></div>`;}window.scrollTo(0,0);focusTitle($('main-content'));}
      if(action==='copy-translation')await copy($('translation-result').value);
    }catch(e){toast(e.message);if(b.isConnected)b.disabled=false;}
  });
  async function copy(text){if(!text)return;try{await navigator.clipboard.writeText(text);toast('Đã sao chép.');}catch{toast('Chưa truy cập được clipboard. Hãy chọn nội dung và dùng Ctrl+C.');}}
  document.addEventListener('input',e=>{if(e.target.closest('#prompt-form'))updatePrompt();if(e.target.id==='word-search'){search=e.target.value;flashIndex=0;flipped=false;renderFlash();}if(e.target.id==='translation-source'){$('translation-count').textContent=e.target.value.length+' / 600 ký tự';translationController?.abort();$('translation-result').value='';$('copy-translation').disabled=true;$('translation-status').textContent='';}});
  document.addEventListener('change',async e=>{if(e.target.id==='ai-model')localTutor.select(e.target.value);if(e.target.id==='motion-mode'){window.studyMotion?.setPreference(e.target.value);toast('Đã đổi chế độ chuyển động.');}if(e.target.closest('#prompt-form'))updatePrompt();if(e.target.id==='translation-direction'){translationController?.abort();$('translation-result').value='';$('copy-translation').disabled=true;$('translation-status').textContent='';$('translation-source').placeholder=e.target.value==='en-vi'?'Ví dụ: Small steps lead to meaningful progress.':'Ví dụ: Mỗi ngày, tôi học thêm một điều mới.';}if(e.target.id==='rank-opt-in'){const el=e.target;el.disabled=true;try{user=(await api('profile',{publicRank:el.checked})).user;toast(user.publicRank?'Đã tham gia bảng xếp hạng.':'Đã ẩn bạn khỏi bảng xếp hạng.');renderRoute();}catch(err){el.checked=!el.checked;el.disabled=false;toast(err.message);}}});
  async function sendChat(form){
    if(!canChat())return;
    const message=form.elements.message.value.trim();
    if(!message)return;
    const job={
      owner:user.id,id:chatSelection,turnId:crypto.randomUUID(),
      status:'Mây đang suy nghĩ…',partial:''
    };
    const history=chat.slice(-8);
    chatJob=job;
    chat.push({role:'user',content:message});
    $('chat-status').textContent=job.status;
    form.elements.message.value='';
    renderChat();
    renderChatHistory();
    let status='';
    try{
      const data=await (localTutor?localTutor.reply(message,history,{
        search:form.elements.web.checked,
        onStatus(text){
          if(chatJob!==job)return;
          job.status=text;
          if($('chat-status'))$('chat-status').textContent=text;
        },
        onChunk:text=>showChatChunk(job,text)
      }):api('ai',{message,history}));
      if(chatJob!==job)return;
      job.partial='';
      chat.push({role:'assistant',content:data.answer,sources:data.sources,note:data.note});
      if(localTutor){
        try{
          const {thread}=await api('conversations',{
            id:job.id||crypto.randomUUID(),existing:!!job.id,userId:job.owner,turnId:job.turnId,
            question:message,answer:data.answer,sources:data.sources,note:data.note
          });
          if(chatJob!==job)return;
          chatThreads=[thread,...chatThreads.filter(item=>item.id!==thread.id)];
          selectChat(thread);
        }catch{
          status='Cuộc trò chuyện chưa lưu được trên trình duyệt.';
        }
      }
    }catch(error){
      if(chatJob!==job)return;
      chat.pop();
      const input=$('chat-input');
      if(input&&!input.value)input.value=message;
      status=error.message;
    }finally{
      if(chatJob===job){
        chatJob=null;
        syncTutor();
        renderChat();
        renderChatHistory();
        if($('chat-status'))$('chat-status').textContent=status;
      }
    }
  }
  document.addEventListener('submit',async e=>{const f=e.target;if(!['auth-form','prompt-form','card-form','translate-form','chat-form','profile-form'].includes(f.id))return;e.preventDefault();if(f.id==='prompt-form')return;const b=f.querySelector('[type="submit"],button:not([type])');if(b?.disabled)return;if(b)b.disabled=true;try{
    if(f.id==='auth-form'){const data=Object.fromEntries(new FormData(f));$('auth-status').textContent='';user=(await api(f.dataset.register==='true'?'register':'login',data)).user;aiConfigured=(await api('session')).aiConfigured;enter();}
    if(f.id==='card-form'){await api('words',Object.fromEntries(new FormData(f)));words=(await api('words')).words;$('card-dialog').close();toast('Đã thêm từ mới vào bộ thẻ.');if(currentRoute==='flashcards'){deckFilter='custom';search='';flashIndex=0;flipped=false;renderRoute();}}
    if(f.id==='profile-form'){const data=Object.fromEntries(new FormData(f));user=(await api('profile',{name:data.name,goal:Number(data.goal)})).user;$('profile-button').textContent=user.name.slice(0,2).toUpperCase();$('profile-status').textContent='';toast('Đã lưu hồ sơ học tập.');}
    if(f.id==='translate-form'){translationController?.abort();const controller=new AbortController();translationController=controller;const status=$('translation-status'),output=$('translation-result'),copyButton=$('copy-translation');const [from,to]=f.elements.direction.value.split('-');const source=f.elements.source.value.trim();if(!source)throw new Error('Nhập nội dung cần dịch.');status.textContent='Đang dịch văn bản…';output.value='';copyButton.disabled=true;try{const result=await window.handbookLanguage.translate(source,from,to,AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),true);if(!output.isConnected||controller.signal.aborted)return;output.value=result.translated;output.lang=to;copyButton.disabled=false;status.textContent='Đã dịch. Hãy đọc lại theo ngữ cảnh của bạn.';$('translation-provider').textContent=result.fallback?'Dịch bởi MyMemory':'Dịch bởi Google';}catch(err){if(controller.signal.aborted)return;throw new Error('Chưa dịch được lúc này. Kiểm tra kết nối mạng rồi thử lại.');}}
    if(f.id==='chat-form')await sendChat(f);

  }catch(err){const id={'auth-form':'auth-status','card-form':'card-error','profile-form':'profile-status','translate-form':'translation-status','chat-form':'chat-status'}[f.id];if($(id))$(id).textContent=err.message;else toast(err.message);}finally{if(b?.isConnected)b.disabled=f.id==='chat-form'&&!canChat();}});
  window.addEventListener('hashchange',renderRoute);
  document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
  (async()=>{try{if(location.protocol==='file:')throw new Error('Hãy chạy MO-WEB.cmd trong thư mục dự án, rồi mở http://127.0.0.1:4317. Tài khoản cần máy chủ để hoạt động.');const session=await api('session');user=session.user;aiConfigured=session.aiConfigured;enter();}catch(e){$('boot').innerHTML=`<img class="brand-mark" src="book.png" alt=""><p class="error-card">${esc(e.message)}</p><button class="button" id="reload-app">Thử lại</button>`;$('reload-app').addEventListener('click',()=>location.reload());}})();
})();
