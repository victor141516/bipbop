#!/bin/bash

(cd /pilot && nohup npm run start &)
(cd /dockerstartup && nohup /dockerstartup/kasm_default_profile.sh /dockerstartup/vnc_startup.sh /dockerstartup/kasm_startup.sh --wait &)
(cd /pilot && tail -f nohup.out &)

# Wait for any process to exit
wait -n  
# Exit with status of process that exited first
exit $?
