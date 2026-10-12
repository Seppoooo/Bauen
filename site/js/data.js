// Platzhalter-Daten. Später durch API ersetzen (z. B. GET /api/videos).
// src: URL zur Videodatei (MP4/HLS), thumb: Vorschaubild – hier leer.
window.CATEGORIES = ['Amateur', 'Paare', 'Solo', 'Romantik', 'Outdoor', 'Massage', 'POV', 'Vintage'];

window.VIDEOS = Array.from({ length: 60 }, (_, i) => {
  const id = i + 1;
  const cat = window.CATEGORIES[i % window.CATEGORIES.length];
  return {
    id,
    title: `${cat} – Video ${id}`,
    category: cat,
    tags: [cat.toLowerCase(), id % 2 ? 'hd' : '4k', id % 3 ? 'neu' : 'beliebt'],
    duration: 120 + ((id * 137) % 1800),            // Sekunden
    views: (id * 7919) % 250000,
    rating: 60 + ((id * 31) % 40),                  // Prozent positiv
    uploaded: new Date(Date.now() - id * 86400000 * 1.7).toISOString(),
    uploader: `kanal${(id % 9) + 1}`,
    thumb: '',
    src: ''
  };
});
