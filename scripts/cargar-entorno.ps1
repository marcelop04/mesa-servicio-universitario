# Ejecutar con punto inicial para exportar .env a la ventana actual de PowerShell.
# No interpreta comandos ni imprime secretos. Admite el formato simple de .env.example.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ruta = Join-Path (Split-Path -Parent $PSScriptRoot) '.env'
if (-not (Test-Path -LiteralPath $ruta)) { throw 'Falta .env. Consulte scripts/preparar-entorno.ps1.' }
foreach ($linea in [IO.File]::ReadAllLines($ruta)) {
    if ($linea -match '^\s*(#|$)') { continue }
    if ($linea -notmatch '^([A-Z][A-Z0-9_]*)=(.*)$') { throw 'Formato de .env no admitido: use CLAVE=valor.' }
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
}
Write-Output 'Variables de .env cargadas solo en esta ventana.'
