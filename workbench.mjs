import { USER, normalizeEvents, getWorkbench } from './activity.mjs';

let events = [];
let repositories = {};
const dateLabel = value => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const $ = id => document.getElementById(id);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function render() {
  const projects = getWorkbench(events);
  const notes = $('project-notes');
  notes.replaceChildren();
  $('bench-empty').hidden = projects.length > 0;

  for (const [index, project] of projects.entries()) {
    const link = element('a', 'project-note');
    link.href = `https://github.com/${project.name}`;
    link.style.setProperty('--presence', project.opacity);
    link.setAttribute('aria-label', `${project.name.split('/')[1]} on GitHub, last active ${dateLabel(project.latest)}`);
    const top = element('span', 'note-top');
    const mark = element('span', 'note-mark', ['⌘', '✳', '⌁', '↗', '⊹', '◇'][index % 6]);
    mark.setAttribute('aria-hidden', 'true');
    top.append(mark, element('span', '', dateLabel(project.latest)));
    link.append(top, element('span', 'project-name', project.name.split('/')[1].replaceAll('-', ' ')));
    const description = repositories[project.name]?.description;
    if (description) link.append(element('span', 'project-description', description));
    link.append(element('span', 'note-meta', 'open on GitHub ↗'));
    notes.append(link);
  }
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
    const projects = getWorkbench(events);
    await Promise.allSettled(projects.filter(project => !repositories[project.name]).map(async project => {
      const repo = await getJSON(`https://api.github.com/repos/${project.name}`);
      repositories[project.name] = { description: repo.description };
    }));
    for (const project of projects) {
      const note = document.querySelector(`.project-note[href="https://github.com/${project.name}"]`);
      const description = repositories[project.name]?.description;
      if (note && description && !note.querySelector('.project-description')) note.querySelector('.project-name').after(element('span', 'project-description', description));
    }
  } catch {
    if (snapshot) {
      $('bench-status').textContent = `Saved snapshot · ${dateLabel(snapshot.fetchedAt)}`;
      $('bench-status').title = `GitHub is unavailable. Saved ${new Date(snapshot.fetchedAt).toUTCString()}. Projects still fade with age.`;
    } else {
      $('bench-status').textContent = 'The workshop is temporarily offline';
      $('bench-empty').hidden = false;
      $('bench-empty').textContent = 'Couldn’t load the workbench. You can still explore my projects on GitHub below.';
    }
  }
}

load();
