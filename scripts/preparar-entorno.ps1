# Genera secretos LOCALES para una base NUEVA. No instala nada ni sobrescribe archivos.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$destino = Join-Path $raiz '.env'
if (Test-Path -LiteralPath $destino) {
    throw 'Ya existe .env. Se conserva sin cambios. Edite el archivo manualmente para ajustar una variable.'
}

function Nuevo-Secreto {
    $bytes = New-Object byte[] 32
    $generador = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generador.GetBytes($bytes) } finally { $generador.Dispose() }
    return [Convert]::ToBase64String($bytes)
}

$plantilla = [IO.File]::ReadAllText((Join-Path $raiz '.env.example'))
foreach ($nombre in @('DB_PASSWORD', 'MYSQL_ROOT_PASSWORD', 'JWT_SECRET', 'DEMO_PASSWORD')) {
    $plantilla = [regex]::Replace($plantilla, "(?m)^$nombre=\s*$", "$nombre=$(Nuevo-Secreto)")
}
# CreateNew también impide sobrescribirlo si otro proceso lo creó durante la generación.
$archivo = [IO.File]::Open($destino, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
try {
    $contenido = (New-Object System.Text.UTF8Encoding($false)).GetBytes($plantilla)
    $archivo.Write($contenido, 0, $contenido.Length)
} finally { $archivo.Dispose() }
Write-Output 'Archivo .env creado con secretos aleatorios. No lo suba a GitHub ni lo incluya en capturas.'
Write-Output 'La clave de las cuentas demo se encuentra en DEMO_PASSWORD dentro de .env.'
Write-Output 'Con una base existente, configure sus credenciales anteriores; no borre los datos.'
