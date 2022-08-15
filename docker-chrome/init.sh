#!/bin/sh

export DISPLAY=:100
Xvfb :100 -ac -screen 0 1920x1080x24 -fbdir /tmp &
exec google-chrome --remote-debugging-port=6666 --no-sandbox