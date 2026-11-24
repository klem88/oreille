export type Quality = 'maj' | 'min' | 'dim' | 'aug' | '7' | 'maj7' | 'm7' | 'ø7' | '°7' | '6';
export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Degree {
  step: Step;
  accidental: -1 | 0 | 1;
  quality: Quality;
  bass: 1 | 3 | 5 | 7;
  secondaryOf?: Degree;
  label: string;
}

export class DegreeSyntaxError extends Error {
  constructor(text: string, detail = '') {
    super(`Degré invalide : « ${text} »${detail ? ` (${detail})` : ''}`);
    this.name = 'DegreeSyntaxError';
  }
}

const ROMANS: Record<string, Step> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };
const ROMAN_TEXT = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const UPPER_QUALITIES: Quality[] = ['maj', 'maj7', '7', 'aug', '6'];

const SEVENTHS: Quality[] = ['7', 'maj7', 'm7', 'ø7', '°7'];
const RE = /^(b|#)?([ivIV]+)(maj7|ø7|°7|m7|7|6|\+|°)?(?:\/(\d))?(?:\/(.+))?$/;

function qualityOf(upper: boolean, step: Step, suffix: string | undefined): Quality | null {
  switch (suffix) {
    case undefined: return upper ? 'maj' : step === 7 ? 'dim' : 'min';
    case '°': return upper ? null : 'dim';
    case '+': return upper ? 'aug' : null;
    case '6': return upper ? '6' : null;
    case '7': return upper ? '7' : step === 7 ? null : 'm7';
    case 'm7': return upper || step === 7 ? null : 'm7';
    case 'maj7': return upper ? 'maj7' : null;
    case 'ø7': return upper ? null : 'ø7';
    case '°7': return upper ? null : '°7';
    default: return null;
  }
}

function suffixOf(q: Quality): string {
  switch (q) {
    case 'maj': case 'min': return '';
    case 'dim': return '°';
    case 'aug': return '+';
    case 'm7': return '7';
    default: return q; // 7, maj7, ø7, °7, 6
  }
}

export function formatDegree(d: Degree): string {
  const acc = d.accidental === -1 ? 'b' : d.accidental === 1 ? '#' : '';
  const roman = UPPER_QUALITIES.includes(d.quality) ? ROMAN_TEXT[d.step] : ROMAN_TEXT[d.step].toLowerCase();
  const bass = d.bass !== 1 ? `/${d.bass}` : '';
  const sec = d.secondaryOf ? `/${formatDegree(d.secondaryOf)}` : '';
  return `${acc}${roman}${suffixOf(d.quality)}${bass}${sec}`;
}

export function parseDegree(text: string): Degree {
  const m = RE.exec(text);
  if (!m) throw new DegreeSyntaxError(text);
  const [, acc, romanRaw, suffix, bassRaw, target] = m;
  const upper = romanRaw === romanRaw.toUpperCase();
  if (!upper && romanRaw !== romanRaw.toLowerCase()) throw new DegreeSyntaxError(text, 'casse mixte');
  const step = ROMANS[romanRaw.toUpperCase()];
  if (!step) throw new DegreeSyntaxError(text, 'chiffre romain inconnu');
  const quality = qualityOf(upper, step, suffix);
  if (!quality) throw new DegreeSyntaxError(text, 'qualité non permise ou ambiguë');
  let bass: 1 | 3 | 5 | 7 = 1;
  if (bassRaw !== undefined) {
    if (!['1', '3', '5', '7'].includes(bassRaw)) throw new DegreeSyntaxError(text, 'basse');
    bass = Number(bassRaw) as 1 | 3 | 5 | 7;
    if (bass === 7 && !SEVENTHS.includes(quality)) throw new DegreeSyntaxError(text, 'basse 7 sans septième');
  }
  const d: Degree = {
    step,
    accidental: acc === 'b' ? -1 : acc === '#' ? 1 : 0,
    quality,
    bass,
    label: '',
  };
  if (target !== undefined) d.secondaryOf = parseDegree(target);
  d.label = formatDegree(d);
  return d;
}

export function baseStep(d: Degree): Step {
  return d.secondaryOf ? baseStep(d.secondaryOf) : d.step;
}

const DIATONIC: Record<'major' | 'minor', Record<number, Quality[]>> = {
  major: {
    1: ['maj', 'maj7', '6'], 2: ['min', 'm7'], 3: ['min', 'm7'], 4: ['maj', 'maj7', '6'],
    5: ['maj', '7'], 6: ['min', 'm7'], 7: ['dim', 'ø7'],
  },
  minor: {
    1: ['min', 'm7'], 2: ['dim', 'ø7'], 3: ['maj', 'maj7'], 4: ['min', 'm7'],
    5: ['min', 'm7', 'maj', '7'], 6: ['maj', 'maj7'], 7: ['maj', '7', 'dim', '°7'],
  },
};

export function isDiatonicQuality(step: Step, quality: Quality, mode: 'major' | 'minor'): boolean {
  return DIATONIC[mode][step].includes(quality);
}
