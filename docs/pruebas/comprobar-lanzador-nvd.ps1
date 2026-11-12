# Pruebas del script de entrada, SIN claves reales y SIN trafico a NVD.
# powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\docs\pruebas\comprobar-lanzador-nvd.ps1
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$temporal = Join-Path $env:LOCALAPPDATA ('Temp\opencode\prueba-lanzador-nvd-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $temporal 'scripts') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $temporal 'backend') | Out-Null
Copy-Item -LiteralPath (Join-Path $raiz 'scripts\analizar-dependencias.ps1') -Destination (Join-Path $temporal 'scripts')
Copy-Item -LiteralPath (Join-Path $raiz 'scripts\activar-herramientas.ps1') -Destination (Join-Path $temporal 'scripts')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'fixtures\maven-nvd.cmd') -Destination (Join-Path $temporal 'backend\mvnw.cmd')
$lanzador = Join-Path $temporal 'scripts\analizar-dependencias.ps1'
$funcionAnterior = Get-Item -LiteralPath 'Function:\Read-Host' -ErrorAction SilentlyContinue
$entradaAnterior = Get-Variable -Name MSU_PRUEBA_NVD_ENTRADA -Scope Global -ErrorAction SilentlyContinue
$entornoAnterior = [Environment]::GetEnvironmentVariable('NVD_API_KEY', 'Process')
$salidaAnterior = [Environment]::GetEnvironmentVariable('MSU_PRUEBA_MAVEN_SALIDA', 'Process')
$ubicacionInicial = (Get-Location).Path
$clavePreviaFicticia = 'clave-anterior-ficticia-exclusiva-del-test'

function Exigir([bool]$condicion, [string]$mensaje) {
    if (-not $condicion) { throw $mensaje }
}

try {
    function global:Read-Host {
        [CmdletBinding()]
        param([string]$Prompt, [switch]$AsSecureString)
        Exigir ([bool]$AsSecureString) 'La entrada no fue solicitada de forma oculta.'
        $secreto = New-Object System.Security.SecureString
        foreach ($caracter in $global:MSU_PRUEBA_NVD_ENTRADA.ToCharArray()) { $secreto.AppendChar($caracter) }
        return $secreto
    }

    $casos = @(
        @{ Nombre = 'Entrada vacia'; Entrada = ''; Maven = 0; Esperado = 1; Invocar = $false },
        @{ Nombre = 'Solo espacios'; Entrada = '   '; Maven = 0; Esperado = 1; Invocar = $false },
        @{ Nombre = 'Comando pegado por error'; Entrada = '$env:NVD_API_KEY = [System.Net.NetworkCredential]::new()'; Maven = 0; Esperado = 1; Invocar = $false },
        @{ Nombre = 'Clave ficticia y Maven correcto'; Entrada = '00000000-0000-0000-0000-000000000001'; Maven = 0; Esperado = 0; Invocar = $true },
        @{ Nombre = 'Clave ficticia y Maven fallido'; Entrada = '00000000-0000-0000-0000-000000000002'; Maven = 7; Esperado = 7; Invocar = $true }
    )
    foreach ($caso in $casos) {
        $global:MSU_PRUEBA_NVD_ENTRADA = $caso.Entrada
        $env:NVD_API_KEY = $clavePreviaFicticia
        $env:MSU_PRUEBA_MAVEN_SALIDA = [string]$caso.Maven
        $captura = (& $lanzador *>&1 | Out-String)
        $resultado = $LASTEXITCODE
        if ($resultado -ne $caso.Esperado) {
            $diagnostico = $captura.Replace($clavePreviaFicticia, '[oculta]')
            if ($caso.Entrada.Length -gt 0) { $diagnostico = $diagnostico.Replace($caso.Entrada, '[oculta]') }
            throw ("Codigo de salida incorrecto ($resultado): " + $caso.Nombre + "`n" + $diagnostico)
        }
        Exigir (($captura -match 'MAVEN_SIMULADO_SIN_CONSULTAR_NVD') -eq $caso.Invocar) ("Invocacion incorrecta: " + $caso.Nombre)
        Exigir ($env:NVD_API_KEY -eq $clavePreviaFicticia) 'No se restauro el entorno anterior.'
        Exigir ((Get-Location).Path -eq $ubicacionInicial) 'No se restauro la ubicacion anterior.'
        Exigir (-not $captura.Contains($clavePreviaFicticia)) 'Se imprimio la clave de entorno ficticia.'
        if ($caso.Entrada.Trim().Length -gt 0) {
            Exigir (-not $captura.Contains($caso.Entrada)) 'Se imprimio la entrada privada ficticia.'
        }
        Write-Output ("OK: " + $caso.Nombre)
    }
    Write-Output '5 pruebas del lanzador aprobadas. Maven fue simulado; no se utilizo ninguna clave real ni se consulto NVD.'
}
finally {
    if ($null -ne $funcionAnterior) {
        Set-Item -Path 'Function:\global:Read-Host' -Value $funcionAnterior.ScriptBlock
    } else {
        Remove-Item -Path 'Function:\Read-Host' -ErrorAction SilentlyContinue
    }
    if ($null -ne $entradaAnterior) {
        Set-Variable -Name MSU_PRUEBA_NVD_ENTRADA -Scope Global -Value $entradaAnterior.Value
    } else {
        Remove-Variable -Name MSU_PRUEBA_NVD_ENTRADA -Scope Global -ErrorAction SilentlyContinue
    }
    [Environment]::SetEnvironmentVariable('NVD_API_KEY', $entornoAnterior, 'Process')
    [Environment]::SetEnvironmentVariable('MSU_PRUEBA_MAVEN_SALIDA', $salidaAnterior, 'Process')
}
