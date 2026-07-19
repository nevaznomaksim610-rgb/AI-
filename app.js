/* Прототип: реального API нет, все ответы — заглушки */

var AVATAR = 'assets/galina-avatar.png';
var API_REPLY = 'Тут будет отвечать ваше апи.';

/* режимы: ключ -> зелёный префикс в поле ввода */
var MODES = {
  law:    'Найди в своде законов',
  create: 'Создай документ:',
  check:  'Проверь договор:'
};

var state = { mode: null, busy: false };

function $(sel, root){ return (root || document).querySelector(sel); }

/* ---------- переход между экранами (на узких экранах) ---------- */
function goTo(id){
  var target = document.getElementById(id);
  if(!target) return;
  var block = target.closest('.screen-block');
  document.querySelectorAll('.screen-block').forEach(function(b){
    b.classList.toggle('is-active', b === block);
  });
  document.body.classList.add('nav-started');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  if(!text) return;

  var mode = state.mode;

  // очищаем поле и сбрасываем режим
  field.textContent = '';
  field.removeAttribute('data-prefix');
  state.mode = null;
  document.querySelectorAll('.action').forEach(function(a){ a.classList.remove('is-active'); });

  openChat();
  addUserMessage(mode, text);

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

function addUserMessage(mode, text){
  var wrap = document.createElement('div');
  wrap.className = 'msg msg--user';

  var bubble = document.createElement('div');
  bubble.className = 'bubble';

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

/* поле хранит только текст — чистим вставку из буфера */
document.addEventListener('paste', function(e){
  var field = e.target.closest && e.target.closest('[data-field]');
  if(!field) return;
  e.preventDefault();
  var text = (e.clipboardData || window.clipboardData).getData('text');
  document.execCommand('insertText', false, text);
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
   РАЗДЕЛЫ МЕНЮ
   ========================================================= */
var PAGES = {
  consult: {
    title: 'Консультация',
    body:
      '<p class="page__lead">Если вопрос сложный — подключим живого юриста. ' +
      'Галина передаст ему всю переписку, повторять ничего не придётся.</p>' +
      card('Онлайн-консультация', '1 500 ₽', 'Разговор 30 минут в чате или по видео. Ответ в течение часа.') +
      card('Разбор документа', '2 500 ₽', 'Юрист вычитает договор, выпишет риски и предложит правки.') +
      card('Сопровождение сделки', 'от 7 000 ₽', 'Ведём сделку от проверки контрагента до подписания.') +
      '<div class="page-actions"><button class="btn-solid">Записаться</button></div>'
  },

  news: {
    title: 'Новости',
    body:
      '<p class="page__lead">Что изменилось в законах за последнюю неделю.</p>' +
      news('20 июля 2026', 'Новые правила удалённой работы',
           'В ТК РФ уточнили порядок перевода сотрудника на удалёнку без его согласия.') +
      news('18 июля 2026', 'Поправки к 44-ФЗ приняты в третьем чтении',
           'Сроки оплаты по госконтрактам сокращают с 15 до 7 рабочих дней.') +
      news('15 июля 2026', 'Верховный суд — о спорах по аренде',
           'Разъяснено, когда арендатор вправе съехать без штрафа.') +
      news('11 июля 2026', 'Регистрация ИП — по новому порядку',
           'Подать документы можно через приложение банка, госпошлина отменена.')
  },

  reviews: {
    title: 'Отзывы',
    body:
      '<div class="rating">' +
        '<div class="rating__num">4,8</div>' +
        '<div><div class="rating__stars">★★★★★</div>' +
        '<div class="rating__count">1 240 оценок</div></div>' +
      '</div>' +
      review('Марина К.', '★★★★★', 'Составила заявление на возврат товара за пять минут. В магазине приняли без вопросов.') +
      review('Дмитрий О.', '★★★★★', 'Проверил договор аренды — Галина нашла пункт про автопродление, который я пропустил.') +
      review('Алексей В.', '★★★★☆', 'Отвечает быстро и по делу. По узким вопросам всё же пришлось идти к живому юристу.') +
      review('Ольга С.', '★★★★★', 'Удобно, что можно голосом. Спросила по дороге с работы, ответ пришёл сразу.') +
      '<div class="page-actions"><button class="btn-ghost">Оставить отзыв</button></div>'
  },

  support: {
    title: 'Поддержка',
    body:
      '<p class="page__lead">Отвечаем с 9:00 до 21:00 по Москве, обычно в течение 10 минут.</p>' +
      card('Как пополнить счёт?', '', 'Кнопка «Пополнить» в блоке с балансом. Оплата картой или через СБП.') +
      card('Списали деньги, а ответа нет', '', 'Напишите нам — вернём списание за неудавшийся запрос.') +
      card('Можно ли использовать ответ в суде?', '', 'Галина готовит проект документа. Перед подачей его стоит показать юристу.') +
      card('Как удалить переписку?', '', 'Долгое нажатие на чат в боковом меню — «Удалить».') +
      '<div class="page-actions">' +
        '<button class="btn-ghost">Написать в чат</button>' +
        '<button class="btn-solid">Позвонить</button>' +
      '</div>'
  }
};

function card(name, price, desc){
  return '<div class="card"><div class="card__top">' +
           '<div class="card__name">' + name + '</div>' +
           (price ? '<div class="card__price">' + price + '</div>' : '') +
         '</div><div class="card__desc">' + desc + '</div></div>';
}

function news(date, title, desc){
  return '<div class="card">' +
           '<div class="card__date">' + date + '</div>' +
           '<div class="card__name" style="margin-top:4px">' + title + '</div>' +
           '<div class="card__desc">' + desc + '</div></div>';
}

function review(name, stars, text){
  return '<div class="card"><div class="card__top">' +
           '<div class="card__name">' + name + '</div>' +
           '<div class="rating__stars">' + stars + '</div>' +
         '</div><div class="card__desc">' + text + '</div></div>';
}

function showPage(title, body){
  $('[data-page-title]').textContent = title;
  $('[data-page-body]').innerHTML = body;
  $('.page__scroll').scrollTop = 0;
  $('.page').classList.add('is-open');
  closeDrawer();
}

function openPage(key){
  var p = PAGES[key];
  if(p) showPage(p.title, p.body);
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
  clearTimeout(callTimer);

  feed().innerHTML = '';
  $('[data-view="chat"]').hidden = true;
  $('[data-view="home"]').hidden = false;

  var field = $('[data-field]');
  field.textContent = '';
  field.removeAttribute('data-prefix');
  state.mode = null;
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

/* ---------- сайдбар ---------- */
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

/* клик мимо меню вложений закрывает его */
document.addEventListener('click', function(e){
  if(e.target.closest('[data-attach]') || e.target.closest('.plus-btn')) return;
  closeAttach();
});

/* Esc закрывает всё */
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){ closeAttach(); closeDrawer(); closeSheet(); closePage(); closeCall(); }
});
