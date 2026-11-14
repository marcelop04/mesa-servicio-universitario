# Ejecutar con punto inicial: . .\scripts\activar-herramientas.ps1
# Solo modifica JAVA_HOME y PATH de esta ventana; no instala ni cambia Windows.
[CmdletBinding()]
param([string]$Directorio = (Join-Path $env:LOCALAPPDATA 'Temp\opencode\msu-herramientas'))

$ErrorActionPreference = 'Stop'
if (Test-Path -LiteralPath $Directorio) {
    $java = Get-ChildItem -LiteralPath $Directorio -Directory -Filter 'jdk-*' |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $node = Get-ChildItem -LiteralPath $Directorio -Directory -Filter 'node-*-win-x64' |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($java) {
        $env:JAVA_HOME = $java.FullName
        $env:PATH = "$($java.FullName)\bin;$env:PATH"
    }
    if ($node) { $env:PATH = "$($node.FullName);$env:PATH" }
}
if (-not (Get-Command java -ErrorAction SilentlyContinue) -or
    -not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Se requieren Java 17+ y Node 22.12+. Consulte docs/seguridad/GUIA_MARCELO.md.'
}
Write-Output 'Java y Node disponibles en esta ventana. En Windows use npm.cmd y backend\mvnw.cmd.'
