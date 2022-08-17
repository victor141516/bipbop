#!/bin/bash

(cd /pilot && nohup npm run start &)
/dockerstartup/kasm_default_profile.sh /dockerstartup/vnc_startup.sh /dockerstartup/kasm_startup.sh --wait &

# Wait for any process to exit
wait -n  
# Exit with status of process that exited first
exit $?
