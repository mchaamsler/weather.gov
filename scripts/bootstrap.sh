#!/bin/bash

if [ -z "${VCAP_SERVICES:-}" ]; then
    echo "VCAP_SERVICES must a be set in the environment: aborting bootstrap";
    exit 1;
fi

# Create files for SAML auth
export home="/home/vcap"
export app_path="${home}/app"
echo $VCAP_SERVICES | jq -r '."user-provided"[].credentials.SP_PUBLIC_KEY' | base64 -d > ${app_path}/sp_public_key.pem
echo $VCAP_SERVICES | jq -r '."user-provided"[].credentials.SP_PRIVATE_KEY' | base64 -d > ${app_path}/sp_private_key.pem
echo $VCAP_SERVICES | jq -r '."user-provided"[].credentials.IDP_PUBLIC_KEY' | base64 -d > ${app_path}/idp_public_key.crt

chmod 600 ${app_path}/sp_public_key.pem
chmod 600 ${app_path}/sp_private_key.pem
chmod 600 ${app_path}/idp_public_key.crt

## NewRelic configuration
NEWRELIC_LICENSE=echo $VCAP_SERVICES | jq -r '."user-provided"[].credentials.NEWRELIC_KEY'
export apt_path="${home}/deps/0/apt"
export newrelic_apt="${apt_path}/usr/lib/newrelic-php5"
export newrelic_app="${app_path}/newrelic/"
ln -s ${newrelic_apt}/agent ${newrelic_app}/agent
rm -f ${newrelic_app}/daemon/newrelic-daemon.x64
ln -s ${apt_path}/usr/bin/newrelic-daemon ${newrelic_app}/daemon/newrelic-daemon.x64
rm -f ${app_path}/newrelic/scripts/newrelic-iutil.x64
ln -s ${newrelic_apt}/scripts/newrelic-iutil.x64 ${newrelic_app}/scripts/newrelic-iutil.x64
