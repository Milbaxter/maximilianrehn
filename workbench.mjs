import { USER, kinds, normalizeEvents, summarize, countsLabel } from './activity.mjs';

let events = [];
let repositories = {};
let days = 30;
let selected = null;
const dateLabel = value => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const $ = id => document.getElementById(id);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function render() {
  const summary = summarize(events, days);
  const notes = $('project-notes');
  notes.replaceChildren();
  $('bench-empty').hidden = summary.projects.length > 0;
  $('activity-summary').textContent = `${summary.events.length} public activities · ${summary.projects.length} projects`;
  $('activity-range').textContent = `${dateLabel(summary.daily[0].date)} – ${dateLabel(summary.daily.at(-1).date)} · UTC`;
  $('activity-days').replaceChildren(...summary.daily.map(day => {
    const mark = element('span', 'activity-day');
    const label = `${dateLabel(day.date)}: ${day.count} ${day.count === 1 ? 'activity' : 'activities'}`;
    mark.title = label;
    mark.setAttribute('aria-label', label);
    mark.setAttribute('role', 'img');
    mark.dataset.level = Math.min(4, Math.ceil(day.count / 2));
    return mark;
  }));

  for (const [index, project] of summary.projects.slice(0, 6).entries()) {
    const button = element('button', 'project-note');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(selected === project.name));
    button.setAttribute('aria-controls', 'project-detail');
    const top = element('span', 'note-top');
    const mark = element('span', 'note-mark', ['⌘', '✳', '⌁', '↗', '⊹', '◇'][index]);
    mark.setAttribute('aria-hidden', 'true');
    top.append(mark, element('span', '', `touched ${dateLabel(project.latest)}`));
    button.append(top, element('span', 'project-name', project.name.split('/')[1].replaceAll('-', ' ')));
    const description = repositories[project.name]?.description;
    if (description) button.append(element('span', 'project-description', description));
    const sparkline = element('span', 'note-sparkline');
    sparkline.setAttribute('aria-hidden', 'true');
    const daily = summarize(project.events, days).daily;
    const max = Math.max(1, ...daily.map(day => day.count));
    for (const day of daily) {
      const bar = element('i');
      bar.style.height = `${day.count ? 4 + day.count / max * 20 : 2}px`;
      if (!day.count) bar.style.opacity = '.12';
      sparkline.append(bar);
    }
    const meta = element('span', 'note-meta');
    meta.append(element('span', '', `${project.events.length} ${project.events.length === 1 ? 'activity' : 'activities'}`), element('span', '', 'take a peek ↗'));
    button.append(sparkline, meta);
    button.addEventListener('click', () => {
      selected = selected === project.name ? null : project.name;
      for (const note of notes.children) note.setAttribute('aria-pressed', String(note === button && selected !== null));
      renderDetail(selected ? project : null);
      if (selected) {
        $('detail-title').focus({ preventScroll: true });
        $('project-detail').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }
    });
    notes.append(button);
  }
  renderDetail(summary.projects.slice(0, 6).find(project => project.name === selected));
}

function renderDetail(project) {
  const detail = $('project-detail');
  detail.replaceChildren();
  detail.hidden = !project;
  if (!project) { selected = null; return; }
  const title = element('h3', '', project.name.split('/')[1]);
  title.id = 'detail-title';
  title.tabIndex = -1;
  const list = element('ul');
  for (const event of [...project.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 4)) {
    const row = element('li');
    const time = element('time', '', dateLabel(event.at));
    time.dateTime = event.at;
    row.append(element('span', '', kinds[event.type][2]), time);
    list.append(row);
  }
  const link = element('a', '', 'Open the project on GitHub ↗');
  link.href = `https://github.com/${project.name}`;
  detail.append(title, element('p', '', countsLabel(project.events)), list, link);
}

async function getJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function load() {
  let snapshot;
  try {
    snapshot = await getJSON('./data/workbench.json');
    events = snapshot.events;
    repositories = snapshot.repositories;
    render();
    $('bench-status').textContent = 'Checking the latest activity…';
  } catch {
    $('bench-status').textContent = 'Fetching public GitHub activity…';
  }
  try {
    const raw = [];
    for (let page = 1; page <= 3; page++) {
      const batch = await getJSON(`https://api.github.com/users/${USER}/events/public?per_page=100&page=${page}`);
      raw.push(...batch);
      if (batch.length < 100) break;
    }
    events = normalizeEvents(raw);
    render();
    $('bench-status').textContent = 'Fresh from GitHub';
    $('bench-source').textContent = 'Latest available public activity · up to 300 events · GitHub may lag a few hours.';
    const projects = summarize(events, 30).projects.slice(0, 6);
    await Promise.allSettled(projects.map(async project => {
      const repo = await getJSON(`https://api.github.com/repos/${project.name}`);
      repositories[project.name] = { description: repo.description };
    }));
    // Add descriptions without replacing a note while someone is interacting with it.
    for (const [index, project] of summarize(events, days).projects.slice(0, 6).entries()) {
      const note = $('project-notes').children[index];
      const description = repositories[project.name]?.description;
      if (description && !note.querySelector('.project-description')) note.querySelector('.project-name').after(element('span', 'project-description', description));
    }
  } catch {
    if (snapshot) {
      $('bench-status').textContent = `Saved snapshot · ${dateLabel(snapshot.fetchedAt)}`;
      $('bench-source').textContent = `GitHub is unavailable right now. Showing the snapshot from ${new Date(snapshot.fetchedAt).toLocaleString('en', { timeZone: 'UTC' })} UTC; activity windows use today's date.`;
    } else {
      $('bench-status').textContent = 'The workshop is temporarily offline';
      $('bench-empty').hidden = false;
      $('bench-empty').textContent = 'Couldn’t load the workbench. You can still explore my projects on GitHub below.';
    }
  }
}

document.querySelectorAll('[data-days]').forEach(button => {
  button.addEventListener('click', () => {
    days = Number(button.dataset.days);
    for (const option of document.querySelectorAll('[data-days]')) option.setAttribute('aria-pressed', String(option === button));
    render();
  });
});
load();
