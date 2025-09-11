#!/bin/bash
# GitHub Callback Server Init Script für MX Linux (SysV Init)
### BEGIN INIT INFO
# Provides:          github-callback
# Required-Start:    $local_fs $network $named
# Required-Stop:     $local_fs $network $named
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: GitHub Callback Server für dennis AI Automation
# Description:       Callback server für GitHub webhook automation
### END INIT INFO

USER="dennis"
DAEMON="github-callback-server"
ROOT_DIR="/home/dennis/autodevai"
DAEMON_PATH="$ROOT_DIR/github-callback-server.js"
LOCK_FILE="/var/lock/subsys/$DAEMON"
LOG_FILE="/var/log/github-callback.log"
PID_FILE="/var/run/$DAEMON.pid"

# Source environment
[ -f "$ROOT_DIR/.env.dennis" ] && source "$ROOT_DIR/.env.dennis"

test -x $DAEMON_PATH || exit 0

start() {
    echo -n "Starting $DAEMON: "
    
    # Check if already running
    if [ -f $PID_FILE ]; then
        PID=$(cat $PID_FILE)
        if ps -p $PID > /dev/null; then
            echo "already running (PID: $PID)"
            return 1
        else
            rm -f $PID_FILE
        fi
    fi
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    chown dennis:dennis "$LOG_FILE"
    
    # Start daemon
    cd "$ROOT_DIR"
    sudo -u $USER nohup /usr/bin/node $DAEMON_PATH >> $LOG_FILE 2>&1 &
    PID=$!
    
    if [ $? -eq 0 ]; then
        echo $PID > $PID_FILE
        # Create lock directory if not exists
        sudo mkdir -p "$(dirname "$LOCK_FILE")"
        touch $LOCK_FILE
        echo "OK"
        return 0
    else
        echo "FAILED"
        return 1
    fi
}

stop() {
    echo -n "Stopping $DAEMON: "
    
    if [ -f $PID_FILE ]; then
        PID=$(cat $PID_FILE)
        kill $PID 2>/dev/null
        
        # Wait for process to stop
        for i in {1..10}; do
            if ! ps -p $PID > /dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if ps -p $PID > /dev/null; then
            kill -9 $PID 2>/dev/null
        fi
        
        rm -f $PID_FILE $LOCK_FILE
        echo "OK"
        return 0
    else
        echo "not running"
        return 1
    fi
}

restart() {
    stop
    sleep 2
    start
}

status() {
    if [ -f $PID_FILE ]; then
        PID=$(cat $PID_FILE)
        if ps -p $PID > /dev/null; then
            echo "$DAEMON is running (PID: $PID)"
            return 0
        else
            echo "$DAEMON is not running (stale PID file)"
            rm -f $PID_FILE
            return 1
        fi
    else
        echo "$DAEMON is not running"
        return 3
    fi
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit $?