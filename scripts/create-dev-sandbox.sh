# This script sets up a completely new Cloud.gov CF Space with all the corresponding
# infrastructure needed to run weather.gov. It can serve for documentation for running
# NOTE: This script was written for MacOS and to be run at the root directory. 

# this function will generate a random string, or bail if uuidgen is not available.
generate_string()
{
  if [ -z "$1" ] ; then
    if command -v uuidgen >/dev/null ; then
      NEW_STRING=$(uuidgen)
      export NEW_STRING
    else
      echo "cannot find uuidgen utility:  You will need to generate some random strings and put them in the CRON_KEY, HASH_SALT, and ROOT_USER_PASS environment variables, then re-run this script."
      exit 1
    fi
  fi
}

# if [ -z "$NAME" ]; then
#     echo 'Please specify a new application/space to create (i.e. lmm)' >&2
#     exit 1
# fi

# if [ ! $(command -v gh) ] || [ ! $(command -v jq) ] || [ ! $(command -v cf) ]; then
#     echo "jq, cf, and gh packages must be installed. Please install via your preferred manager."
#     exit 1
# fi

# upcase_name=$(printf "%s" "$NAME" | tr '[:lower:]' '[:upper:]')

# read -p "Are you on a new branch? We will have to commit this work. (y/n) " -n 1 -r
# echo
# if [[ ! $REPLY =~ ^[Yy]$ ]]
# then
#     git checkout -b new-dev-sandbox-$NAME
# fi

cf target -o sandbox-gsa
# NAME=$(cf spaces | tail -1)
NAME=claire

read -p "Are you logged in to the sandbox-gsa CF org above? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    cf login -a https://api.fr.cloud.gov --sso
fi

# gh auth status
# read -p "Are you logged into a Github account with access to weathergov/weather.gov? (y/n) " -n 1 -r
# echo
# if [[ ! $REPLY =~ ^[Yy]$ ]]
# then
#     gh auth login
# fi

echo "Creating manifest for $NAME..."
cp scripts/manifest-sandbox-template.yaml manifest-$NAME.yaml
sed -i '' "s/ENVIRONMENT/$NAME/" "manifest-$NAME.yaml"

# echo "Creating new cloud.gov space for $NAME..."
# cf create-space $NAME
# cf target -o "sandbox-gsa" -s $NAME
cf bind-security-group public_networks_egress sandbox-gsa --space $NAME
cf bind-security-group trusted_local_networks_egress sandbox-gsa --space $NAME

echo "Creating new cloud.gov DB for $NAME. This usually takes about 5 minutes..."
cf create-service aws-rds small-mysql database

until cf service database | grep -q 'The service instance status is succeeded'
do
  echo "Database not up yet, waiting..."
  sleep 30
done

echo "Creating new cloud.gov credentials for $NAME..."
generate_string "$CRON_KEY"
CRON_KEY=${CRON_KEY:-$NEW_STRING}
generate_string "$HASH_SALT"
HASH_SALT=${HASH_SALT:-$NEW_STRING}
generate_string "$ROOT_USER_PASS"
ROOT_USER_PASS=${ROOT_USER_PASS:-$NEW_STRING}
ROOT_USER_NAME=${ROOT_USER_NAME:-root}
cf create-user-provided-service secrets -p "{\"CRON_KEY\": \"$CRON_KEY\", \"HASH_SALT\": \"$HASH_SALT\", \"ROOT_USER_NAME\": \"$ROOT_USER_NAME\", \"ROOT_USER_PASS\": \"$ROOT_USER_PASS\"}"

echo "Creating s3 stoarge for $NAME..."
cf create-service s3 basic-sandbox storage


echo "Database and storage create succeeded and credentials created. Deploying the weather.gov application to $NAME..."
cf push weather-$NAME -f manifest-$NAME.yaml

cf create-service-key storage storagekey
S3INFO=$(cf service-key storage storagekey)
S3_BUCKET=$(echo "$S3INFO" | grep '"bucket":' | sed 's/.*"bucket": "\(.*\)",/\1/')
S3_REGION=$(echo "$S3INFO" | grep '"region":' | sed 's/.*"region": "\(.*\)",/\1/')
cf set-env weather-$NAME S3_BUCKET "$S3_BUCKET"
cf set-env weather-$NAME S3_REGION "$S3_REGION"
cf delete-service-key storage storagekey -f
cf restart weather-$NAME

# read -p "Please provide the email of the space developer: " -r
# cf set-space-role $REPLY sandbox-gsa $NAME SpaceDeveloper

# echo "Alright, your app is up and running at https://weather-$NAME.app.cloud.gov!"
# echo
# echo "Moving on to setup Github automation..."

# echo "Adding new environment to Github Actions..."
# sed -i '' '/          - stable/ {a\
#           - '"$NAME"'
# }' .github/workflows/reset-db.yaml

# sed -i '' '/          - stable/ {a\
#           - '"$NAME"'
# }' .github/workflows/migrate.yaml

# sed -i '' '/${{startsWith(github.head_ref, / {a\
#         || startsWith(github.head_ref, '"'$NAME'"')
# }' .github/workflows/deploy-sandbox.yaml

# echo "Creating space deployer for Github deploys..."
# cf create-service cloud-gov-service-account space-deployer github-cd-account
# cf create-service-key github-cd-account github-cd-key
# cf service-key github-cd-account github-cd-key
# read -p "Please confirm we should set the above username and key to Github secrets. (y/n) " -n 1 -r
# echo
# if [[ ! $REPLY =~ ^[Yy]$ ]]
# then
#     exit 1
# fi

# cf service-key github-cd-account github-cd-key | sed 1,2d  | jq -r '[.username, .password]|@tsv' | 
# while read -r username password; do
#     gh secret --repo weathergov/weather set CF_${upcase_name}_USERNAME --body $username
#     gh secret --repo weathergov/weather set CF_${upcase_name}_PASSWORD --body $password
# done

# read -p "All done! Should we open a PR with these changes? (y/n) " -n 1 -r
# echo
# if [[ $REPLY =~ ^[Yy]$ ]]
# then
#     git add manifest-$NAME.yaml .github/workflows/
#     git commit -m "Add new developer sandbox '"$NAME"' infrastructure"
#     gh pr create
# fi
