$ErrorActionPreference = 'Stop'

Push-Location (Join-Path $PSScriptRoot 'blockchain')
try {
  npm run deploy:local
}
finally {
  Pop-Location
}