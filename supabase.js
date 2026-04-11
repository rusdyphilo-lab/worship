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

const INTERVALS = {
  '1':0, '2m':1, '2':2, '2M':2, '2#':2,
  '3m':3, '3':4, '3M':4,
  '4':5, '4m':5, '4#':6,
  '5m':6, '5':7, '5#':8,
  '6m':8, '6':9, '6M':9, '6#':9,
  '7m':10, '7':10
}

function tokenToChord(token, keyIdx) {
  if (!token || token === '|' || token === '/') return token
  if (token.startsWith('(')) return token

  // handle slash chord: e.g. 1on4
  let base = token, slash = ''
  const onIdx = token.indexOf('on')
  if (onIdx > 0) {
    base = token.slice(0, onIdx)
    slash = token.slice(onIdx + 2)
  }

  if (INTERVALS[base] === undefined) return token

  const noteIdx = (keyIdx + INTERVALS[base]) % 12
  let note = KEYS[noteIdx]
  if (FLAT_MAP[note]) note = FLAT_MAP[note]

  // determine quality
  const isMinor = base.endsWith('m') && !base.endsWith('M')
  let chord = note + (isMinor ? 'm' : '')

  if (slash && INTERVALS[slash] !== undefined) {
    const slashIdx = (keyIdx + INTERVALS[slash]) % 12
    let slashNote = KEYS[slashIdx]
    if (FLAT_MAP[slashNote]) slashNote = FLAT_MAP[slashNote]
    chord += '/' + slashNote
  }

  return chord
}

function renderProgression(tokens, keyIdx) {
  if (!tokens || tokens.length === 0) return ''
  return tokens.map(t => {
    if (t === '|') return '<span class="chord-sep">|</span>'
    if (t === '/') return '<span class="chord-sep">/</span>'
    if (t.startsWith('(')) return `<span class="chord-note">${t}</span>`
    const chord = tokenToChord(t, keyIdx)
    return `<span class="chord-pill">${chord}</span>`
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
