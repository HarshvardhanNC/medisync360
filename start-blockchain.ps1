$ErrorActionPreference = 'Stop'

Push-Location (Join-Path $PSScriptRoot 'blockchain')
try {
  npm run node
}
finally {
  Pop-Location
}