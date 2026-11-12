# Ejecutar como archivo, no con punto inicial. Nunca recibe la clave como argumento.
# powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\analizar-dependencias.ps1
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $raiz 'backend'
$wrapper = Join-Path $backend 'mvnw.cmd'
$claveAnterior = [Environment]::GetEnvironmentVariable('NVD_API_KEY', 'Process')
$claveOculta = $null
$claveTexto = $null
$ubicacionCambiada = $false
$codigo = 1
$inicio = Get-Date

try {
    . (Join-Path $PSScriptRoot 'activar-herramientas.ps1')
    if (-not (Test-Path -LiteralPath $wrapper)) {
        throw 'No se encuentra backend\mvnw.cmd junto al proyecto.'
    }

    Write-Host ''
    Write-Host 'No escriba comandos en la siguiente pregunta. Pegue SOLO la clave recibida de NVD.'
    Write-Host 'No modifique el texto de la pregunta ni comparta la clave por chat.'
    $claveOculta = Read-Host -Prompt 'CLAVE NVD (pegue solo su clave y pulse Enter)' -AsSecureString
    $claveTexto = [System.Net.NetworkCredential]::new('', $claveOculta).Password.Trim()

    # Evita el error frecuente de pegar instrucciones de PowerShell como si fueran la clave.
    # La validez real la comprueba NVD; no se fuerza un formato UUID especifico.
    if ($claveTexto.Length -lt 20 -or $claveTexto -match '\s|://|[$;{}\[\]]') {
        throw 'La entrada esta vacia, es demasiado corta o parece un comando/enlace. Ejecute nuevamente y pegue solo la clave NVD cuando se le solicite.'
    }

    [Environment]::SetEnvironmentVariable('NVD_API_KEY', $claveTexto, 'Process')
    $claveTexto = $null
    Write-Host ''
    Write-Host 'Clave recibida sin mostrarla. Iniciando Dependency-Check...'
    Write-Host 'La primera descarga puede tardar varios minutos. No ejecute otro analisis en paralelo.'
    Push-Location -LiteralPath $backend
    $ubicacionCambiada = $true
    # Maven/Java pueden escribir avisos en stderr aun cuando finalizan correctamente.
    # La decision se basa en el codigo de salida, no en la mera presencia de stderr.
    $preferenciaAnterior = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $wrapper -B -Pseguridad dependency-check:check
        $codigo = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $preferenciaAnterior
    }

    if ($codigo -eq 0) {
        Write-Host 'Analisis finalizado correctamente. Revise tambien el contenido del reporte.'
    } else {
        Write-Host 'El analisis devolvio un fallo. Revise si son vulnerabilidades o un error de consulta; no cuenta como aprobado.'
    }
    foreach ($nombre in @('dependency-check-report.html', 'dependency-check-report.json')) {
        $ruta = Join-Path $backend "target\$nombre"
        if (Test-Path -LiteralPath $ruta) {
            $informe = Get-Item -LiteralPath $ruta
            if ($informe.LastWriteTime -ge $inicio) {
                Write-Host "Informe generado: $ruta"
            }
        }
    }
}
catch {
    # No imprimir la entrada, variables de entorno ni el objeto completo de la excepcion.
    Write-Host ("ERROR: " + $_.Exception.Message)
    $codigo = 1
}
finally {
    if ($ubicacionCambiada) { Pop-Location }
    [Environment]::SetEnvironmentVariable('NVD_API_KEY', $claveAnterior, 'Process')
    $claveTexto = $null
    $claveAnterior = $null
    if ($null -ne $claveOculta) { $claveOculta.Dispose() }
}

exit $codigo
