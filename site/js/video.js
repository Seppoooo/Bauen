(function () {
  const id = Number(new URLSearchParams(location.search).get('id'));
  const v = window.VIDEOS.find((x) => x.id === id);
  const main = document.querySelector('.watch');
  if (!v) {
    main.innerHTML = '<h1>Video nicht gefunden</h1><p><a href="index.html">Zur Startseite</a></p>';
    return;
  }

  document.title = `Velvet – ${v.title}`;
  const player = document.getElementById('player');
  if (v.src) {
    player.src = v.src;
    if (v.thumb) player.poster = v.thumb;
  } else {
    player.hidden = true;
    document.getElementById('player-empty').hidden = false;
  }

  document.getElementById('title').textContent = v.title;
  document.getElementById('meta').textContent =
    `${v.views.toLocaleString('de-DE')} Aufrufe · ${v.rating}% positiv · ${fmtDuration(v.duration)} · von ${v.uploader} · ${fmtAgo(v.uploaded)}`;
  document.getElementById('tags').innerHTML = v.tags
    .map((t) => `<a class="tag" href="index.html?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('');
  document.getElementById('report').href = `legal.html?video=${v.id}#report`;

  // Bewertungen lokal speichern (später über API)
  const KEY = `velvet_vote_${v.id}`;
  const likeCount = document.getElementById('like-count');
  const base = Math.round(v.views * v.rating / 1000);
  function paint() {
    let vote = null;
    try { vote = localStorage.getItem(KEY); } catch (e) {}
    likeCount.textContent = base + (vote === 'up' ? 1 : 0);
    document.getElementById('like').classList.toggle('active', vote === 'up');
    document.getElementById('dislike').classList.toggle('active', vote === 'down');
  }
  function vote(dir) {
    try {
      localStorage.getItem(KEY) === dir ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, dir);
    } catch (e) {}
    paint();
  }
  document.getElementById('like').addEventListener('click', () => vote('up'));
  document.getElementById('dislike').addEventListener('click', () => vote('down'));
  paint();

  const related = window.VIDEOS
    .filter((x) => x.id !== v.id && (x.category === v.category || x.tags.some((t) => v.tags.includes(t))))
    .slice(0, 12);
  document.getElementById('related').innerHTML = related.map(card).join('');
})();
