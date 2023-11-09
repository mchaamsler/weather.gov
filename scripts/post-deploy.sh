#! /bin/bash

echo  "Updating drupal ... "
drush state:set system.maintenance_mode 1 -y
drush deploy
for file in web/scs-export/*; do
    filename=${file#*/};
    drush content:import $filename;
done
drush content:import scs-exports/*.zip
drush state:set system.maintenance_mode 0 -y
echo "Bootstrap finished"