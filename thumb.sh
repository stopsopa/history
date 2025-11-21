set -e
set -x

find img/ -type d -empty -delete
  # remove empty directories

rm -rf thumb/
node --env-file=.env scripts/regenerate_thumbnails.js