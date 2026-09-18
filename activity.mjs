export const USER = 'Milbaxter';
const DAY = 86400000;
export const kinds = {
  PushEvent: ['push', 'pushes', 'Pushed code'],
  CreateEvent: ['creation', 'creations', 'Created something new'],
  PullRequestEvent: ['pull request', 'pull requests', 'Updated a pull request'],
  PullRequestReviewEvent: ['review', 'reviews', 'Reviewed a pull request'],
  PullRequestReviewCommentEvent: ['review comment', 'review comments', 'Commented on a review'],
  IssuesEvent: ['issue update', 'issue updates', 'Updated an issue'],
  IssueCommentEvent: ['comment', 'comments', 'Joined the conversation'],
  ReleaseEvent: ['release', 'releases', 'Published a release'],
  DiscussionEvent: ['discussion', 'discussions', 'Joined a discussion'],
};

export function normalizeEvents(events) {
  const seen = new Set();
  return events.filter(event => {
    if (event.public !== true || !kinds[event.type] || seen.has(event.id)) return false;
    if (!event.repo?.name?.startsWith(`${USER}/`) || event.repo.name === `${USER}/${USER}`) return false;
    if (!Number.isFinite(Date.parse(event.created_at))) return false;
    seen.add(event.id);
    return true;
  }).map(event => ({
    id: event.id,
    type: event.type,
    repo: event.repo.name,
    at: event.created_at,
  })).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function summarize(events, days, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = today - (days - 1) * DAY;
  const recent = events.filter(event => Date.parse(event.at) >= start && Date.parse(event.at) <= now.getTime());
  const daily = Array.from({ length: days }, (_, i) => ({ date: new Date(start + i * DAY).toISOString().slice(0, 10), count: 0 }));
  const projects = new Map();
  for (const event of recent) {
    daily[Math.floor((Date.parse(event.at) - start) / DAY)].count++;
    if (!projects.has(event.repo)) projects.set(event.repo, { name: event.repo, events: [], latest: event.at });
    const project = projects.get(event.repo);
    project.events.push(event);
    if (event.at > project.latest) project.latest = event.at;
  }
  return { events: recent, daily, projects: [...projects.values()].sort((a, b) => Date.parse(b.latest) - Date.parse(a.latest)) };
}

export function countsLabel(events) {
  const counts = new Map();
  for (const event of events) counts.set(event.type, (counts.get(event.type) || 0) + 1);
  return [...counts].map(([type, count]) => `${count} ${kinds[type][count === 1 ? 0 : 1]}`).join(' · ');
}
