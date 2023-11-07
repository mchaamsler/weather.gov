#! /bin/bash

echo  "Updating drupal ... "
drush state:set system.maintenance_mode 1 -y
drush deploy
# drush content:import scs-exports/*.zip
drush state:set system.maintenance_mode 0 -y
echo "Bootstrap finished"