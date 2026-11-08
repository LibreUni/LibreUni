#!/usr/bin/env bash
# One-shot host restart used by the agent at the user's request (see README). Detached from the
# old host's shell tree; logs to /tmp/libreuni-host.log and records both PIDs.
set -u
OLD=70135
LOG=/tmp/libreuni-host.log
NEWPIDFILE=/tmp/libreuni-host.pid
# Only stop the process if it is still the dsh web launcher we identified.
if ps -p "$OLD" -o cmd= 2>/dev/null | grep -q "dsh web"; then
  kill -TERM "$OLD"
  for _ in $(seq 1 30); do ps -p "$OLD" >/dev/null 2>&1 || break; sleep 0.5; done
  ps -p "$OLD" >/dev/null 2>&1 && kill -KILL "$OLD"
fi
sleep 2
cd /home/edf/Documents/GitSynced/LibreUni
setsid nohup /usr/bin/env node /home/edf/.local/bin/dsh web >"$LOG" 2>&1 < /dev/null &
echo $! > "$NEWPIDFILE"
sleep 12
echo "new pid: $(cat $NEWPIDFILE)"
ps -p "$(cat $NEWPIDFILE)" -o pid=,cmd= || echo "new process not running"
curl -s -o /dev/null -w "http %{http_code}\n" http://127.0.0.1:3080/ || true
tail -5 "$LOG" | sed -E 's/(sk-[A-Za-z0-9_-]{6})[A-Za-z0-9_-]+/\1…redacted/g'
