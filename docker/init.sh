#!/bin/sh

(cd /pilot && nohup npm run start &)
exec /dockerstartup/kasm_default_profile.sh /dockerstartup/vnc_startup.sh /dockerstartup/kasm_startup.sh --wait
