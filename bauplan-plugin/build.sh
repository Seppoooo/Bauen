#!/usr/bin/env bash
# Baut BauplanLive.jar ohne Internet: kompiliert gegen die Schnittstellen in stubs/ (nur Compile-Zeit)
# und packt die gebaute Bauplan-Website aus ../minecraft-builder/dist mit hinein.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf build && mkdir -p build/stubs build/classes build/res/web
javac --release 21 -d build/stubs $(find stubs -name '*.java')
javac --release 21 -encoding UTF-8 -cp build/stubs -d build/classes $(find src/main/java -name '*.java')
cp src/main/resources/plugin.yml build/res/
if [ -d ../minecraft-builder/dist ]; then
  cp -r ../minecraft-builder/dist/. build/res/web/
  (cd build/res/web && find . -type f ! -name dateien.txt | sed 's|^\./||' | sort > dateien.txt)
else
  echo "Hinweis: ../minecraft-builder/dist fehlt – zuerst dort 'npm run build' ausführen." >&2
fi
mkdir -p dist
jar --create --file dist/BauplanLive.jar -C build/classes . -C build/res .
echo "fertig: dist/BauplanLive.jar ($(du -h dist/BauplanLive.jar | cut -f1))"
