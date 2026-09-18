export const USER = 'Milbaxter';
const DAY = 86400000;
const kinds = new Set([
  'PushEvent', 'CreateEvent', 'PullRequestEvent', 'PullRequestReviewEvent',
  'PullRequestReviewCommentEvent', 'IssuesEvent', 'IssueCommentEvent',
  'ReleaseEvent', 'DiscussionEvent',
]);

export function normalizeEvents(events) {
  const seen = new Set();
  return events.filter(event => {
    if (event.public !== true || !kinds.has(event.type) || seen.has(event.id)) return false;
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

export function getWorkbench(events, now = new Date()) {
  const projects = new Map();
  for (const event of events) {
    const age = (now.getTime() - Date.parse(event.at)) / DAY;
    if (!Number.isFinite(age) || age < 0 || age >= 30) continue;
    const previous = projects.get(event.repo);
    if (!previous || age < previous.age) {
      projects.set(event.repo, { name: event.repo, latest: event.at, age });
    }
  }
  return [...projects.values()]
    .sort((a, b) => a.age - b.age)
    .slice(0, 6)
    .map(project => ({
      ...project,
      opacity: 1 - Math.max(0, project.age - 4) / 26,
    }));
}
