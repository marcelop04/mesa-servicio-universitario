@echo off
rem SOLO PRUEBAS DEL LANZADOR. No ejecuta Maven ni consulta NVD.
if not defined NVD_API_KEY exit /b 91
if not "%~1"=="-B" exit /b 92
if not "%~2"=="-Pseguridad" exit /b 93
if not "%~3"=="dependency-check:check" exit /b 94
echo MAVEN_SIMULADO_SIN_CONSULTAR_NVD
echo Aviso simulado de Java sin secretos. 1>&2
if not defined MSU_PRUEBA_MAVEN_SALIDA exit /b 95
exit /b %MSU_PRUEBA_MAVEN_SALIDA%
