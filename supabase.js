// ============================================================
// supabase.js — shared client & utilities
// ============================================================

// Ganti dengan URL dan anon key dari Supabase project kamu
const SUPABASE_URL = 'https://povljppwudhmbsmpfcrm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdmxqcHB3dWRobWJzbXBmY3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjI1MDIsImV4cCI6MjA5MTQzODUwMn0.AzPOgS9Rv5FQTUXmopPnL2APwSha9uhbp147H7awRcE'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================================
// CHORD TRANSPOSER
// ============================================================

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const FLAT_MAP = {'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'}

// Semitone intervals per degree — m/M hanya ubah quality, bukan root
const INTERVALS = {
  '1':0,  '1m':0,  '1M':0,
  '2':2,  '2m':2,  '2M':2,
  '3':4,  '3m':4,  '3M':4,
  '4':5,  '4m':5,  '4M':5,  '4#':6,
  '5':7,  '5m':7,  '5M':7,  '5#':8,
  '6':9,  '6m':9,  '6M':9,
  '7':11, '7m':11, '7M':11,
}

// Diatonic default quality: true = minor, false = major
// 1=major, 2=minor, 3=minor, 4=major, 5=major, 6=minor, 7=dim
const DEFAULT_MINOR = { '1':false, '2':true, '3':true, '4':false, '5':false, '6':true, '7':false }
const DEFAULT_DIM   = { '7':true }

function tokenToChord(token, keyIdx) {
  if (!token || token === '|' || token === '/') return token
  if (token.startsWith('(')) return token

  // handle slash chord: e.g. 4/5 or 4M/5
  let base = token, slashDeg = ''
  const slashIdx = token.indexOf('/')
  if (slashIdx > 0) {
    base = token.slice(0, slashIdx)
    slashDeg = token.slice(slashIdx + 1)
  }

  // Parse degree and explicit quality suffix
  // token format: <degree>[m|M][#]  e.g. "3", "3m", "3M", "4#", "2m"
  const match = base.match(/^([1-7])([mM]?)([#]?)$/)
  if (!match) return token

  const deg = match[1]           // '1'–'7'
  const qualSuffix = match[2]    // 'm', 'M', or ''
  const sharpSuffix = match[3]   // '#' or ''

  // Determine semitone interval
  const intervalKey = deg + qualSuffix + sharpSuffix
  let semitones = INTERVALS[intervalKey]
  if (semitones === undefined) semitones = INTERVALS[deg + qualSuffix] ?? INTERVALS[deg] ?? 0

  // Determine quality
  let isMinor, isDim
  if (qualSuffix === 'm') {
    isMinor = true; isDim = false
  } else if (qualSuffix === 'M') {
    isMinor = false; isDim = false
  } else {
    // Use diatonic default
    isMinor = DEFAULT_MINOR[deg] ?? false
    isDim   = DEFAULT_DIM[deg] ?? false
  }

  const noteIdx = (keyIdx + semitones) % 12
  let note = KEYS[noteIdx]
  if (FLAT_MAP[note]) note = FLAT_MAP[note]

  let chord = note
  if (isDim)       chord += 'dim'
  else if (isMinor) chord += 'm'

  // Slash bass
  if (slashDeg) {
    const slashMatch = slashDeg.match(/^([1-7])([mM]?)([#]?)$/)
    if (slashMatch) {
      const sKey = slashMatch[1] + slashMatch[2] + slashMatch[3]
      const sSemitones = INTERVALS[sKey] ?? INTERVALS[slashMatch[1] + slashMatch[2]] ?? INTERVALS[slashMatch[1]] ?? 0
      let slashNote = KEYS[(keyIdx + sSemitones) % 12]
      if (FLAT_MAP[slashNote]) slashNote = FLAT_MAP[slashNote]
      chord += '/' + slashNote
    }
  }

  return chord
}

// Parse plain text chord string → token array
function parseChordText(str) {
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

// Normalize section data: always return clean token array
function normalizeSectionTokens(data) {
  if (!data) return []
  let arr
  if (typeof data === 'string') {
    arr = parseChordText(data)
  } else if (Array.isArray(data)) {
    // Legacy flat token array — may contain nulls, empty strings, or nested arrays
    if (data.length === 0) return []
    if (Array.isArray(data[0])) {
      // array-of-arrays: flatten with \n between lines
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
  // Filter: keep only valid tokens
  return arr.filter(function(t) {
    if (!t || typeof t !== 'string') return false
    if (t === '\n') return true
    var s = t.trim()
    if (!s) return false
    if (s === '|' || s === '.') return true
    if (s.startsWith('(') && s.endsWith(')')) return true
    return /^[1-7]/.test(s)
  })
}

// Detect if a token is a "passing/rapat" group: multiple degrees written together
// e.g. "3m2#2m", "145", "4m5"
function isPassingToken(t) {
  if (!t || t === '|' || t === '.' || t.startsWith('(')) return false
  const single = /^[1-7][mM]?[#]?(\/[1-7][mM]?[#]?)?$/
  return !single.test(t) && /[1-7]/.test(t)
}

// Split a passing group string into individual chord tokens
// "3m2#2m" → ["3m","2#","2m"]
function splitPassingTokens(t) {
  return t.match(/[1-7][mM]?[#]?/g) || [t]
}

function renderProgression(tokens, keyIdx) {
  const arr = normalizeSectionTokens(tokens)
  if (!arr || arr.length === 0) return ''
  return arr.map(t => {
    if (t === '|') return '<span class="chord-sep">|</span>'
    if (t === '/') return '<span class="chord-sep">/</span>'
    if (t === ' ') return '<span style="display:inline-block;width:6px"></span>'
    if (t === '.') return '<span class="chord-dot">\xB7</span>'
    if (t === '\n') return ''

    // Sinkopasi group (kurung) — kuning amber
    if (t.startsWith('(') && t.endsWith(')')) {
      const inner = t.slice(1, -1)
      const parts = splitPassingTokens(inner)
      const pills = parts.map(p => '<span class="passing-inner">' + tokenToChord(p, keyIdx) + '</span>').join('')
      return '<span class="chord-pill synco-pill">(' + pills + ')</span>'
    }

    // Passing/rapat group (tanpa kurung) — ungu
    if (isPassingToken(t)) {
      const parts = splitPassingTokens(t)
      const pills = parts.map(p => '<span class="passing-inner">' + tokenToChord(p, keyIdx) + '</span>').join('')
      return '<span class="chord-pill passing-pill">' + pills + '</span>'
    }

    // Chord biasa
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
