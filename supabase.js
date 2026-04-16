// ============================================================
// supabase.js — shared client & utilities
// ============================================================

// Ganti dengan URL dan anon key dari Supabase project kamu
const SUPABASE_URL = 'https://povljppwudhmbsmpfcrm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdmxqcHB3dWRobWJzbXBmY3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjI1MDIsImV4cCI6MjA5MTQzODUwMn0.AzPOgS9Rv5FQTUXmopPnL2APwSha9uhbp147H7awRcE'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================================
// CHORD TRANSPOSER — Nashville Number System
// Format input: [1]Ku mau me[4]muji Tu[5]han[1]ku
// Suffix lengkap: m, M, 7, m7, maj7, sus2, sus4, add9, dim, aug, dll.
// Slash chord: [4/5] [1M/3]
// ============================================================

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const FLAT_MAP = {'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'}

// Semitone interval per degree (root position)
const DEGREE_SEMITONES = { '1':0, '2':2, '3':4, '4':5, '5':7, '6':9, '7':11 }

// Raised degree: 4# = tritone (6st), 5# = augmented (8st)
const DEGREE_SHARP     = { '4':6, '5':8 }

// Diatonic defaults (no explicit quality suffix)
// 1=maj, 2=min, 3=min, 4=maj, 5=maj, 6=min, 7=dim
const DEFAULT_QUALITY  = { '1':'maj','2':'min','3':'min','4':'maj','5':'maj','6':'min','7':'dim' }

// Suffix normalization → canonical quality tag
// Determines what gets appended to the root note
const SUFFIX_MAP = {
  // minor
  'm':    'min',
  'min':  'min',
  // major (explicit)
  'M':    'maj',
  'maj':  'maj',
  // dominant 7
  '7':    '7',
  // minor 7
  'm7':   'm7',
  'min7': 'm7',
  // major 7
  'maj7': 'maj7',
  'M7':   'maj7',
  // minor major 7
  'mM7':  'mMaj7',
  'minMaj7': 'mMaj7',
  // sus
  'sus2': 'sus2',
  'sus4': 'sus4',
  'sus':  'sus4',
  // add
  'add9': 'add9',
  'add2': 'add9',
  // diminished
  'dim':  'dim',
  'dim7': 'dim7',
  // augmented
  'aug':  'aug',
  '+':    'aug',
  // 6, 9
  '6':    '6',
  'm6':   'm6',
  '9':    '9',
  'm9':   'm9',
  'maj9': 'maj9',
  // extended
  '11':   '11',
  '13':   '13',
}

// What string to append to note name for each canonical quality
const QUALITY_DISPLAY = {
  'maj':    '',
  'min':    'm',
  '7':      '7',
  'm7':     'm7',
  'maj7':   'maj7',
  'mMaj7':  'mMaj7',
  'sus2':   'sus2',
  'sus4':   'sus4',
  'dim':    'dim',
  'dim7':   'dim7',
  'aug':    'aug',
  '6':      '6',
  'm6':     'm6',
  '9':      '9',
  'm9':     'm9',
  'maj9':   'maj9',
  'add9':   'add9',
  '11':     '11',
  '13':     '13',
}

// Regex to parse a Nashville token:
// Examples: 1  2m  4M  5#  3m7  4maj7  5sus4  6dim  1add9  4#  4/5  4M/3  5sus4/1
// Group 1: degree (1-7)
// Group 2: sharp modifier (#) — only valid on 4 and 5
// Group 3: quality suffix (everything before optional slash)
// Group 4: slash bass degree+sharp+suffix
const TOKEN_RE = /^([1-7])(#?)([a-zA-Z0-9]*?)(?:\/([1-7]#?[a-zA-Z0-9]*))?$/

function parseDegree(str) {
  // str: e.g. "4", "4#", "3m", "5sus4", "1maj7"
  // Returns { semitones, quality } or null
  const m = str.match(/^([1-7])(#?)([a-zA-Z0-9]*)$/)
  if (!m) return null
  const deg      = m[1]
  const isSharp  = m[2] === '#'
  const suffixRaw = m[3] || ''

  let semitones = DEGREE_SEMITONES[deg] ?? 0
  if (isSharp) semitones = DEGREE_SHARP[deg] ?? semitones + 1

  // Resolve quality
  let quality
  if (suffixRaw === '') {
    quality = DEFAULT_QUALITY[deg] ?? 'maj'
  } else {
    quality = SUFFIX_MAP[suffixRaw] ?? SUFFIX_MAP[suffixRaw.toLowerCase()] ?? null
    if (!quality) {
      // Unknown suffix — pass through raw
      quality = '__raw__' + suffixRaw
    }
  }

  return { semitones, quality }
}

function degreeToNote(keyIdx, semitones) {
  const noteIdx = (keyIdx + semitones) % 12
  const note = KEYS[noteIdx]
  return FLAT_MAP[note] || note
}

// Convert a single Nashville token → chord name
// token: e.g. "1", "4m", "5sus4", "4/5", "1maj7/3"
function tokenToChord(token, keyIdx) {
  if (!token) return token

  const m = token.match(TOKEN_RE)
  if (!m) return token  // unrecognized — pass through

  const baseParsed = parseDegree(m[1] + m[2] + m[3])
  if (!baseParsed) return token

  const rootNote = degreeToNote(keyIdx, baseParsed.semitones)
  let quality = baseParsed.quality

  let chordName
  if (quality && quality.startsWith('__raw__')) {
    chordName = rootNote + quality.slice(7)
  } else {
    const display = QUALITY_DISPLAY[quality] ?? ''
    chordName = rootNote + display
  }

  // Slash bass
  if (m[4]) {
    const bassParsed = parseDegree(m[4])
    if (bassParsed) {
      const bassNote = degreeToNote(keyIdx, bassParsed.semitones)
      chordName += '/' + bassNote
    }
  }

  return chordName
}

// ============================================================
// INLINE FORMAT PARSER  [chord]lyric text
// ============================================================

// Strip all [chord] markers from a string → plain lyric text
function stripChords(str) {
  if (!str) return ''
  return str.replace(/\[[^\]]*\]/g, '')
}

// Parse one line of "[chord]lyric" format into segments:
// Returns array of { chord: string|null, lyric: string }
// chord is the Nashville token inside [], lyric is text after it until next [
// Lines with no [] at all return [{ chord: null, lyric: fullLine }]
function parseInlineLine(line) {
  if (!line) return [{ chord: null, lyric: '' }]

  const segments = []
  const re = /\[([^\]]*)\]/g
  let lastIndex = 0
  let match

  // Text before first chord marker
  while ((match = re.exec(line)) !== null) {
    const lyricBefore = line.slice(lastIndex, match.index)
    // Attach lyric before this chord to previous segment, or make a no-chord prefix
    if (segments.length === 0 && lyricBefore) {
      segments.push({ chord: null, lyric: lyricBefore })
    } else if (segments.length > 0 && lyricBefore) {
      segments[segments.length - 1].lyric += lyricBefore
    }
    segments.push({ chord: match[1], lyric: '' })
    lastIndex = re.lastIndex
  }

  // Remaining text after last chord
  const tail = line.slice(lastIndex)
  if (segments.length === 0) {
    // No chord markers at all
    return [{ chord: null, lyric: line }]
  }
  if (tail) segments[segments.length - 1].lyric += tail

  return segments
}

// Parse full section text into lines of segments
// Returns: [ [ {chord, lyric}, ... ], ... ]
function parseInlineSection(text) {
  if (!text || !text.trim()) return []
  return text.split('\n').map(parseInlineLine)
}

// Extract only chord tokens from a section text (for chord-only tab)
// Returns array of arrays (lines of tokens)
function extractChordLines(text) {
  if (!text || !text.trim()) return []
  return text.split('\n').map(line => {
    const chords = []
    const re = /\[([^\]]+)\]/g
    let m
    while ((m = re.exec(line)) !== null) {
      if (m[1].trim()) chords.push(m[1].trim())
    }
    return chords
  }).filter(line => line.length > 0)
}

// ============================================================
// LEGACY SUPPORT — normalize old token array / plain text (no inline)
// ============================================================

function normalizeSectionTokens(data) {
  if (!data) return []
  let arr
  if (typeof data === 'string') {
    // New format detection: contains [...]
    if (data.includes('[')) return null // signal to use inline renderer
    // Old plain text format
    arr = parseChordTextLegacy(data)
  } else if (Array.isArray(data)) {
    if (data.length === 0) return []
    if (Array.isArray(data[0])) {
      arr = []
      data.forEach((line, i) => {
        if (Array.isArray(line)) arr.push(...line)
        else if (line) arr.push(line)
        if (i < data.length - 1) arr.push('\n')
      })
    } else {
      arr = data
    }
  } else {
    return []
  }
  return arr.filter(function(t) {
    if (!t || typeof t !== 'string') return false
    if (t === '\n') return true
    const s = t.trim()
    if (!s) return false
    if (s === '|' || s === '.') return true
    if (s.startsWith('(') && s.endsWith(')')) return true
    return /^[1-7]/.test(s)
  })
}

function parseChordTextLegacy(str) {
  if (!str || !str.trim()) return []
  const tokens = []
  const lines = str.split('\n')
  lines.forEach((line, lineIdx) => {
    const parts = line.trim().split(/\s+/).filter(Boolean)
    parts.forEach(p => tokens.push(p))
    if (lineIdx < lines.length - 1 && line.trim()) tokens.push('\n')
  })
  while (tokens.length && tokens[tokens.length - 1] === '\n') tokens.pop()
  return tokens
}

// isInlineFormat: returns true if section text uses [chord] markers
function isInlineFormat(data) {
  if (typeof data !== 'string') return false
  return data.includes('[')
}

function isPassingToken(t) {
  if (!t || t === '|' || t === '.' || t.startsWith('(')) return false
  const single = /^[1-7]#?[a-zA-Z0-9]*(\/[1-7]#?[a-zA-Z0-9]*)?$/
  return !single.test(t) && /[1-7]/.test(t)
}

function splitPassingTokens(t) {
  return t.match(/[1-7][mM]?[#]?/g) || [t]
}

function renderProgression(tokens, keyIdx) {
  const arr = normalizeSectionTokens(tokens)
  if (!arr || arr.length === 0) return ''
  return arr.map(t => {
    if (t === '|') return '<span class="chord-sep">|</span>'
    if (t === '.') return '<span class="chord-dot">\xB7</span>'
    if (t === '\n') return ''
    if (t.startsWith('(') && t.endsWith(')')) {
      const inner = t.slice(1, -1)
      const parts = splitPassingTokens(inner)
      const pills = parts.map(p => '<span class="passing-inner">' + tokenToChord(p, keyIdx) + '</span>').join('')
      return '<span class="chord-pill synco-pill">(' + pills + ')</span>'
    }
    if (isPassingToken(t)) {
      const parts = splitPassingTokens(t)
      const pills = parts.map(p => '<span class="passing-inner">' + tokenToChord(p, keyIdx) + '</span>').join('')
      return '<span class="chord-pill passing-pill">' + pills + '</span>'
    }
    return '<span class="chord-pill">' + tokenToChord(t, keyIdx) + '</span>'
  }).join(' ')
}

// ============================================================
// HELPERS
// ============================================================

function keyIndex(key) {
  const idx = KEYS.indexOf(key)
  if (idx >= 0) return idx
  // handle flats
  const flatToSharp = {'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#'}
  return KEYS.indexOf(flatToSharp[key] || key)
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
}

function serviceTypeBadge(type) {
  const cls = {
    'Subuh': 'type-subuh',
    'Minggu Pagi': 'type-minggu-pagi',
    'Minggu Siang': 'type-minggu-siang',
    'Rabu': 'type-rabu'
  }
  return `<span class="type-badge ${cls[type] || ''}">${type}</span>`
}

function toast(msg, duration = 2000) {
  let el = document.getElementById('toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'toast'
    el.className = 'toast'
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.classList.add('show')
  setTimeout(() => el.classList.remove('show'), duration)
}

function setActive(selector, activeEl) {
  document.querySelectorAll(selector).forEach(el => el.classList.remove('active'))
  if (activeEl) activeEl.classList.add('active')
}
