#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENV_FILE=${1:-"$SCRIPT_DIR/.env.aws"}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

: "${DB_HOST:?DB_HOST is required}"
: "${DB_NAME:?DB_NAME is required}"
: "${DB_USERNAME:?DB_USERNAME is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"
: "${S3_BACKUP_BUCKET:?S3_BACKUP_BUCKET is required}"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_FILE="/tmp/shopsflow-${TIMESTAMP}.sql.gz"

cleanup() {
  rm -f "$BACKUP_FILE"
}
trap cleanup EXIT

docker run --rm \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:16-alpine \
  pg_dump --host "$DB_HOST" --port "${DB_PORT:-5432}" \
    --username "$DB_USERNAME" --dbname "$DB_NAME" --no-owner --no-privileges \
  | gzip > "$BACKUP_FILE"

aws s3 cp "$BACKUP_FILE" "s3://${S3_BACKUP_BUCKET}/database/$(basename "$BACKUP_FILE")" \
  --region "${AWS_REGION:-ap-southeast-1}" \
  --sse AES256

echo "Uploaded backup to s3://${S3_BACKUP_BUCKET}/database/$(basename "$BACKUP_FILE")"
