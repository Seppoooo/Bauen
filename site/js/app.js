const PAGE_SIZE = 24;

function fmtDuration(s) {
  const m = Math.floor(s / 60), sec = String(s % 60).padStart(2, '0');
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
function fmtViews(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);
}
function fmtAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d < 1) return 'heute';
  if (d < 30) return `vor ${d} Tag${d > 1 ? 'en' : ''}`;
  if (d < 365) return `vor ${Math.floor(d / 30)} Mon.`;
  return `vor ${Math.floor(d / 365)} J.`;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function card(v) {
  const thumb = v.thumb
    ? `<img src="${esc(v.thumb)}" alt="" loading="lazy">`
    : `<div class="thumb-placeholder" style="--h:${(v.id * 47) % 360}"></div>`;
  return `
    <a class="card" href="video.html?id=${v.id}">
      <div class="thumb">${thumb}<span class="duration">${fmtDuration(v.duration)}</span></div>
      <div class="card-title">${esc(v.title)}</div>
      <div class="card-meta">${fmtViews(v.views)} Aufrufe · ${v.rating}% · ${fmtAgo(v.uploaded)}</div>
    </a>`;
}

function initIndex() {
  const grid = document.getElementById('grid');
  if (!grid) return;
  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get('q') || '',
    cat: params.get('cat') || '',
    sort: params.get('sort') || 'new',
    page: Math.max(1, parseInt(params.get('page'), 10) || 1)
  };

  const search = document.getElementById('search');
  const sort = document.getElementById('sort');
  const cats = document.getElementById('categories');
  search.value = state.q;
  sort.value = state.sort;

  function sync() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.cat) p.set('cat', state.cat);
    if (state.sort !== 'new') p.set('sort', state.sort);
    if (state.page > 1) p.set('page', state.page);
    history.replaceState(null, '', `${location.pathname}${p.toString() ? '?' + p : ''}`);
    render();
  }

  function render() {
    cats.innerHTML = ['', ...window.CATEGORIES].map((c) =>
      `<button type="button" data-cat="${esc(c)}" class="${c === state.cat ? 'active' : ''}">${c ? esc(c) : 'Alle'}</button>`
    ).join('');

    const q = state.q.trim().toLowerCase();
    let list = window.VIDEOS.filter((v) =>
      (!state.cat || v.category === state.cat) &&
      (!q || v.title.toLowerCase().includes(q) || v.tags.some((t) => t.includes(q)))
    );
    const sorters = {
      new: (a, b) => new Date(b.uploaded) - new Date(a.uploaded),
      views: (a, b) => b.views - a.views,
      rating: (a, b) => b.rating - a.rating,
      duration: (a, b) => b.duration - a.duration
    };
    list = list.slice().sort(sorters[state.sort] || sorters.new);

    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const slice = list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

    document.getElementById('result-info').textContent = `${list.length} Videos`;
    grid.innerHTML = slice.length ? slice.map(card).join('') : '<p class="empty">Keine Treffer.</p>';

    const pager = document.getElementById('pager');
    pager.innerHTML = pages > 1
      ? Array.from({ length: pages }, (_, i) =>
          `<button type="button" data-page="${i + 1}" class="${i + 1 === state.page ? 'active' : ''}">${i + 1}</button>`
        ).join('')
      : '';
  }

  cats.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.cat = b.dataset.cat; state.page = 1; sync();
  });
  document.getElementById('pager').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.page = Number(b.dataset.page); sync(); window.scrollTo(0, 0);
  });
  document.getElementById('search-form').addEventListener('submit', (e) => e.preventDefault());
  let t;
  search.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = search.value; state.page = 1; sync(); }, 200);
  });
  sort.addEventListener('change', () => { state.sort = sort.value; state.page = 1; sync(); });

  render();
}

initIndex();
