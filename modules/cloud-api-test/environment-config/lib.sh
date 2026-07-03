# Shared helpers for provision-{aws,azure,gcp}.sh (source, do not execute).

# Read export VAR=value from an env file (handles simple quoted values).
read_env_export() {
  local file="$1" var="$2"
  local line raw
  [[ -f "$file" ]] || return 1
  line="$(grep -E "^export ${var}=" "$file" 2>/dev/null | head -1)" || return 1
  raw="${line#export ${var}=}"
  raw="${raw%\"}"
  raw="${raw#\"}"
  raw="${raw%\'}"
  raw="${raw#\'}"
  printf '%s' "$raw"
}
