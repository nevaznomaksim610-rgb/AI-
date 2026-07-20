/* Прототип: реального API нет, все ответы — заглушки */

var AVATAR = 'assets/galina-avatar.png';
var API_REPLY = 'Тут будет отвечать ваше апи.';

/* режимы: ключ -> зелёный префикс в поле ввода */
var MODES = {
  sign:   'Подпиши документ:',
  create: 'Создай документ:',
  check:  'Проверь договор:',
  law:    'Найди в своде законов'   // остался для сохранённых чатов в меню
};

var state = { mode: null, busy: false, files: [], fileSeq: 0 };

function $(sel, root){ return (root || document).querySelector(sel); }

/* ---------- переход между экранами ---------- */
function goTo(id){
  var target = document.getElementById(id);
  if(!target) return;
  document.querySelectorAll('.screen').forEach(function(s){
    s.classList.toggle('is-active', s === target);
  });
}

/* ---------- выбор режима ---------- */
function selectMode(key){
  if(state.busy) return;
  state.mode = key;

  var field = $('[data-field]');
  field.setAttribute('data-prefix', MODES[key]);

  var title = $('[data-title]');
  if(title) title.textContent = 'Что-то случилось?';

  document.querySelectorAll('.action').forEach(function(a){
    a.classList.toggle('is-active', a.dataset.mode === key);
  });

  focusEnd(field);
}

/* кнопка отправки видна, когда есть текст или прикреплённые файлы */
function refreshComposer(){
  var field = $('[data-field]');
  var has = field.textContent.trim().length > 0 || state.files.length > 0;
  $('.composer').classList.toggle('has-text', has);
}

/* =========================================================
   ФАЙЛЫ — загрузка тут фиктивная, просто показываем процесс
   ========================================================= */
function uploadFile(){
  if(state.busy) return;
  closeAttach();

  var overlay = $('.upload');
  overlay.classList.add('is-open');

  setTimeout(function(){
    overlay.classList.remove('is-open');
    state.fileSeq += 1;
    state.files.push('File' + state.fileSeq);
    renderFiles();
    focusEnd($('[data-field]'));
  }, 1600);
}

function removeFile(name){
  state.files = state.files.filter(function(f){ return f !== name; });
  renderFiles();
}

function renderFiles(){
  var box = $('[data-files]');
  box.innerHTML = '';

  state.files.forEach(function(name){
    var chip = document.createElement('span');
    chip.className = 'file-chip';

    var label = document.createElement('span');
    label.className = 'file-chip__name';
    label.textContent = name;

    var x = document.createElement('button');
    x.className = 'file-chip__x';
    x.setAttribute('aria-label', 'Убрать ' + name);
    x.innerHTML = '<svg viewBox="0 0 24 24" class="ic">' +
                    '<line x1="5.5" y1="5.5" x2="18.5" y2="18.5"/>' +
                    '<line x1="18.5" y1="5.5" x2="5.5" y2="18.5"/>' +
                  '</svg>';
    x.onclick = function(){ removeFile(name); };

    chip.appendChild(label);
    chip.appendChild(x);
    box.appendChild(chip);
  });

  box.classList.toggle('has-files', state.files.length > 0);
  refreshComposer();
}

function focusEnd(el){
  el.focus();
  var r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  var s = window.getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

/* ---------- отправка ---------- */
function send(){
  if(state.busy) return;

  var field = $('[data-field]');
  var text  = field.textContent.trim();
  var files = state.files.slice();
  if(!text && !files.length) return;

  var mode = state.mode;

  // очищаем поле, файлы и сбрасываем режим
  field.textContent = '';
  field.removeAttribute('data-prefix');
  state.mode = null;
  state.files = [];
  renderFiles();
  document.querySelectorAll('.action').forEach(function(a){ a.classList.remove('is-active'); });

  openChat();
  addUserMessage(mode, text, files);

  if(mode === 'create') runCreateFlow();
  else                  runAnswerFlow();
}

/* ---------- переключение на ленту чата ---------- */
function openChat(){
  var home = $('[data-view="home"]');
  var chat = $('[data-view="chat"]');
  if(home) home.hidden = true;
  if(chat) chat.hidden = false;
}

function feed(){ return $('[data-feed]'); }

function scrollDown(){
  var f = feed();
  f.scrollTop = f.scrollHeight;
}

function addUserMessage(mode, text, files){
  var wrap = document.createElement('div');
  wrap.className = 'msg msg--user';

  var bubble = document.createElement('div');
  bubble.className = 'bubble';

  if(files && files.length){
    var box = document.createElement('div');
    box.className = 'bubble__files';
    files.forEach(function(name){
      var f = document.createElement('span');
      f.className = 'bubble__file';
      f.textContent = name;
      box.appendChild(f);
    });
    bubble.appendChild(box);
  }

  if(mode){
    var pfx = document.createElement('span');
    pfx.className = 'pfx';
    pfx.textContent = MODES[mode] + ' ';
    bubble.appendChild(pfx);
  }
  bubble.appendChild(document.createTextNode(text));

  wrap.appendChild(bubble);
  feed().appendChild(wrap);
  scrollDown();
}

/* блок Галины: аватарка + произвольное содержимое */
function addBotBlock(inner){
  var wrap = document.createElement('div');
  wrap.className = 'msg msg--bot';

  var ava = document.createElement('img');
  ava.className = 'msg__ava';
  ava.src = AVATAR;
  ava.alt = '';

  wrap.appendChild(ava);
  wrap.appendChild(inner);
  feed().appendChild(wrap);
  scrollDown();
  return wrap;
}

function statusNode(text){
  var s = document.createElement('div');
  s.className = 'status';
  s.textContent = text;
  return s;
}

function bubbleNode(text){
  var b = document.createElement('div');
  b.className = 'bubble';
  b.textContent = text;
  return b;
}

/* ---------- состояние «занято» ---------- */
function setBusy(on){
  state.busy = on;
  var composer = $('.composer');
  var field    = $('[data-field]');
  composer.classList.toggle('is-busy', on);
  field.setAttribute('data-placeholder', on ? 'Подожди' : 'Задайте юридический вопрос');
  field.setAttribute('contenteditable', on ? 'false' : 'true');
}

/* ---------- обычный ответ: «Думаю…» → текст ---------- */
function runAnswerFlow(){
  setBusy(true);
  var block = addBotBlock(statusNode('Думаю...'));

  setTimeout(function(){
    block.replaceChild(bubbleNode(API_REPLY), block.lastChild);
    scrollDown();
    setBusy(false);
  }, 2200);
}

/* ---------- создание документа: «Думаю…» → скелетон → текст ---------- */
function runCreateFlow(){
  setBusy(true);
  var block = addBotBlock(statusNode('Думаю...'));

  setTimeout(function(){
    // скелетон документа над строкой статуса
    var sk = document.createElement('div');
    sk.className = 'doc-skeleton';
    sk.innerHTML =
      '<div class="doc-page">' +
        '<div class="sk sk--head"></div>' +
        '<div class="sk sk--sub"></div>' +
        '<div class="sk sk--body"></div>' +
        '<div class="sk--row">' +
          '<div class="sk sk--foot a"></div>' +
          '<div class="sk sk--foot b"></div>' +
        '</div>' +
      '</div>';
    feed().insertBefore(sk, block);

    block.replaceChild(statusNode('Создаю...'), block.lastChild);
    scrollDown();

    setTimeout(function(){
      block.replaceChild(bubbleNode(API_REPLY), block.lastChild);
      scrollDown();
      setBusy(false);
    }, 3000);
  }, 1800);
}

/* ---------- ввод ---------- */
document.addEventListener('keydown', function(e){
  var field = e.target.closest && e.target.closest('[data-field]');
  if(!field) return;
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    send();
  }
});

document.addEventListener('input', function(e){
  if(e.target.closest && e.target.closest('[data-field]')) refreshComposer();
});

/* поле хранит только текст — чистим вставку из буфера */
document.addEventListener('paste', function(e){
  var field = e.target.closest && e.target.closest('[data-field]');
  if(!field) return;
  e.preventDefault();
  var text = (e.clipboardData || window.clipboardData).getData('text');
  document.execCommand('insertText', false, text);
});

/* =========================================================
   ОКНА РАЗДЕЛОВ: Поддержка / Отзывы / Почта
   ========================================================= */
var REVIEW_TEXT = 'Неплохой AI-помощник. Помог разобраться с процедурой банкротства ' +
                  'физических лиц. Иногда зависает при загрузке документов, но разработчики, ' +
                  'надеюсь, исправят. По качеству ответов — твёрдая четвёрка. Рекомендую попробовать.';

function stars(filled){
  var s = '';
  for(var i = 1; i <= 5; i++){
    s += i <= filled ? '★' : '<i>★</i>';
  }
  return s;
}

function review(name, filled){
  return '<div class="review">' +
           '<div class="review__top">' +
             '<span class="review__ava">A</span>' +
             '<span class="review__name">' + name + '</span>' +
             '<span class="review__stars">' + stars(filled) + '</span>' +
           '</div>' +
           '<div class="review__text">' + REVIEW_TEXT + '</div>' +
         '</div>';
}

var MODALS = {
  support: {
    title: 'Поддержка',
    icon: '<svg viewBox="0 0 24 24" class="ic">' +
            '<path d="M4.2 15.4v-3.6a7.8 7.8 0 1115.6 0v3.6"/>' +
            '<rect x="2.6" y="13.6" width="4" height="6" rx="2"/>' +
            '<rect x="17.4" y="13.6" width="4" height="6" rx="2"/>' +
          '</svg>',
    body: 'Привет! Я технический помощник Windexs. ' +
          'Буду несказанно рад ответить на твои вопросы',
    placeholder: 'Тут вы можете задать свой вопрос',
    note: ''
  },

  reviews: {
    title: 'Отзывы',
    icon: '<svg viewBox="0 0 24 24" class="ic">' +
            '<path d="M12 3.2l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.6l6-.9z"/>' +
          '</svg>',
    body: review('Антон Григорьев', 5) +
          review('Антон Григорьев', 3) +
          review('Антон Григорьев', 5) +
          review('Антон Григорьев', 5) +
          review('Антон Григорьев', 5) +
          review('Антон Григорьев', 4),
    placeholder: 'Напишите отзыв',
    note: '*Отзыв будет опубликован после проверки администратором'
  },

  mail: {
    title: 'Почта',
    icon: '<svg viewBox="0 0 24 24" class="ic">' +
            '<rect x="2.8" y="5" width="18.4" height="14" rx="3"/>' +
            '<path d="M3.6 7.4L12 13.4l8.4-6"/>' +
          '</svg>',
    body: 'Пришлём готовые документы и ответы Галины на вашу почту — ' +
          'чтобы не искать их в переписке. Укажите адрес, на который отправлять.',
    placeholder: 'Введите адрес почты',
    note: '*Письма приходят с адреса no-reply@windexs.ru'
  }
};

function openModal(key){
  var m = MODALS[key];
  if(!m) return;

  $('[data-modal-ic]').innerHTML   = m.icon;
  $('[data-modal-title]').textContent = m.title;
  $('[data-modal-body]').innerHTML = m.body;
  $('[data-modal-note]').textContent = m.note;

  var field = $('[data-modal-field]');
  field.textContent = '';
  field.setAttribute('data-placeholder', m.placeholder);

  $('[data-modal-body]').scrollTop = 0;
  $('.modal').classList.add('is-open');
  $('.modal-scrim').classList.add('is-open');
  closeDrawer();
}

function closeModal(){
  $('.modal').classList.remove('is-open');
  $('.modal-scrim').classList.remove('is-open');
}

/* отправка тут фиктивная — просто очищаем поле */
function sendModal(){
  $('[data-modal-field]').textContent = '';
}

/* =========================================================
   ЭКРАНЫ НАСТРОЕК И ПРОФИЛЯ
   ========================================================= */
function openPanel(name){
  var p = $('[data-panel="' + name + '"]');
  if(!p) return;
  p.querySelector('.panel__scroll').scrollTop = 0;
  p.classList.add('is-open');
  closeDrawer();
}

function closePanel(name){
  var p = $('[data-panel="' + name + '"]');
  if(p) p.classList.remove('is-open');
}

function closeAllPanels(){
  document.querySelectorAll('.panel').forEach(function(p){
    p.classList.remove('is-open');
  });
}

/* =========================================================
   ОКНО ПОПОЛНЕНИЯ
   ========================================================= */

/* чем больше сумма, тем выше скидка */
function topupDiscount(amount){
  if(amount >= 5000) return 20;
  if(amount >= 3000) return 15;
  if(amount >= 1000) return 10;
  return 0;
}

function openTopup(amount){
  setTopup(amount || 1000);
  $('.topup').classList.add('is-open');
  $('.topup-scrim').classList.add('is-open');
}

function closeTopup(){
  $('.topup').classList.remove('is-open');
  $('.topup-scrim').classList.remove('is-open');
}

/* выбор суммы кнопкой или карточкой */
function setTopup(amount){
  $('[data-topup-field]').textContent = amount;
  refreshTopup();
}

/* пересчёт скидки и подсветка выбранного варианта */
function refreshTopup(){
  var raw = ($('[data-topup-field]').textContent || '').replace(/\D/g, '');
  var amount = parseInt(raw, 10) || 0;
  var saved = Math.round(amount * topupDiscount(amount) / 100);

  $('[data-topup-save]').textContent = saved ? 'Вы сохраните ' + saved + '₽' : '';

  document.querySelectorAll('.topup .quick').forEach(function(b){
    b.classList.toggle('is-active', parseInt(b.textContent, 10) === amount);
  });
  document.querySelectorAll('.plans--topup .plan').forEach(function(p){
    var tier = parseInt(p.querySelector('.plan__price').textContent.replace(/\D/g, ''), 10);
    p.classList.toggle('is-active', amount >= tier && topupDiscount(amount) === topupDiscount(tier));
  });
}

/* сумму вводят руками — пересчитываем на лету */
document.addEventListener('input', function(e){
  if(e.target.closest && e.target.closest('[data-topup-field]')) refreshTopup();
});

/* =========================================================
   ШТОРКА С ТАРИФОМ
   ========================================================= */
function openSheet(){
  $('.sheet').classList.add('is-open');
  $('.sheet-scrim').classList.add('is-open');
}
function closeSheet(){
  $('.sheet').classList.remove('is-open');
  $('.sheet-scrim').classList.remove('is-open');
}

/* =========================================================
   СОЗВОН — 3 состояния: слушаю / выключен микрофон / говорит Галина
   ========================================================= */
var callTimer = null;

function openCall(){
  var call = $('.call');
  call.classList.add('is-open');
  setCallState('listening');
  cycleCall();
}

function closeCall(){
  clearTimeout(callTimer);
  callTimer = null;
  var call = $('.call');
  call.classList.remove('is-open', 'is-speaking', 'is-muted');
}

function setCallState(s){
  var call = $('.call');
  var label = $('[data-call-status]');

  call.classList.toggle('is-speaking', s === 'speaking');
  call.classList.toggle('is-muted',    s === 'muted');

  label.textContent =
    s === 'speaking' ? 'Галина отвечает' :
    s === 'muted'    ? 'Микрофон выключен' :
                       'Говорите, я слушаю';
}

/* сама «беседа»: послушала — ответила — снова слушает */
function cycleCall(){
  clearTimeout(callTimer);
  callTimer = setTimeout(function(){
    if(!$('.call').classList.contains('is-open')) return;
    if($('.call').classList.contains('is-muted')) { cycleCall(); return; }

    setCallState('speaking');
    callTimer = setTimeout(function(){
      if(!$('.call').classList.contains('is-open')) return;
      setCallState('listening');
      cycleCall();
    }, 3400);
  }, 3200);
}

function toggleMic(){
  var call = $('.call');
  if(call.classList.contains('is-speaking')) return;   // Галину не перебиваем
  setCallState(call.classList.contains('is-muted') ? 'listening' : 'muted');
}

/* =========================================================
   СТРАНИЦА ДОКУМЕНТА (открывается из «Мои договоры»)
   ========================================================= */
function showPage(title, body){
  $('[data-page-title]').textContent = title;
  $('[data-page-body]').innerHTML = body;
  $('.page__scroll').scrollTop = 0;
  $('.page').classList.add('is-open');
  closeDrawer();
}

function closePage(){ $('.page').classList.remove('is-open'); }

/* просмотр сохранённого договора */
function openDoc(name){
  showPage(name,
    '<p class="page__lead">Черновик готов. Проверьте данные перед подписанием.</p>' +
    '<div class="docview"><div class="docview__page">' +
      '<div class="docview__h">' + name.toUpperCase() + '</div>' +
      'г. Москва<br>«___» __________ 2026 г.<br><br>' +
      'Настоящий договор заключён между Стороной 1 и Стороной 2 о нижеследующем.<br><br>' +
      '1. Предмет договора<br>' +
      '1.1. Исполнитель обязуется оказать услуги, а Заказчик — принять и оплатить их.<br><br>' +
      '2. Стоимость и порядок расчётов<br>' +
      '2.1. Стоимость услуг составляет ______ рублей.<br><br>' +
      '3. Ответственность сторон<br>' +
      '3.1. Стороны несут ответственность в соответствии с законодательством РФ.' +
    '</div></div>' +
    '<div class="page-actions">' +
      '<button class="btn-ghost">Скачать .docx</button>' +
      '<button class="btn-solid">Отправить на почту</button>' +
    '</div>');
}

/* открытие сохранённой переписки */
function openSavedChat(name){
  closeDrawer();
  closePage();
  openChat();
  feed().innerHTML = '';
  addUserMessage('law', name);
  addBotBlock(bubbleNode(API_REPLY));
}

/* новый чат — возвращаемся к стартовому виду */
function newChat(){
  closeDrawer();
  closePage();
  closeCall();
  closeModal();
  closeAllPanels();
  closeTopup();
  clearTimeout(callTimer);

  feed().innerHTML = '';
  $('[data-view="chat"]').hidden = true;
  $('[data-view="home"]').hidden = false;

  var field = $('[data-field]');
  field.textContent = '';
  field.removeAttribute('data-prefix');
  state.mode = null;
  state.files = [];
  renderFiles();
  setBusy(false);

  $('[data-title]').textContent = 'Чем могу помочь?';
  document.querySelectorAll('.action').forEach(function(a){ a.classList.remove('is-active'); });
}

/* пункты сайдбара: «Закон …» — переписка, «Договор …» — документ */
document.querySelectorAll('.drawer__item').forEach(function(item){
  item.addEventListener('click', function(){
    var name = item.textContent.trim();
    if(name.indexOf('Договор') === 0) openDoc(name);
    else                              openSavedChat(name);
  });
});

/* ---------- меню вложений ---------- */
function toggleAttach(btn){
  var menu = btn.closest('.composer-wrap').querySelector('[data-attach]');
  menu.classList.toggle('is-open');
}
function closeAttach(){
  document.querySelectorAll('[data-attach]').forEach(function(m){
    m.classList.remove('is-open');
  });
}

/* ---------- сайдбар ----------
   На телефоне выезжает поверх экрана, на десктопе стоит постоянно
   и кнопка его сворачивает.                                        */
function isDesktop(){
  return window.matchMedia('(min-width:900px)').matches;
}

function openDrawer(btn){
  var screen = btn.closest('.screen');
  screen.querySelector('.drawer').classList.add('is-open');
  screen.querySelector('.drawer-scrim').classList.add('is-open');
}

function closeDrawer(){
  document.querySelectorAll('.drawer, .drawer-scrim').forEach(function(el){
    el.classList.remove('is-open');
  });
}

/* кнопка в шапке */
function menuButton(btn){
  if(isDesktop()) $('.screen--main').classList.remove('no-sidebar');
  else            openDrawer(btn);
}

/* кнопка внутри сайдбара */
function toggleSidebar(){
  if(isDesktop()) $('.screen--main').classList.add('no-sidebar');
  else            closeDrawer();
}

/* клик мимо меню вложений закрывает его */
document.addEventListener('click', function(e){
  if(e.target.closest('[data-attach]') || e.target.closest('.plus-btn')) return;
  closeAttach();
});

/* Esc закрывает всё */
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    closeAttach(); closeDrawer(); closeSheet(); closePage();
    closeCall(); closeModal(); closeAllPanels(); closeTopup();
  }
});
