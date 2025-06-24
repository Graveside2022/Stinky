#!/bin/bash
# Process monitor for development

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_DIR="${PROJECT_ROOT}/dev/pids"

watch -n 2 "
echo 'Stinkster Development Process Monitor'
echo '====================================='
echo
for pidfile in ${PID_DIR}/*.pid; do
    if [ -f \"\$pidfile\" ]; then
        component=\$(basename \"\$pidfile\" .pid)
        pid=\$(cat \"\$pidfile\")
        if kill -0 \"\$pid\" 2>/dev/null; then
            echo \"✓ \$component (PID: \$pid)\"
            ps -p \"\$pid\" -o pid,ppid,pcpu,pmem,etime,cmd --no-headers | sed 's/^/  /'
        else
            echo \"✗ \$component (stopped)\"
        fi
        echo
    fi
done
"
