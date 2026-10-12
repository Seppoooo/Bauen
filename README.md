# Velvet – Video-Plattform für Erwachsene (Frontend-Prototyp)

Statisches Frontend (HTML/CSS/JS, keine Abhängigkeiten) für eine Video-Plattform mit Inhalten für Erwachsene.
Enthält **keine** echten Inhalte – nur Platzhalter.

## Starten

```bash
cd site
python3 -m http.server 8000
# → http://localhost:8000
```

## Funktionen

- Altersabfrage (Overlay, blendet Seite bis zur Bestätigung aus)
- Startseite mit Video-Grid, Kategorien, Live-Suche, Sortierung, Paginierung (Zustand in der URL)
- Videoseite mit Player, Metadaten, Tags, Like/Dislike, ähnlichen Videos
- Rechtliches: AGB, Datenschutz, 2257-Hinweis, Impressum, Meldeformular für Inhalte

## Struktur

```
site/
  index.html      Startseite
  video.html      Videoseite (?id=…)
  legal.html      Rechtliches + Meldeformular
  css/style.css
  js/agegate.js   Altersabfrage
  js/data.js      Platzhalter-Daten (durch API ersetzen)
  js/app.js       Grid, Suche, Filter, Paginierung
  js/video.js     Videoseite
```

## Vor einem Livebetrieb zwingend nötig

- **Altersverifikation:** In Deutschland verlangt der JMStV für pornografische Inhalte ein geschlossenes
  Benutzergruppen-System mit von der KJM anerkannter Altersverifikation. Der Klick-Dialog hier reicht dafür **nicht**.
  Auch UK (Online Safety Act), Frankreich und viele US-Bundesstaaten haben eigene Pflichten.
- **Darsteller-Nachweise:** Alter und Einwilligung aller abgebildeten Personen müssen vor Veröffentlichung
  verifiziert und dokumentiert werden (z. B. 18 U.S.C. 2257 für US-Bezug).
- **Moderation & Meldewege:** Uploads vor Freischaltung prüfen, Hash-Abgleich (z. B. PhotoDNA),
  Meldungen schnell bearbeiten, CSAM an Behörden (z. B. NCMEC / BKA) melden. DSA-Pflichten in der EU beachten.
- **Jugendschutzbeauftragte/r**, Impressum, DSGVO-konforme Datenschutzerklärung.
- **Backend:** Upload, Transcoding (z. B. HLS), CDN, Nutzerkonten, Zahlungsanbieter mit Adult-Freigabe.

## Eigene Videos einbinden (lokal)

1. Videos in `site/media/` ablegen – Unterordner werden zu Kategorien (`site/media/Paare/video.mp4`).
2. `python3 tools/scan_media.py` ausführen. Erzeugt `site/js/library.js`; mit installiertem ffmpeg
   auch Länge und Vorschaubilder.
3. Seite neu laden – die Platzhalter werden durch deine Videos ersetzt.

`site/media/` und `site/js/library.js` stehen in `.gitignore` und werden nicht ins Repo hochgeladen.
