#!/usr/bin/env bash
set -euo pipefail

version=2026.11.23
sha256=e8665ed64d6b9172773e812f891fb707a0cb1ee8d9ef4fc1acb00cabee4c5256

if [[ $# -ne 1 || $1 != /* || ! -d $1 ]]; then
  printf 'Uso: %s /ruta/absoluta/al/directorio/bin\n' "$0" >&2
  exit 2
fi

bin_dir=$1
target="$bin_dir/yt-dlp"

if [[ -x $target ]] && printf '%s  %s\n' "$sha256" "$target" | sha256sum --check --status; then
  "$target" --version
  exit 0
fi

candidate=$(mktemp "$bin_dir/.yt-dlp.XXXXXXXX")
trap 'rm -f -- "$candidate"' EXIT
curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --max-time 90 \
  "https://github.com/yt-dlp/yt-dlp/releases/download/$version/yt-dlp" --output "$candidate"
printf '%s  %s\n' "$sha256" "$candidate" | sha256sum --check --status
chmod 755 "$candidate"
[[ $("$candidate" --version) == "$version" ]]

if [[ -f $target ]]; then
  backup=$(mktemp "$bin_dir/yt-dlp.previous.XXXXXXXX")
  cp -p -- "$target" "$backup"
  printf 'Copia anterior: %s\n' "$backup"
fi

mv -f -- "$candidate" "$target"
"$target" --version
