#!/usr/bin/env node
//
// Patches xboard-user umi.js bundle: replaces ko-KR locale with ru-RU.
//
// What it does:
//   1. Finds the ko-KR translation block (Chinese keys → Korean values) and
//      replaces all values with Russian from ru-RU.json
//   2. Replaces the NaiveUI ko-KR component locale (date formats, buttons, etc.)
//   3. Renames "ko-KR" → "ru-RU" everywhere and "한국어" → "Русский"
//   4. Changes default locale fallback from zh-CN to ru-RU
//   5. Regenerates .br and .gz compressed bundles
//
// Usage:
//   node patch-ru.js              # patch assets/umi.js in place
//   git submodule update --remote  # pull upstream first, then run this
//

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUNDLE = path.join(__dirname, 'assets', 'umi.js');
const RU_JSON = path.join(__dirname, 'ru-RU.json');

// ── Load files ──────────────────────────────────────────────────────────────

if (!fs.existsSync(BUNDLE)) {
  console.error('ERROR: assets/umi.js not found');
  process.exit(1);
}
if (!fs.existsSync(RU_JSON)) {
  console.error('ERROR: ru-RU.json not found');
  process.exit(1);
}

let bundle = fs.readFileSync(BUNDLE, 'utf8');
const ru = JSON.parse(fs.readFileSync(RU_JSON, 'utf8'));

console.log('Loaded bundle:', (bundle.length / 1024).toFixed(0), 'KB');
console.log('Loaded ru-RU.json:', Object.keys(ru).length, 'translation keys');

// ── 1. Replace ko-KR app translations ──────────────────────────────────────

// Find the ko-KR translation block by looking for Korean text (first entry value).
// The block is a JS object: {请求失败:"요청실패",月付:"월간",...}
const koAnchor = bundle.indexOf('请求失败:"요청실패"');
if (koAnchor === -1) {
  console.error('ERROR: Could not find ko-KR translation block (Korean text not found)');
  console.error('Has ko-KR already been replaced, or has the bundle structure changed?');
  process.exit(1);
}

// Walk backwards to find the opening {
let koStart = koAnchor;
while (koStart > 0 && bundle[koStart] !== '{') koStart--;

// Walk forwards to find the matching closing }
let depth = 0;
let koEnd;
for (let i = koStart; i < bundle.length; i++) {
  if (bundle[i] === '{') depth++;
  else if (bundle[i] === '}') {
    depth--;
    if (depth === 0) { koEnd = i + 1; break; }
  }
}
const koRaw = bundle.substring(koStart, koEnd);

// Parse the original ko-KR to get the key order
let koObj;
try {
  koObj = new Function('return ' + koRaw)();
} catch (e) {
  console.error('ERROR: Could not parse ko-KR translation block:', e.message);
  process.exit(1);
}
console.log('Found ko-KR block:', Object.keys(koObj).length, 'keys at position', koStart);

// Build the replacement JS object string with Russian values
const parts = [];
for (const key of Object.keys(koObj)) {
  const val = ru[key] || koObj[key]; // fallback to Korean if key missing from ru-RU.json
  // Always JSON.stringify both key and value for safety (handles commas, quotes, etc.)
  parts.push(JSON.stringify(key) + ':' + JSON.stringify(val));
}
const ruJs = '{' + parts.join(',') + '}';

// Verify it's valid JS
try {
  new Function('return ' + ruJs)();
} catch (e) {
  console.error('ERROR: Generated ru-RU JS object is invalid:', e.message);
  process.exit(1);
}

bundle = bundle.substring(0, koStart) + ruJs + bundle.substring(koEnd);
console.log('Replaced app translations (' + koRaw.length + ' → ' + ruJs.length + ' chars)');

// ── 2. Replace NaiveUI component locale ─────────────────────────────────────

const naiveRu = '{name:"ru-RU",global:{undo:"Отменить",redo:"Повторить",confirm:"Подтвердить",clear:"Очистить"},Popconfirm:{positiveText:"Подтвердить",negativeText:"Отмена"},Cascader:{placeholder:"Выберите",loading:"Загрузка",loadingRequiredMessage:e=>`Загрузите все дочерние элементы ${e} перед выбором.`},Time:{dateFormat:"dd.MM.yyyy",dateTimeFormat:"dd.MM.yyyy HH:mm:ss"},DatePicker:{yearFormat:"yyyy",monthFormat:"MMM",dayFormat:"eeeeee",yearTypeFormat:"yyyy",monthTypeFormat:"yyyy-MM",dateFormat:"dd.MM.yyyy",dateTimeFormat:"dd.MM.yyyy HH:mm:ss",quarterFormat:"yyyy-QQQ",weekFormat:"yyyy-w",clear:"Очистить",now:"Сейчас",confirm:"Подтвердить",selectTime:"Выбрать время",selectDate:"Выбрать дату",datePlaceholder:"Выберите дату",datetimePlaceholder:"Выберите дату и время",monthPlaceholder:"Выберите месяц",yearPlaceholder:"Выберите год",quarterPlaceholder:"Выберите квартал",weekPlaceholder:"Выберите неделю",startDatePlaceholder:"Дата начала",endDatePlaceholder:"Дата окончания",startDatetimePlaceholder:"Дата и время начала",endDatetimePlaceholder:"Дата и время окончания",startMonthPlaceholder:"Начальный месяц",endMonthPlaceholder:"Конечный месяц",monthBeforeYear:!0,firstDayOfWeek:0,today:"Сегодня"},DataTable:{checkTableAll:"Выбрать все",uncheckTableAll:"Снять выбор",confirm:"Подтвердить",clear:"Очистить"},LegacyTransfer:{sourceTitle:"Источник",targetTitle:"Назначение"},Transfer:{selectAll:"Выбрать все",unselectAll:"Снять выбор",clearAll:"Очистить",total:e=>`Всего ${e}`,selected:e=>`Выбрано ${e}`,placeholder:"Выберите"},Empty:{description:"Нет данных"},Select:{placeholder:"Выберите"},TimePicker:{placeholder:"Выберите время",positiveText:"ОК",negativeText:"Отмена",now:"Сейчас",clear:"Очистить"},Pagination:{goto:"Перейти к",selectionSuffix:"стр.",next:"Далее",previous:"Назад"},DynamicTags:{add:"Добавить"},Log:{loading:"Загрузка"},Input:{placeholder:"Введите"},InputNumber:{placeholder:"Введите"},DynamicInput:{create:"Создать"},ThemeEditor:{title:"Редактор темы",clearAllVars:"Сбросить все",clearSearch:"Очистить поиск",filterCompName:"Фильтр по компоненту",filterVarName:"Фильтр по переменной",import:"Импорт",export:"Экспорт",restore:"Сбросить"},Image:{tipPrevious:"Назад (←)",tipNext:"Далее (→)",tipCounterclockwise:"Повернуть влево",tipClockwise:"Повернуть вправо",tipZoomOut:"Уменьшить",tipZoomIn:"Увеличить",tipDownload:"Скачать",tipClose:"Закрыть (Esc)",tipOriginalSize:"Исходный размер"}}';

// Find the NaiveUI ko-KR locale block: {name:"ko-KR",global:{undo:...}}
const naiveAnchor = 'name:"ko-KR",global:{undo:';
let naiveIdx = bundle.indexOf(naiveAnchor);
if (naiveIdx === -1) {
  console.log('NaiveUI ko-KR locale not found (may already be patched), skipping');
} else {
  // Walk back to the opening {
  let naiveStart = naiveIdx;
  while (naiveStart > 0 && bundle[naiveStart] !== '{') naiveStart--;
  // Walk forward to find the matching closing }
  depth = 0;
  let naiveEnd;
  for (let i = naiveStart; i < bundle.length; i++) {
    if (bundle[i] === '{') depth++;
    else if (bundle[i] === '}') {
      depth--;
      if (depth === 0) { naiveEnd = i + 1; break; }
    }
  }
  const oldNaive = bundle.substring(naiveStart, naiveEnd);
  bundle = bundle.substring(0, naiveStart) + naiveRu + bundle.substring(naiveEnd);
  console.log('Replaced NaiveUI locale (' + oldNaive.length + ' → ' + naiveRu.length + ' chars)');
}

// ── 3. Rename ko-KR → ru-RU everywhere ─────────────────────────────────────

const koCodeCount = (bundle.match(/"ko-KR"/g) || []).length;
bundle = bundle.replaceAll('"ko-KR"', '"ru-RU"');
console.log('Replaced "ko-KR" →  "ru-RU" (' + koCodeCount + ' occurrences)');

const koNameCount = (bundle.match(/"한국어"/g) || []).length;
bundle = bundle.replaceAll('"한국어"', '"Русский"');
console.log('Replaced "한국어" → "Русский" (' + koNameCount + ' occurrences)');

bundle = bundle.replaceAll('./lang/ko-KR.json', './lang/ru-RU.json');
console.log('Replaced lang file path references');

// ── 4. Replace route meta titles (used in document.title / browser tab) ─────

const routeTitles = {
  '仪表盘': 'Главная',
  '我的邀请': 'Мои приглашения',
  '使用文档': 'Документация',
  '节点状态': 'Статус серверов',
  '我的订单': 'Мои заказы',
  '订单详情': 'Детали заказа',
  '购买订阅': 'Купить подписку',
  '配置订阅': 'Настройка подписки',
  '个人中心': 'Личный кабинет',
  '我的工单': 'Мои тикеты',
  '工单详情': 'Детали тикета',
  '流量明细': 'Детали трафика',
  '登录页': 'Вход',
  '注册': 'Регистрация',
  '重置密码': 'Сброс пароля',
};

let titleCount = 0;
for (const [zh, ruTitle] of Object.entries(routeTitles)) {
  const old = 'meta:{title:"' + zh + '"';
  const rep = 'meta:{title:"' + ruTitle + '"';
  if (bundle.includes(old)) {
    bundle = bundle.replace(old, rep);
    titleCount++;
  }
}
console.log('Replaced ' + titleCount + '/' + Object.keys(routeTitles).length + ' route meta titles');

// ── 5. Change default locale fallback to ru-RU ─────────────────────────────

const oldDetect = 'const e=navigator.language,t="zh-CN",o=YC.includes(e)?e:t';
const newDetect = 'const e=navigator.language,t="ru-RU",o=YC.includes(e)?e:e.startsWith("ru")?"ru-RU":t';

if (bundle.includes(oldDetect)) {
  bundle = bundle.replace(oldDetect, newDetect);
  console.log('Patched locale detection: default zh-CN → ru-RU');
} else if (bundle.includes(newDetect)) {
  console.log('Locale detection already patched');
} else {
  console.warn('WARNING: Could not find locale detection code — default language not changed');
}

// ── 6. Write bundle and regenerate compressed variants ──────────────────────

fs.writeFileSync(BUNDLE, bundle);
console.log('Wrote', BUNDLE, '(' + (bundle.length / 1024).toFixed(0) + ' KB)');

try {
  execSync(`brotli -f "${BUNDLE}" -o "${BUNDLE}.br"`);
  console.log('Generated', BUNDLE + '.br');
} catch (e) {
  console.warn('WARNING: brotli compression failed (install brotli?):', e.message);
}

try {
  execSync(`gzip -kf "${BUNDLE}"`);
  console.log('Generated', BUNDLE + '.gz');
} catch (e) {
  console.warn('WARNING: gzip compression failed:', e.message);
}

console.log('\nDone! Russian locale patched successfully.');
