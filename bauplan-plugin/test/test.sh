#!/usr/bin/env bash
# Testet BauplanLive auf einem nachgebauten Paper-Server (zwei Spieler, einer läuft im Kreis).
# Prüft: Website-Auslieferung, /api/players, /api/state (GET/POST), Live-Strom, /bauplan-Befehl, Pfad-Schutz.
set -uo pipefail
cd "$(dirname "$0")/.."
./build.sh >/dev/null 2>&1 || { echo "Build fehlgeschlagen"; exit 1; }
TMP=$(mktemp -d)
javac --release 21 -d "$TMP/classes" -cp dist/BauplanLive.jar $(find test/fakeserver -name '*.java') 2>/dev/null || { echo "Testserver kompiliert nicht"; exit 1; }
PORT=8100
(cd "$TMP" && java -cp classes:"$OLDPWD/dist/BauplanLive.jar" test.FakeServer 15000 > server.log 2>&1 &)
sleep 4
FEHLER=0
pruefe() { if echo "$2" | grep -qi "$3"; then echo "  ok   $1"; else echo "  FEHLER $1: erwartet '$3', bekommen: ${2:0:200}"; FEHLER=$((FEHLER+1)); fi; }
pruefe "Website wird ausgeliefert" "$(curl -s localhost:$PORT/)" '<div id="root">'
pruefe "Bauplan-Datei liegt bereit" "$(curl -s -o /dev/null -w '%{http_code}' localhost:$PORT/projekte/hogwarts.mcbp.gz)" '200'
pruefe "Spielerliste enthält Josef" "$(curl -s localhost:$PORT/api/players)" '"name":"Josef"'
pruefe "Spielerliste enthält Steve" "$(curl -s localhost:$PORT/api/players)" '"name":"Steve"'
pruefe "/bauplan ursprung hat den Ursprung gesetzt" "$(curl -s localhost:$PORT/api/state)" '"origin":\[1000,60,2000\]'
pruefe "Folgen setzen (POST)" "$(curl -s -X POST -d '{"follow":"Steve"}' localhost:$PORT/api/state)" '"follow":"Steve"'
pruefe "Entsperren (POST)" "$(curl -s -X POST -d '{"follow":null}' localhost:$PORT/api/state)" '"follow":null'
pruefe "Ursprung ändern (POST)" "$(curl -s -X POST -d '{"origin":[1,2,3]}' localhost:$PORT/api/state)" '"origin":\[1,2,3\]'
pruefe "Live-Strom sendet Daten" "$(timeout 2 curl -s -N localhost:$PORT/api/stream | head -c 300)" 'data: {"players"'
pruefe "Bauplan-Einstellung wird mitgeschickt" "$(curl -s localhost:$PORT/api/state)" '"plan":"projekte/hogwarts.mcbp.gz"'
pruefe "Pfad-Schutz" "$(curl -s -o /dev/null -w '%{http_code}' --path-as-is localhost:$PORT/../einstellungen.properties)" '404'
pruefe "CORS für lokale Entwicklung" "$(curl -s -D - -o /dev/null localhost:$PORT/api/state)" 'Access-Control-Allow-Origin: \*'
A=$(curl -s localhost:$PORT/api/players); sleep 1; B=$(curl -s localhost:$PORT/api/players)
if [ "$A" != "$B" ]; then echo "  ok   Positionen aktualisieren sich"; else echo "  FEHLER Positionen ändern sich nicht"; FEHLER=$((FEHLER+1)); fi
sleep 12; rm -rf "$TMP"
[ $FEHLER -eq 0 ] && echo "Alle Plugin-Tests bestanden." || { echo "$FEHLER Test(s) fehlgeschlagen."; exit 1; }
