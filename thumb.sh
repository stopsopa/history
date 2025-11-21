set -e
set -x
rm -rf thumb/
node --env-file=.env scripts/regenerate_thumbnails.js