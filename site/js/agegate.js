// Einfache Altersabfrage. Achtung: In Deutschland (JMStV) reicht ein Klick-Dialog
// NICHT aus – für den Livebetrieb ist ein von der KJM anerkanntes Altersverifikationssystem nötig.
(function () {
  const KEY = 'velvet_age_ok';
  let ok = false;
  try { ok = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (ok) return;

  document.documentElement.classList.add('gated');
  document.addEventListener('DOMContentLoaded', () => {
    const gate = document.createElement('div');
    gate.className = 'agegate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.innerHTML = `
      <div class="agegate-box">
        <h1>Nur für Erwachsene</h1>
        <p>Diese Website enthält Inhalte für Erwachsene. Du musst mindestens 18 Jahre alt sein
        (bzw. das in deinem Land geltende Mindestalter erreicht haben), um fortzufahren.</p>
        <div class="agegate-actions">
          <button type="button" id="age-yes">Ich bin 18 oder älter</button>
          <a href="https://www.google.com" id="age-no">Verlassen</a>
        </div>
      </div>`;
    document.body.appendChild(gate);
    document.getElementById('age-yes').addEventListener('click', () => {
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      gate.remove();
      document.documentElement.classList.remove('gated');
    });
    document.getElementById('age-yes').focus();
  });
})();
