#!/bin/sh

export DISPLAY=":1"

start_xvfb() {
    [ -e "/tmp/.X1-lock" ] && rm -f /tmp/.X1-lock
    nohup Xvfb :1 -screen 0 1920x1080x24 -pn -noreset >> /tmp/xvfb.log 2>&1 &
    echo $!
}

XVFB_PID="$(start_xvfb)"
echo -e "[startup] xvfb started with PID $XVFB_PID"
sleep 1

# make dbus visible to other processes
mkdir -p /var/run/dbus/
export DBUS_STARTER_BUS_TYPE="session"
export DBUS_STARTER_ADDRESS="unix:path=/var/run/dbus/system_bus_socket"
export DBUS_SESSION_BUS_ADDRESS="unix:path=/var/run/dbus/system_bus_socket"
unset DBUS_SESSION_BUS_PID
unset DBUS_SESSION_BUS_WINDOWID
# open unix socket for dbus, on common setups it's done by systemd
python -c "import socket; s = socket.socket(socket.AF_UNIX); s.bind('/var/run/dbus/system_bus_socket')"
# start it
dbus-daemon --session --nofork --nosyslog --nopidfile --address=$DBUS_STARTER_ADDRESS >> /tmp/dbus.log 2>&1 &
returncode=$?
DBUS_PID=$!
[ $returncode -ne 0 ] && exit $returncode
echo -e "[startup] dbus started with PID $DBUS_PID"
sleep 1

google-chrome --no-sandbox --no-first-run

returncode=$?
kill $XVFB_PID
kill $DBUS_PID
sleep 1
exit $returncode