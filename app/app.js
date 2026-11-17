import { fetchIncidents, ack } from './api.js';

const REFRESH_MS = 2000;

const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const error = document.querySelector('.error');
const panel = document.querySelector('[data-testid="incident-panel"]');
const panelAck = panel.querySelector('[data-testid="panel-ack"]');
const panelAcked = panel.querySelector('.panel-acked');

// Viewer's own zone and locale order: en-GB / de-DE give dd/mm, en-US gives mm/dd (R5).
const timeFormat = new Intl.DateTimeFormat(navigator.languages, {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

const incidents = new Map(); // incident id -> incident
const rows = new Map(); // incident id -> <li>
const acked = new Set(); // incident ids
let selected = null; // the incident id the panel shows

function rowFor(i) {
  const li = document.createElement('li');
  li.dataset.testid = 'incident-row';
  li.dataset.id = i.id;
  li.className = `row ${i.severity}`;
  li.tabIndex = 0;
  li.setAttribute('role', 'button');
  li.setAttribute('aria-label', `Open ${i.id}`);

  const id = document.createElement('span');
  id.className = 'id';
  id.textContent = i.id;

  const sev = document.createElement('span');
  sev.className = 'sev';
  sev.textContent = i.severity;

  const what = document.createElement('span');
  what.className = 'what';
  what.textContent = `${i.service} · ${i.region} · ${i.summary}`;

  const time = document.createElement('time');
  time.dateTime = i.openedAt;
  time.title = i.openedAt;
  time.textContent = timeFormat.format(new Date(i.openedAt));

  const state = document.createElement('span');
  state.className = 'state';

  li.append(id, sev, what, time, state);
  // A row opens its incident panel; Ack lives there, so a row moving under the pointer cannot ack.
  li.addEventListener('click', () => select(i.id));
  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(i.id);
    }
  });
  return li;
}

function select(id) {
  rows.get(selected)?.classList.remove('is-selected');
  selected = id;
  rows.get(id)?.classList.add('is-selected');
  renderPanel();
}

function renderPanel() {
  const i = incidents.get(selected);
  if (!i) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  panel.dataset.id = i.id;
  panel.querySelector('.panel-id').textContent = i.id;
  panel.querySelector('.panel-sev').textContent = i.severity;
  panel.querySelector('.panel-what').textContent = `${i.service} · ${i.region} · ${i.summary}`;
  panel.querySelector('.panel-time').textContent = `opened ${timeFormat.format(new Date(i.openedAt))}`;
  panelAck.textContent = `Ack ${i.id}`;
  panelAck.hidden = acked.has(i.id);
  panelAck.disabled = false;
  panelAcked.hidden = !acked.has(i.id);
}

// Acks the incident the panel names when clicked, read once so a refresh cannot swap it.
panelAck.addEventListener('click', async () => {
  const id = selected;
  if (!id || acked.has(id)) return;
  panelAck.disabled = true;
  try {
    await ack(id);
    acked.add(id);
    markAcked(id);
    if (selected === id) renderPanel();
  } catch (err) {
    panelAck.disabled = false;
    showError(err);
  }
});

function markAcked(id) {
  const li = rows.get(id);
  if (!li) return;
  li.classList.add('is-acked');
  const mark = document.createElement('span');
  mark.dataset.testid = 'acked';
  mark.className = 'acked';
  mark.textContent = 'acked';
  li.querySelector('.state').replaceChildren(mark);
}

function showError(err) {
  error.textContent = String(err.message ?? err);
  error.hidden = false;
}

// Keeps existing rows (and their ack state) in place; only new incidents are added, newest first (R1).
function render(current) {
  for (const i of current) incidents.set(i.id, i);
  const newestFirst = [...current].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  newestFirst.forEach((i, index) => {
    let li = rows.get(i.id);
    if (!li) {
      li = rowFor(i);
      rows.set(i.id, li);
    }
    if (list.children[index] !== li) list.insertBefore(li, list.children[index] ?? null);
  });
  empty.hidden = rows.size > 0;
}

async function refresh() {
  try {
    const page = await fetchIncidents();
    render(page.incidents);
    error.hidden = true;
  } catch (err) {
    showError(err);
  } finally {
    loader.remove(); // R3: gone once the first answer is in
    setTimeout(refresh, REFRESH_MS); // R4
  }
}

refresh();
