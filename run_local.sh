#!bin/bash

ENV_FILE_SIGNAL1="./.env-signal1"
ENV_FILE_SIGNAL2="./.env-signal2"

architecture=$(uname -m)
echo "running djack local infrastructure script for $architecture"



# Check if the .env file exists
if [ -f "$ENV_FILE_SIGNAL1" ]; then
    # Export the variables
    set -a # automatically export all variables
    source "$ENV_FILE_SIGNAL1"
    set +a # stop automatically exporting
    echo $announce
    node ./packages/signal/build/index.js &

   
else
    echo ".env file not found"
fi
