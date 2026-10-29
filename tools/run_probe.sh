#!/usr/bin/env bash
# Текст образцов через настоящий конвейер приложения.
#   bash tools/run_probe.sh in.json out.json
# Зонд копируется в тесты ruvoice-tts только на время запуска и удаляется; рабочее дерево приложения
# после запуска сверяется с тем, что было до него.
set -euo pipefail
in=$(realpath "$1")
out=$(realpath -m "$2")
here=$(cd "$(dirname "$0")" && pwd)
app=/home/kost/serverApp/ruvoice/silero-tts-android
dst=$app/app/src/test/java/ru/kost/ruvoice/SiteSamplesProbe.kt

before=$(git -C "$app" status --porcelain)
[ -e "$dst" ] && { echo "в приложении уже лежит $dst, не трогаю" >&2; exit 1; }
rm -f "$out"
cp "$here/probe/SiteSamplesProbe.kt" "$dst"
trap 'rm -f "$dst"' EXIT
(cd "$app" && SITE_PROBE_IN="$in" SITE_PROBE_OUT="$out" \
  SITE_STRESS_PY=/home/kost/serverApp/ruvoice/venv-et/bin/python SITE_STRESS_SERVER="$here/stress_server.py" \
  ./gradlew :app:testFullDebugUnitTest --tests 'ru.kost.ruvoice.SiteSamplesProbe' --rerun -q)
rm -f "$dst"
trap - EXIT
[ "$before" = "$(git -C "$app" status --porcelain)" ] || { echo "рабочее дерево приложения изменилось" >&2; exit 1; }
[ -s "$out" ] || { echo "зонд не записал $out" >&2; exit 1; }
echo "ok: $out"
