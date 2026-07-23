// Lightweight profanity filter for user-entered text on a family/kid-facing
// site (team-dinner potluck notes, etc.). Token-based with common leetspeak and
// letter-repeat normalization so simple evasions (sh1t, fuuuck, f*ck) are still
// caught, while avoiding substring false positives (class/assess/shell/scrap).

const WORDS = new Set([
  'anal', 'anus', 'arse', 'arsehole', 'ass', 'asshat', 'asshole', 'bastard',
  'bitch', 'bitches', 'blowjob', 'bollocks', 'boner', 'boob', 'boobs', 'bullshit',
  'clit', 'cock', 'cocks', 'cum', 'cunt', 'cunts', 'dick',
  'dickhead', 'dildo', 'dipshit', 'douche', 'douchebag', 'dyke', 'ejaculate',
  'fag', 'faggot', 'fags', 'fuck', 'fucked', 'fucker', 'fuckers', 'fuckface',
  'fuckin', 'fucking', 'fuckwit', 'goddamn', 'handjob', 'homo', 'horny',
  'jackass', 'jerkoff', 'jizz', 'kike', 'kunt', 'motherfucker', 'nazi',
  'nigga', 'niggas', 'nigger', 'niggers', 'nutsack', 'orgasm', 'penis', 'piss',
  'pissed', 'porn', 'prick', 'pube', 'pussies', 'pussy', 'queer', 'rape',
  'rapist', 'retard', 'retarded', 'scrotum', 'semen', 'sex', 'shit', 'shithead',
  'shits', 'shitty', 'slut', 'sluts', 'spic', 'spunk', 'testicle', 'tit', 'tits',
  'titties', 'titty', 'twat', 'vagina', 'wank', 'wanker', 'whore', 'whores',
])

// A few of the worst terms are also scanned in a de-spaced pass to catch
// letter-by-letter evasion. Kept short and unambiguous to avoid false hits.
const SEVERE = ['fuck', 'cunt', 'nigger', 'faggot', 'motherfucker']

function leet(s) {
  return s.toLowerCase()
    .replace(/[@4]/g, 'a').replace(/[8]/g, 'b').replace(/[3]/g, 'e')
    .replace(/[6]/g, 'g').replace(/[1!|]/g, 'i').replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's').replace(/[7]/g, 't')
}

// Collapse runs of the same letter down to a single so "fuuuck" -> "fuck".
function dedupe(t) {
  return t.replace(/(.)\1+/g, '$1')
}

export function hasProfanity(text) {
  if (!text) return false
  const norm = leet(String(text))
  const tokens = norm.split(/[^a-z]+/).filter(Boolean)
  for (const t of tokens) {
    if (WORDS.has(t) || WORDS.has(dedupe(t))) return true
  }
  const despaced = norm.replace(/[^a-z]/g, '')
  for (const w of SEVERE) {
    if (despaced.includes(w)) return true
  }
  return false
}
