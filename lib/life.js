// Between Replies: one life in the Contact Era. The rules and the words, no DOM; app/life.js draws it.
// A life starts at this moment of story time, somewhere in the Solar System, picked by population.
// Years tick one by one; a few of them ask you to choose. The conversation with Ross 128 b runs
// underneath at its own pace, one reply every 21.96 years, so a life hears only a few.
//
// Sources: places, years and jobs come from the InterImm book (book.interimm.org: history/mars_immigration,
// history/space_cities, history/outer_solar, history/terraformingmars, profession/profession,
// guide/mars) and from this site (lib/light.js, archive/2219-signal/). Earth's population and life
// expectancy are the UN World Population Prospects 2024 figures for 2100, held flat. Every other
// population and every lifespan shift is a game assumption, marked ASSUMED below.
import { ROSS_128, YEAR_MS, storyNow } from './light.js';

const D = ROSS_128.distance; // ly, so also years of light travel
export const DETECTED = Date.UTC(2219, 8, 18, 3, 12, 7); // every station hears the duet
export const PUBLIC = Date.UTC(2219, 9, 5); // made public; the first reply goes out
export const AU_MIN = 499.005 / 60; // light minutes per astronomical unit

// ---------- random numbers ----------

/** A small seeded generator (mulberry32), so a seed gives the same birth again. */
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (n) => Math.floor(next() * n);
  next.pick = (list) => list[next.int(list.length)];
  next.chance = (p) => next() < p;
  next.normal = (mean, sd) => mean + sd * Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
  next.weighted = (list, w = (x) => x.weight) => {
    const total = list.reduce((s, x) => s + w(x), 0);
    let r = next() * total;
    for (const x of list) if ((r -= w(x)) < 0) return x;
    return list[list.length - 1];
  };
  next.sample = (list, n) => {
    const pool = [...list], out = [];
    while (pool.length && out.length < n) out.push(pool.splice(next.int(pool.length), 1)[0]);
    return out;
  };
  return next;
}

export const newSeed = () => (Math.random() * 2 ** 32) >>> 0;

// ---------- time ----------

/** Decimal year of an instant (UTC). */
export function yearOf(t) {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const a = Date.UTC(y, 0, 1), b = Date.UTC(y + 1, 0, 1);
  return y + (d.getTime() - a) / (b - a);
}

const PUBLIC_Y = yearOf(PUBLIC);
export const ROUND_TRIP = 2 * D; // 21.96 years

/**
 * The exchange, assuming each side answers the day a message arrives (the game's simplest case; the site
 * only promises "earliest possible"). Lines are in decimal years: `from` leaves, `to` arrives.
 * Incoming lines run Ross 128 b -> Solar System, outgoing the other way.
 */
export function exchange(until = 2400) {
  const lines = [{ dir: 'in', k: 0, from: yearOf(DETECTED) - D, to: yearOf(DETECTED) }];
  for (let k = 0; PUBLIC_Y + k * ROUND_TRIP < until; k++) {
    const sent = PUBLIC_Y + k * ROUND_TRIP;
    lines.push({ dir: 'out', k, from: sent, to: sent + D });
    lines.push({ dir: 'in', k: k + 1, from: sent + D, to: sent + ROUND_TRIP });
  }
  return lines;
}

/** Years the answers arrive in the Solar System (k = 1, 2, ...). */
export const answerYears = (until = 2400) => exchange(until).filter((l) => l.dir === 'in' && l.k > 0 && l.to < until).map((l) => l.to);

// Jupiter and Saturn line up every 19.86 years (the last real one: 2020-12-21). The book's first
// Jupiter-Saturn tour (J-S Route) runs in 2180, on the 2179.8 conjunction; the tours follow each one.
export const GREAT_CONJUNCTION = (y) => {
  const first = 2020.97, p = 19.859;
  return first + Math.ceil((y - first) / p) * p;
};

// ---------- places ----------

// world: where the light-delay and the duet are worked out from. au: mean distance from the Sun.
export const WORLDS = {
  earth: { au: 1, duet: 'tuned', life: 0, zh: '地球', en: 'Earth' },
  moon: { au: 1, duet: 'drift', life: -1, zh: '月球', en: 'the Moon' },
  orbit: { au: 1, duet: 'near', life: -1, zh: '近地轨道', en: 'Earth orbit' },
  mars: { au: 1.524, duet: 'slide', life: -3, zh: '火星', en: 'Mars' }, // weak field, more radiation (book)
  ceres: { au: 2.767, duet: 'slide', life: -3, zh: '谷神星', en: 'Ceres' },
  jupiter: { au: 5.203, duet: 'slide', life: -2, zh: '木星系', en: 'the Jupiter system' },
  titan: { au: 9.537, duet: 'slide', life: 1, zh: '土星系', en: 'the Saturn system' }, // thick air, low radiation (book)
};

// Earth's life expectancy at birth, UN WPP 2024, 2100 (about 82). The world shifts above are ASSUMED.
export const LIFE_EXPECTANCY = 82;
export const LIFE_SD = 11;

// pop: people in 2219. Earth is UN WPP 2024 for 2100 (10.2 billion), held flat. The rest is ASSUMED:
// the book only says a city has over 10,000 people and Nanhe is "close to a mid-sized Earth city".
export const PLACES = [
  { id: 'earth', world: 'earth', pop: 10.2e9, zh: '地球', en: 'Earth', enIn: 'on Earth',
    about: { zh: '一百多亿人里的一个。', en: 'One of more than ten billion.' } },
  { id: 'moon', world: 'moon', pop: 1.2e6, zh: '月球', en: 'the Moon', enIn: 'on the Moon',
    about: { zh: '地球挂在天上，永远不动，因为月球总是同一面朝着它。', en: 'Earth hangs in the sky and never moves: the Moon keeps one face towards it.' } },
  { id: 'waterfall', world: 'orbit', pop: 40e3, zh: '瀑布城', en: 'Waterfall City', enIn: 'in Waterfall City',
    about: { zh: '第一座太空城，2043 年建成，直径 1000 米的圆筒，转起来就有重力。', en: 'The first space city, finished in 2043: a cylinder 1,000 m across that spins for gravity.' } },
  { id: 'starry', world: 'orbit', pop: 90e3, zh: '星夜城', en: 'Starry Night City', enIn: 'in Starry Night City',
    about: { zh: '直径 2000 米的双层太空城，方舟建材的总部在这里。', en: 'A two-deck space city 2,000 m across, home of Ark Building Materials.' } },
  { id: 'nanhe', world: 'mars', circle: 'isidis', pop: 900e3, zh: '南河城', en: 'Procyon City',
    about: { zh: '火星一号城，在伊希地平原，2070 年第一个前哨站就建在这里。行星大学也在这里。', en: 'Mars City One, on Isidis Planitia, where the first outpost stood in 2070. Planetary University is here.' } },
  { id: 'shenxiu', world: 'mars', circle: 'isidis', pop: 300e3, zh: '参宿城', en: 'Orion City',
    about: { zh: '火星二号城，也在伊希地平原，靠南河城供给长大。', en: 'Mars City Two, also on Isidis Planitia, grown on supplies from Procyon City.' } },
  { id: 'tianlang', world: 'mars', circle: 'isidis', pop: 250e3, zh: '天狼城', en: 'Sirius City',
    about: { zh: '火星三号城，伊希地城市圈的第三座城。', en: 'Mars City Three, the third city of the Isidis circle.' } },
  { id: 'loulan', world: 'mars', circle: 'amazonis', pop: 200e3, zh: '楼兰城', en: 'Loulan City',
    about: { zh: '火星四号城，从补给站长成，属于亚马逊城市圈。', en: 'Mars City Four, grown from a supply depot, in the Amazonis circle.' } },
  { id: 'pompeii', world: 'mars', circle: 'amazonis', pop: 180e3, zh: '庞贝城', en: 'Pompeii City',
    about: { zh: '火星五号城，也从补给站长成。', en: 'Mars City Five, also grown from a supply depot.' } },
  { id: 'atlantis', world: 'mars', circle: 'amazonis', pop: 260e3, zh: '亚特兰蒂斯城', en: 'Atlantis City',
    about: { zh: '火星七号城，靠铁矿和低纬度，成了能源与矿业重镇。', en: 'Mars City Seven, an energy and mining town thanks to iron ore and a low latitude.' } },
  { id: 'singularity', world: 'mars', circle: 'meridiani', pop: 150e3, zh: '奇点城', en: 'Singularity City',
    about: { zh: '火星六号城，2145 年落成，子午线城市圈。', en: 'Mars City Six, finished in 2145, in the Meridiani circle.' } },
  { id: 'horizon', world: 'mars', circle: 'meridiani', pop: 220e3, zh: '视界城', en: 'Horizon City',
    about: { zh: '火星八号城，视界星港和火星第一架太空电梯就在旁边。', en: 'Mars City Eight, beside Horizon Spaceport and the first Martian space elevator.' } },
  { id: 'xingzhui', world: 'mars', circle: 'meridiani', pop: 90e3, zh: '星坠城', en: 'Starfall City',
    about: { zh: '火星九号城，原是峡谷里的考察站，2165 年建起行星地质大学。', en: 'Mars City Nine, once a canyon field station; the Planetary Geology University opened here in 2165.' } },
  { id: 'terminus', world: 'mars', circle: 'hellas', pop: 140e3, zh: '端点城', en: 'Terminus City',
    about: { zh: '火星十号城，在希腊平原，以农业为主，稻芽公司从这里起家。', en: 'Mars City Ten, on Hellas Planitia, a farming city where the Rice Sprout company began.' } },
  { id: 'trantor', world: 'mars', circle: 'hellas', pop: 160e3, zh: '川陀城', en: 'Trantor City',
    about: { zh: '火星十一号城，2157 年完工，和端点城一起组成希腊城市圈。', en: 'Mars City Eleven, finished in 2157; with Terminus it forms the Hellas circle.' } },
  { id: 'ceres', world: 'ceres', pop: 60e3, zh: '谷神星', en: 'Ceres', enIn: 'on Ceres',
    about: { zh: '小行星带里最大的一颗，四座脉冲星计时站里最远的一座在这里。', en: 'The largest body in the asteroid belt, with the farthest of the four pulsar-timing stations.' } },
  { id: 'ganymede', world: 'jupiter', pop: 8e3, zh: '木卫三', en: 'Ganymede', enIn: 'on Ganymede',
    about: { zh: '冰层极厚。火纵线 2199 年开始在冰里建月夜冰宫。', en: 'Ice many kilometres thick. Vertical began the Moon-Night Ice Palace inside it in 2199.' } },
  { id: 'callisto', world: 'jupiter', pop: 4e3, zh: '木卫四', en: 'Callisto', enIn: 'on Callisto',
    about: { zh: '离木星远，辐射弱，是给火星供水的采水站。', en: 'Far from Jupiter, with little radiation: the ice mine that waters Mars.' } },
  { id: 'titan', world: 'titan', pop: 20e3, zh: '泰坦', en: 'Titan', enIn: 'on Titan',
    about: { zh: '大气浓厚，辐射很低。游客中心的人和真正爱上这里的第一批移民住在这里。', en: 'Thick air and little radiation. Home to the visitor centre staff and the first settlers who fell for it.' } },
];
export const place = (id) => PLACES.find((p) => p.id === id);
export const TOTAL_POP = PLACES.reduce((s, p) => s + p.pop, 0);

/** How many babies are born for each one born here, if birth rates are the same everywhere (ASSUMED). */
export const oneIn = (p) => TOTAL_POP / p.pop;
export const worldPop = (w) => PLACES.filter((p) => p.world === w).reduce((s, p) => s + p.pop, 0);

/** Pick a birthplace: by population (mode 'people') or one world at random, then a place in it ('worlds'). */
export function pickBirthplace(r, mode = 'people') {
  if (mode === 'worlds') {
    const w = r.pick(Object.keys(WORLDS));
    return r.weighted(PLACES.filter((p) => p.world === w), (p) => p.pop);
  }
  return r.weighted(PLACES, (p) => p.pop);
}

/** One-way light time from a world to Earth, in minutes: [nearest, farthest]. */
export function lightDelay(world) {
  const w = WORLDS[world];
  if (world === 'earth' || world === 'orbit') return [0, 0];
  if (world === 'moon') return [1.28 / 60, 1.28 / 60];
  return [(w.au - 1) * AU_MIN, (w.au + 1) * AU_MIN];
}

// ---------- jobs ----------

// Jobs from the book's profession list, plus the work the signal made. `odds`: the chance a word you
// put forward goes into the next reply (ASSUMED; most of ten billion proposals are not used).
export const JOBS = [
  { id: 'timing', worlds: ['earth', 'moon', 'mars', 'ceres'], odds: 0.08, words: ['STAR.TIME', 'TIME.VOICE'],
    zh: '脉冲星计时站值守', en: 'Pulsar-timing station keeper',
    about: { zh: '最先听到它的就是这些钟。你守着其中一座。', en: 'These clocks heard it first. You keep one of them.' } },
  { id: 'lexicon', worlds: null, odds: 0.25, words: ['VOICE.VOICE', 'ONE.NOT', 'VOICE.OPEN'],
    zh: '翻译机词库标注员', en: 'Translation-machine lexicon tagger',
    about: { zh: '网格文字只是初稿。你给翻译机标注新的符号，词库一年年长大。', en: 'The grid script is a first draft. You tag new signs for the translating machine and the lexicon grows.' } },
  { id: 'pilot', worlds: ['earth', 'moon', 'orbit', 'mars', 'ceres'], odds: 0.02, hazard: 0.0015, words: ['BODY.PATH', 'LIGHT.PATH'],
    zh: '飞船引航员', en: 'Ship pilot',
    about: { zh: '按“最短光秒”原则接力，盯着货船起飞、降落、变轨。', en: 'Handing ships on by the "fewest light seconds" rule, watching freighters launch, land and change orbit.' } },
  { id: 'sweeper', worlds: ['earth', 'orbit', 'mars'], odds: 0.02, words: ['AIR.NOT', 'LIGHT.PATH'],
    zh: '太空垃圾清扫员', en: 'Orbital debris sweeper',
    about: { zh: '用激光把小碎片烧成气，把大块收回去做打印原料。', en: 'Lasering small debris into vapour and hauling big pieces back as printer feedstock.' } },
  { id: 'gardener', worlds: ['orbit', 'moon', 'mars', 'titan'], odds: 0.02, words: ['WATER', 'AIR.WATER'],
    zh: '低重力园艺师', en: 'Low-gravity gardener',
    about: { zh: '用光照和旋转给植物塑形，像天际园的“水晶之心”。', en: 'Shaping plants with light and spin, like Heaven Garden\'s "Crystal Heart".' } },
  { id: 'terraform', worlds: ['mars', 'titan', 'jupiter'], odds: 0.03, words: ['AIR', 'AIR.PATH', 'WATER.BODY'],
    zh: '火星家园计划工程师', en: 'Mars Home Plan engineer',
    about: { zh: '第一期大气改造 2219 年动工，要做将近 160 年。你只会看到开头。', en: 'Phase one, the air, began in 2219 and will take nearly 160 years. You will only see the start.' } },
  { id: 'carer', worlds: null, odds: 0.02, people: 2, words: ['ONE.OTHER', 'TIME.AFTER'],
    zh: '保育员', en: 'Childcare worker',
    about: { zh: '照看别人家的孩子。他们会活到你听不到的那些回音。', en: 'Looking after other people\'s children, who will live to hear replies you will not.' } },
  { id: 'musician', worlds: null, odds: 0.05, words: ['VOICE.BODY', 'VOICE.AIR'],
    zh: '太空音乐人', en: 'Space musician',
    about: { zh: '火星朋克之后，很多人开始用共鸣写歌。听说他们就是这样说话的。', en: 'After Mars punk, many began writing for resonance. They say that is how the others talk.' } },
  { id: 'diplomat', worlds: ['earth', 'mars'], odds: 0.12, words: ['OTHER.OTHER', 'VOICE.PATH'],
    zh: '星际移民局外交人员', en: 'Immigration Bureau diplomat',
    about: { zh: '原本在地球和火星之间传话，现在多了一个说话的人。', en: 'You carried word between Earth and Mars. Now there is a third party.' } },
  { id: 'archivist', worlds: null, odds: 0.1, words: ['TIME.BEFORE', 'TIME.PATH'],
    zh: '档案管理员', en: 'Archivist',
    about: { zh: '一问一答相隔 22 年，对话需要能记住的机构。你就是记住的那部分。', en: 'Each answer takes 22 years, so the conversation needs institutions that remember. You are the remembering.' } },
  { id: 'guide', worlds: ['mars', 'jupiter', 'titan'], odds: 0.02, words: ['STAR.STAR', 'BODY.PATH'],
    zh: '外太阳系导游', en: 'Outer-system guide',
    about: { zh: '带火星游客去木星和土星，最忙的是木土合相那两年。', en: 'Taking Martian tourists to Jupiter and Saturn, busiest in the years of the great conjunction.' } },
  { id: 'teacher', worlds: null, odds: 0.02, people: 1, words: ['TIME.AFTER', 'VOICE.OPEN'],
    zh: '老师', en: 'Teacher',
    about: { zh: '每年都有学生问：他们回信了吗？', en: 'Every year a student asks: have they answered yet?' } },
];
export const job = (id) => JOBS.find((j) => j.id === id);
export const jobsFor = (world) => JOBS.filter((j) => !j.worlds || j.worlds.includes(world));

// Words you might put forward, from the grid-script lexicon (lib/glyph-vocab.json). Everyone can use
// the first list; each world adds the things its people live with.
export const WORDS = {
  common: ['VOICE.VOICE', 'TIME.AFTER', 'LIGHT.PATH', 'ONE.NOT', 'VOICE.OPEN', 'TIME.PATH', 'ONE.ONE', 'VOICE.NOT'],
  earth: ['WATER', 'AIR.WATER', 'WATER.PATH', 'TIME.BODY'],
  moon: ['LIGHT.NOT', 'AIR.NOT', 'BODY.BODY'],
  orbit: ['AIR.NOT', 'BODY.PATH', 'TIME.BODY'],
  mars: ['AIR', 'AIR.PATH', 'BODY.BODY', 'WATER.BODY'],
  ceres: ['STAR.TIME', 'BODY.BODY', 'WATER.BODY'],
  jupiter: ['WATER.BODY', 'STAR.STAR', 'LIGHT.NOT'],
  titan: ['AIR.WATER', 'WATER.PATH', 'WATER.BODY'],
};

// ---------- the life ----------

const L = (zh, en) => ({ zh, en });

/** Start a life at `now` (story time, ms). */
export function createLife({ seed = newSeed(), mode = 'people', now = storyNow().getTime() } = {}) {
  const r = rng(seed);
  const p = pickBirthplace(r, mode);
  const w = WORLDS[p.world];
  // Lifespan in years. A few lives end in childhood (ASSUMED 1%, close to Earth's 2100 projection).
  let span = r.chance(0.01) ? 1 + r.int(12) : r.normal(LIFE_EXPECTANCY + w.life, LIFE_SD);
  span = Math.max(1, Math.min(112, span));
  const birth = yearOf(now);
  const life = {
    seed, mode, r, birth, born: now, span,
    age: 0, year: birth, place: p.id, birthplace: p.id, job: null, moved: false,
    people: 1, // the people close to you
    heard: 0, // answers from Ross 128 b heard in your lifetime
    words: [], // { word, k, taken }
    queue: [], done: false, cause: null, log: [], seen: new Set(),
  };
  life_birth(life);
  return life;
}

// How the duet sounds where you are (archive/2219-signal/: only Earth's centre hears it in step).
export const DUET_HEARD = {
  tuned: L('从这里听，那段二重唱是合拍的：它就是为地球调的。', 'From here the duet is in step: it was tuned for Earth.'),
  near: L('从这里听，二重唱几乎合拍，只差地球半径那么一点。', 'From here the duet is almost in step, off by about one Earth radius.'),
  drift: L('从这里听，二重唱速率相同，却差着零点几个脉冲，慢慢漂移。', 'From here the duet keeps the same rate, a fraction of a pulse apart, slowly drifting.'),
  slide: L('从这里听，两串脉冲始终合不上，一次次互相滑过。', 'From here the two pulse trains never settle; they keep sliding past each other.'),
};

function life_birth(life) {
  const p = where(life), w = WORLDS[p.world];
  const n = fmtOneIn(oneIn(p), 'zh'), ne = fmtOneIn(oneIn(p), 'en');
  const days = Math.floor((life.born - PUBLIC) / 86400e3);
  const odds = oneIn(p) < 1.05
    ? L('几乎每个新生儿都生在这里。', 'Almost every baby is born here.')
    : L(`每 ${n} 个新生儿里，有一个生在这里。`, `One baby in ${ne} is born here.`);
  const news = days >= 0 && days < 366
    ? L(`你出生前 ${days} 天，罗斯128 b 的信号公之于众。`, `${days} days before you were born, the signal from Ross 128 b was made public.`)
    : L('', '');
  const plan = p.world === 'mars' && Math.floor(life.birth) === 2219
    ? L('也是这一年，火星家园计划的第一期，大气改造，正式动工。', 'The same year, phase one of the Mars Home Plan, the air, begins.')
    : L('', '');
  const join = (...xs) => xs.filter(Boolean).join(' ');
  entry(life, 'birth', L(`你出生在${p.zh}`, `You are born ${enIn(p)}`),
    L([p.about.zh, odds.zh, news.zh, plan.zh, DUET_HEARD[w.duet].zh].join(''), join(p.about.en, odds.en, news.en, plan.en, DUET_HEARD[w.duet].en)));
}

const where = (life) => place(life.place);
const worldOf = (life) => where(life).world;
const nameOf = (p, lang) => p[lang];
/** 'on Mars'-style English: cities take 'in', worlds and moons 'on'. */
export const enIn = (p) => p.enIn || `in ${p.en}`;

/** The text of an entry for one language. */
export const text = (v, lang) => (typeof v === 'function' ? v(lang) : v && typeof v === 'object' ? v[lang] : v);

function entry(life, kind, title, body = null, extra = {}) {
  const e = { year: life.year, age: life.age, kind, title, body, ...extra };
  life.log.push(e);
  return e;
}

// Life events that only happen once, keyed by age.
function stageEvents(life) {
  const r = life.r, p = where(life), w = worldOf(life), out = [];
  const a = life.age;
  if (a === 5) {
    const kid = {
      earth: L('你第一次在天文馆里听到那段二重唱。讲解员说，只有在地球上，它听起来才是合拍的。', 'You first hear the duet in a planetarium. The guide says it only sounds in step on Earth.'),
      moon: L('你学会了看天上那颗不动的地球，大人们说那里才是信号对准的地方。', 'You learn to read the Earth that never moves in your sky. The grown-ups say that is where the signal was aimed.'),
      orbit: L('你在城的轴心附近学会了飘，在边缘学会了走。', 'You learn to float near the city\'s axis and to walk at its rim.'),
      mars: p.circle === 'isidis'
        ? L('夏至月的气球节，伊希地三座城的天上全是气球。你记住了这一天。', 'At the Balloon Festival in the Summer-Solstice month, the sky over the three Isidis cities fills with balloons. You remember it.')
        : L('春秋的沙尘暴来了，城里的灯一整天都开着。', 'The spring dust storms come and the city lights stay on all day.'),
      ceres: L('你在低重力里一跳就能摸到天花板。', 'In the low gravity you can touch the ceiling with one jump.'),
      jupiter: L('木星占了半边天。你以为每个人的天上都有这么大的东西。', 'Jupiter fills half the sky. You think everyone\'s sky has something that big.'),
      titan: L('橙色的天，甲烷的海。你第一次透过云看见了土星环。', 'Orange sky, methane seas. You see Saturn\'s rings through the clouds for the first time.'),
    }[w];
    out.push(entry(life, 'life', L('童年', 'Childhood'), kid));
  }
  if (a === 16) life.queue.push('job');
  if (a >= 24 && a <= 36 && !life.moved && !life.queue.includes('move') && r.chance(0.12)) life.queue.push('move');
  if (a === 70 && life.job) out.push(entry(life, 'life', L('退下来了', 'Stepping back'), L('你把手上的事交给了更年轻的人。', 'You hand your work to younger people.')));
  return out;
}

// Things that happen to everyone alive in a given year.
function worldEvents(life, from, to) {
  const out = [], w = worldOf(life);
  const inYear = (y) => y > from && y <= to;
  if (inYear(yearOf(PUBLIC) + D)) {
    out.push(entry(life, 'out', L('第一封回信到了', 'The first reply arrives'),
      L(`你出生那年发出的回信，今年到达罗斯128 b。那边如果立刻回答，你 ${Math.round(PUBLIC_Y + ROUND_TRIP - life.birth)} 岁时会听到。`,
        `The reply sent the year you were born reaches Ross 128 b this year. If they answer at once, you will hear it at ${Math.round(PUBLIC_Y + ROUND_TRIP - life.birth)}.`)));
  }
  const gc = GREAT_CONJUNCTION(from);
  if (inYear(gc) && ['mars', 'jupiter', 'titan', 'ceres'].includes(w)) {
    out.push(entry(life, 'life', L('木土合相', 'The great conjunction'),
      L('木星和土星在天上靠在一起，二十年一遇。火纵线的木土线路又满了，三年之内游完两个行星系。', 'Jupiter and Saturn draw together in the sky, once in twenty years. Vertical\'s Jupiter-Saturn route is full again: both systems in three years.')));
  }
  return out;
}

function randomEvents(life) {
  const r = life.r, w = worldOf(life), out = [], a = life.age;
  if (a >= 20 && a <= 45 && life.people < 4 && r.chance(0.07)) {
    life.people += 1;
    const close = [
      L('你们开始一起听那些从很远处来的声音。', 'You start listening to the far-off sounds together.'),
      L('一个人说话，只有几种声音；两个人在一起，能说的就多了。', 'One voice alone makes only a few sounds; two together can say more.'),
      L('一个朋友，从那以后每次回音都一起听。', 'A friend; from then on you hear every reply together.'),
    ];
    out.push(entry(life, 'people', L('有人走近了', 'Someone comes close'), close[(life.people - 2) % close.length]));
  } else if (a >= 26 && a <= 44 && life.people >= 2 && r.chance(0.06)) {
    life.people += 1;
    out.push(entry(life, 'people', L('一个孩子', 'A child'), L(`孩子出生了。按平均寿命，他们能比你多听到一两次回音。`, 'A child is born. On average they will hear one or two more replies than you.')));
  } else if (a >= 55 && life.people > 1 && r.chance(0.035)) {
    life.people -= 1;
    out.push(entry(life, 'people', L('有人先走了', 'Someone goes first'), L('身边少了一个声音。', 'One voice fewer beside you.')));
  } else if (a >= 8 && r.chance(0.05)) {
    const pool = {
      earth: [L('一个夏天，你在海边待了很久。', 'One summer you stay a long time by the sea.'), L('计时站开放日，你看到了真实的残差曲线，比想象中安静。', 'At a timing-station open day you see the real residuals, quieter than you imagined.'), L('你去发射场看了一艘货船起飞去火星。', 'You watch a freighter lift off for Mars.'), L('你给罗斯128 b写了一封信，看着它一公里一公里往前走。', 'You write a letter to Ross 128 b and watch it go, kilometre by kilometre.')],
      moon: [L('一次日食：地球把太阳整个挡住，边上一圈红光。', 'An eclipse: Earth covers the Sun, ringed in red light.')],
      orbit: [L('维护环停了一段，城里的转速调慢了一点。', 'A section of the maintenance ring shuts down; the city spins a little slower.'), L('空间球联赛，你看了每一场。', 'The space-ball league: you watch every match.')],
      mars: [L('火卫一一晚上从西边升起两次。', 'Phobos rises in the west twice in one night.'), L('伊希地病又出现了几例，火星健康组织很快控制住了。', 'A few cases of Isidis disease again; the Mars Health Organisation contains them quickly.'), L('一场全球沙尘暴，太阳能电站停了几个星期。', 'A global dust storm: the solar plants stop for weeks.')],
      ceres: [L('计时站的残差又跳了一下，大家都抬起头，结果只是噪声。', 'The station residuals jump again; everyone looks up; it is only noise.')],
      jupiter: [L('你坐了月夜冰宫里的“时光色彩”过山车，想起了很久以前的一天。', 'You ride "Colours of Time" in the Moon-Night Ice Palace and remember a day long ago.')],
      titan: [L('一场甲烷雨下了很久。', 'A methane rain falls for a long time.')],
    }[w].concat([
      L('你试着用网格文字画自己的名字，翻译机说这个词还不存在。', 'You try to draw your name in the grid script; the translating machine says the word does not exist yet.'),
      L('有人在广播里放了那段二重唱的录音，你停下来听完。', 'Someone plays the duet on the radio and you stop to hear it through.'),
    ]);
    const fresh = pool.filter((x) => !life.seen.has(x.en));
    if (fresh.length) {
      const pick = r.pick(fresh);
      life.seen.add(pick.en);
      out.push(entry(life, 'life', L('那一年', 'That year'), pick));
    }
  }
  return out;
}

// ---------- choices ----------

function makeChoice(life, id) {
  const r = life.r, w = worldOf(life);
  if (id === 'job') {
    const opts = r.sample(jobsFor(w), 3);
    return {
      id, title: L('该做点什么了', 'Time to choose your work'),
      body: L(`你在${nameOf(where(life), 'zh')}长大。这些路离你最近：`, `You grew up ${enIn(where(life))}. These paths are closest:`),
      options: opts.map((j) => ({ id: j.id, label: L(j.zh, j.en), about: j.about })),
    };
  }
  if (id === 'move') {
    const here = where(life);
    const marsCity = r.weighted(PLACES.filter((p) => p.world === 'mars' && p.id !== here.id), (p) => p.pop);
    const gc = GREAT_CONJUNCTION(life.year);
    const opts = [];
    if (w === 'earth') opts.push({ id: marsCity.id, label: L(`去火星${marsCity.zh}`, `Move to ${marsCity.en} on Mars`), about: L('离子推进加上轨道加速器，几个月就到。', 'Ion drives and the orbital accelerator: a few months.') },
      { id: 'starry', label: L('搬去星夜城', 'Move to Starry Night City'), about: L('在轨道上，离地球很近，又不在地球上。', 'In orbit, close to Earth but off it.') });
    if (['moon', 'orbit'].includes(w)) opts.push({ id: 'earth', label: L('下到地球', 'Go down to Earth'), about: L('那里的二重唱是合拍的。', 'The duet is in step there.') },
      { id: marsCity.id, label: L(`去火星${marsCity.zh}`, `Move to ${marsCity.en} on Mars`), about: L('几个月的航程。', 'A few months away.') });
    if (w === 'mars') {
      opts.push({ id: 'earth', label: L('回地球', 'Go to Earth'), about: L('离信号对准的地方近一点。', 'Closer to where the signal was aimed.') });
      if (gc - life.year < 4) opts.push({ id: 'titan', label: L('赶木土合相去泰坦', 'Catch the conjunction to Titan'), about: L('至少一年的航程，可能不再回来。', 'At least a year\'s flight; you may not come back.') });
      else opts.push({ id: marsCity.id, label: L(`搬去${marsCity.zh}`, `Move to ${marsCity.en}`), about: marsCity.about });
    }
    if (['ceres', 'jupiter', 'titan'].includes(w)) opts.push({ id: marsCity.id, label: L(`去火星${marsCity.zh}`, `Move to ${marsCity.en} on Mars`), about: L('回到内太阳系。', 'Back to the inner system.') });
    opts.push({ id: 'stay', label: L('留下', 'Stay'), about: L('这里有你的人。', 'Your people are here.') });
    return { id, title: L('要不要走？', 'Leave?'), body: L('一个发射窗口快到了。', 'A launch window is coming.'), options: opts };
  }
  if (id.startsWith('word:')) {
    const k = Number(id.slice(5));
    const pool = [...new Set([...(life.job ? job(life.job).words : []), ...WORDS[w], ...WORDS.common])].filter((x) => !life.words.some((y) => y.word === x));
    const opts = r.sample(pool, 3);
    return {
      id, k, title: L('下一封回信要说什么？', 'What should the next reply say?'),
      body: L('每个人都可以从翻译机的词库里提一个词。大多数提议不会被用上。', 'Anyone can put forward one word from the translating machine\'s lexicon. Most proposals are not used.'),
      options: opts.map((x) => ({ id: x, word: x })),
    };
  }
  return null;
}

/** Apply a choice; returns the entries it made. */
export function choose(life, choice, optionId) {
  const r = life.r, out = [];
  life.pending = null;
  if (choice.id === 'job') {
    const j = job(optionId);
    life.job = j.id;
    life.people += j.people || 0;
    out.push(entry(life, 'choice', L(`你成了${j.zh}`, `You become a ${j.en.toLowerCase()}`), j.about));
  } else if (choice.id === 'move') {
    life.moved = true;
    if (optionId === 'stay') {
      out.push(entry(life, 'choice', L('你留下了', 'You stay'), L('窗口关上了，下一次要等两年多。', 'The window closes; the next is over two years away.')));
    } else {
      const to = place(optionId);
      const fromWorld = worldOf(life);
      life.place = to.id;
      if (life.job && !jobsFor(to.world).some((j) => j.id === life.job)) {
        out.push(entry(life, 'choice', L(`你搬到了${to.zh}`, `You move to ${to.en}`), L(`${to.about.zh}原来的工作这里没有，你重新开始。`, `${to.about.en} Your old work does not exist here; you start again.`)));
        life.job = r.pick(jobsFor(to.world).filter((j) => !j.worlds)).id;
      } else {
        out.push(entry(life, 'choice', L(`你搬到了${to.zh}`, `You move to ${to.en}`), to.about));
      }
      if (fromWorld !== to.world && life.people > 1 && r.chance(0.4)) {
        life.people -= 1;
        out.push(entry(life, 'people', L('有人没有跟来', 'Someone stays behind'), L('你们之间从此隔着光速。', 'From now on there is light delay between you.')));
      }
    }
  } else if (choice.id.startsWith('word:')) {
    const j = life.job ? job(life.job) : null;
    const taken = r.chance(j ? j.odds : 0.01);
    life.words.push({ word: optionId, k: choice.k, taken });
    out.push(entry(life, taken ? 'out' : 'life', taken ? L('你的词进了回信', 'Your word goes into the reply') : L('这次没用上你的词', 'Your word was not used this time'),
      taken ? L(`回信今天发出，${Math.floor(life.year + D)} 年到达。`, `The reply goes out today and arrives in ${Math.floor(life.year + D)}.`)
        : L(`回信还是发出了，${Math.floor(life.year + D)} 年到达。里面有很多人的词，没有你的。`, `The reply goes out anyway and arrives in ${Math.floor(life.year + D)}: many people's words, not yours.`),
      { word: optionId }));
  }
  return out;
}

// ---------- the year ----------

/**
 * Advance one year (or finish a queued choice first). Returns { entries, choice } where choice, when set,
 * must be answered with choose() before the next step.
 */
export function step(life) {
  if (life.done) return { entries: [], choice: null };
  if (life.queue.length) {
    life.pending = makeChoice(life, life.queue.shift());
    return { entries: [], choice: life.pending };
  }
  const from = life.year;
  const end = life.birth + life.span;
  const to = Math.min(from + 1, end);
  life.year = to;
  life.age = Math.floor(to - life.birth);
  const entries = [];
  // answers arriving this year
  for (const y of answerYears(to + 1)) {
    if (y > from && y <= to) {
      life.heard += 1;
      const k = answerYears(y + 1).length;
      const [near, far] = lightDelay(worldOf(life));
      const delay = far === 0 ? L('', '') : near === far
        ? L('你在月球上，比地球晚 1.3 秒听到。', 'On the Moon you hear it 1.3 seconds after Earth.')
        : L(`你在${WORLDS[worldOf(life)].zh}，比地球晚 ${Math.round(near)} 到 ${Math.round(far)} 分钟听到，看两颗行星此刻在轨道上的位置。`, `From ${WORLDS[worldOf(life)].en} you hear it ${Math.round(near)} to ${Math.round(far)} minutes after Earth, depending on where the two planets are.`);
      const letter = Math.floor(PUBLIC_Y + (k - 1) * ROUND_TRIP);
      const mine = life.words.find((x) => x.k === k - 1 && x.taken);
      const what = k === 1
        ? L('第一次真正的回答，回应的是 2219 年那封信。翻译机对着它忙了好几个月，词库多了一截。', 'The first real answer, to the letter of 2219. The translating machine works on it for months and the lexicon grows.')
        : L(`回答的是 ${letter} 年发出的那封信。翻译机的词库又长了一截，网格文字还是一份草稿。`, `It answers the letter sent in ${letter}. The lexicon grows again; the grid script is still a draft.`);
      const yours = mine ? L('那封信里有你提的词。', 'That letter carried your word.') : L('', '');
      entries.push(entry(life, 'in', L(`第 ${k} 次回音`, `Reply ${k}`),
        L(`${what.zh}${yours.zh}${delay.zh}`, [what.en, yours.en, delay.en].filter(Boolean).join(' ')), { mine: !!mine }));
      life.queue.push(`word:${k}`);
    }
  }
  entries.push(...worldEvents(life, from, to));
  entries.push(...stageEvents(life));
  // accidents for risky work (ASSUMED rates)
  const j = life.job ? job(life.job) : null;
  if (j?.hazard && life.age < 70 && life.r.chance(j.hazard)) {
    life.span = to - life.birth;
    life.cause = 'accident';
  }
  if (to >= life.birth + life.span - 1e-9) {
    life.done = true;
    life.queue = [];
    entries.push(entry(life, 'end', L('最后一年', 'The last year'), endText(life)));
    return { entries, choice: null };
  }
  entries.push(...randomEvents(life));
  if (life.queue.length) life.pending = makeChoice(life, life.queue.shift());
  return { entries, choice: life.pending || null };
}

/** What was still on its way when the life ended. */
export function inFlight(life) {
  const t = life.birth + life.span;
  const lines = exchange(t + 50).filter((l) => l.from <= t && l.to > t);
  return lines.map((l) => ({ ...l, left: l.to - t }));
}

function endText(life) {
  const p = where(life);
  const age = Math.floor(life.span);
  const next = inFlight(life).find((l) => l.dir === 'in');
  const tail = next
    ? L(`你离开时，下一句回答已经在路上，离太阳系还有 ${next.left.toFixed(1)} 光年。`, `When you go, the next answer is already on its way, ${next.left.toFixed(1)} light years out.`)
    : L('你离开时，我们的信正在去他们那里的路上。', 'When you go, our letter is on its way to them.');
  const how = life.cause === 'accident'
    ? L('一次工作中的事故。', 'An accident at work.')
    : age < 15 ? L('你没能长大。', 'You did not get to grow up.') : L('', '');
  return L(`你在${p.zh}离开，${age} 岁。${how.zh}${tail.zh}`, `You die ${enIn(p)}, aged ${age}. ${how.en}${how.en ? ' ' : ''}${tail.en}`);
}

/** A plain-text summary for sharing. */
export function summary(life, lang = 'zh') {
  const b = place(life.birthplace);
  const age = Math.floor(life.span);
  const taken = life.words.filter((w) => w.taken).length;
  const odds = oneIn(b) < 1.05
    ? { zh: '和几乎所有人一样', en: 'like almost everyone' }
    : { zh: `每 ${fmtOneIn(oneIn(b), 'zh')} 个新生儿里有一个生在这里`, en: `one baby in ${fmtOneIn(oneIn(b), 'en')} is born there` };
  return lang === 'zh'
    ? `我在${b.zh}出生（${odds.zh}），活了 ${age} 岁，听到 ${life.heard} 次罗斯128 b的回音，提过 ${life.words.length} 个词，${taken} 个进了回信。`
    : `I was born ${enIn(b)} (${odds.en}), lived ${age} years, heard ${life.heard} ${life.heard === 1 ? 'reply' : 'replies'} from Ross 128 b, put forward ${life.words.length} ${life.words.length === 1 ? 'word' : 'words'} and ${taken} went into a reply.`;
}

export function fmtOneIn(n, lang) {
  if (n < 1.05) return lang === 'zh' ? '1' : '1';
  const v = n < 100 ? n.toFixed(2) : Math.round(n).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en');
  return v.replace(/\.00$/, '');
}
