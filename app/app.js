import { fetchIncidents, ack } from './api.js';

const REFRESH_MS = 2000;

const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const error = document.querySelector('.error');

// Viewer's own zone and locale order: en-GB / de-DE give dd/mm, en-US gives mm/dd (R5).
const timeFormat = new Intl.DateTimeFormat(navigator.languages, {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

const rows = new Map(); // incident id -> <li>

function rowFor(i) {
  const li = document.createElement('li');
  li.dataset.testid = 'incident-row';
  li.dataset.id = i.id;
  li.className = `row ${i.severity}`;

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

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.testid = 'ack';
  button.className = 'ack';
  button.textContent = 'Ack';
  button.addEventListener('click', () => onAck(i.id, button));

  li.append(id, sev, what, time, button);
  return li;
}

async function onAck(id, button) {
  button.disabled = true;
  try {
    await ack(id);
    const mark = document.createElement('span');
    mark.dataset.testid = 'acked';
    mark.className = 'acked';
    mark.textContent = 'acked';
    button.replaceWith(mark);
    rows.get(id)?.classList.add('is-acked');
  } catch (err) {
    button.disabled = false;
    showError(err);
  }
}

function showError(err) {
  error.textContent = String(err.message ?? err);
  error.hidden = false;
}

// Keeps existing rows (and their ack state) in place; only new incidents are added, newest first (R1).
function render(incidents) {
  const newestFirst = [...incidents].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
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
