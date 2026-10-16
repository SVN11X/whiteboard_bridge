#requires -Version 5.1
<#
.SYNOPSIS
  Lista los formatos actuales del portapapeles de Windows, sin registrar contenidos.
.DESCRIPTION
  El modo predeterminado enumera identificadores y nombres. Opcionalmente se permite
  guardar UNA carga binaria de un formato registrado, con permiso explícito del usuario.
  No hay procesos en segundo plano, telemetría ni conexiones de red.
.EXAMPLE
  .\Inspect-Clipboard.ps1 -ReportPath .\reporte-nota.json
.EXAMPLE
  .\Inspect-Clipboard.ps1 -DumpFormat 'Web Custom Format Map' -DumpPath .\captura-privada.bin
#>
[CmdletBinding()]
param(
    [string]$ReportPath,
    [string]$DumpFormat,
    [string]$DumpPath,
    [ValidateRange(1, 8192)][int]$MaxDumpKiB = 2048
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (($DumpFormat -and -not $DumpPath) -or ($DumpPath -and -not $DumpFormat)) {
    throw 'Para extraer datos, indique juntos -DumpFormat y -DumpPath.'
}
$cs = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class WhiteboardBridgeWin32 {
 [DllImport("user32.dll", SetLastError = true)] public static extern bool OpenClipboard(IntPtr hWndNewOwner);
 [DllImport("user32.dll", SetLastError = true)] public static extern bool CloseClipboard();
 [DllImport("user32.dll", SetLastError = true)] public static extern uint EnumClipboardFormats(uint format);
 [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
 public static extern int GetClipboardFormatName(uint format, StringBuilder name, int maxCount);
 [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr GetClipboardData(uint format);
 [DllImport("user32.dll")] public static extern uint GetClipboardSequenceNumber();
 [DllImport("kernel32.dll", SetLastError = true)] public static extern UIntPtr GlobalSize(IntPtr handle);
 [DllImport("kernel32.dll", SetLastError = true)] public static extern IntPtr GlobalLock(IntPtr handle);
 [DllImport("kernel32.dll", SetLastError = true)] public static extern bool GlobalUnlock(IntPtr handle);
}
'@
if (-not ('WhiteboardBridgeWin32' -as [type])) {
    Add-Type -TypeDefinition $cs -Language CSharp
}
$names = @{
  1='CF_TEXT'; 2='CF_BITMAP'; 3='CF_METAFILEPICT'; 4='CF_SYLK'; 5='CF_DIF';
  6='CF_TIFF'; 7='CF_OEMTEXT'; 8='CF_DIB'; 9='CF_PALETTE'; 10='CF_PENDATA';
  11='CF_RIFF'; 12='CF_WAVE'; 13='CF_UNICODETEXT'; 14='CF_ENHMETAFILE';
  15='CF_HDROP'; 16='CF_LOCALE'; 17='CF_DIBV5'
}
$acquired = $false
for ($attempt = 0; $attempt -lt 10; $attempt++) {
    if ([WhiteboardBridgeWin32]::OpenClipboard([IntPtr]::Zero)) {$acquired=$true;break}
    Start-Sleep -Milliseconds 80
}
if (-not $acquired) {throw 'El portapapeles está ocupado. Intente otra vez.'}
$records = [System.Collections.Generic.List[object]]::new()
$raw = $null
$dumpId = [uint32]0
try {
    $sequence = [WhiteboardBridgeWin32]::GetClipboardSequenceNumber()
    [uint32]$cursor=0
    while($true) {
        $cursor=[WhiteboardBridgeWin32]::EnumClipboardFormats($cursor)
        if ($cursor -eq 0) {break}
        $buffer=[System.Text.StringBuilder]::new(512)
        $length=[WhiteboardBridgeWin32]::GetClipboardFormatName($cursor,$buffer,$buffer.Capacity)
        if($length -gt 0) { $formatName=$buffer.ToString() }
        elseif($names.ContainsKey([int]$cursor)) {$formatName=$names[[int]$cursor]}
        else {$formatName="FORMAT_$cursor"}
        $category=if($cursor -ge 0xC000){'registrado'} else {'estándar o privado'}
        $records.Add([pscustomobject]@{Id=[uint32]$cursor;Name=$formatName;Category=$category})
        if($DumpFormat -and $formatName -ceq $DumpFormat) {$dumpId=$cursor}
        if($records.Count -gt 1000){throw 'Más de 1000 formatos. Se interrumpe el análisis.'}
    }
    if($DumpFormat){
        if($dumpId -eq 0){throw "El formato '$DumpFormat' no está presente."}
        if($dumpId -lt 0xC000){throw 'La extracción experimental se limita a formatos registrados (ID >= 49152).'}
        $handle=[WhiteboardBridgeWin32]::GetClipboardData($dumpId)
        if($handle -eq [IntPtr]::Zero){throw 'GetClipboardData devolvió un identificador nulo; puede ser renderizado diferido u otro medio.'}
        $byteSize=[WhiteboardBridgeWin32]::GlobalSize($handle).ToUInt64()
        if($byteSize -eq 0){throw 'Este formato no expone un bloque HGLOBAL. No puede exportarse mediante esta ruta.'}
        if($byteSize -gt ([uint64]$MaxDumpKiB * 1024)){throw "El bloque supera el límite de $MaxDumpKiB KiB; no se lee."}
        $ptr=[WhiteboardBridgeWin32]::GlobalLock($handle)
        if($ptr -eq [IntPtr]::Zero){throw 'GlobalLock falló; el formato puede no ser HGLOBAL.'}
        try {
            $raw=New-Object byte[] ([int]$byteSize)
            [System.Runtime.InteropServices.Marshal]::Copy($ptr,$raw,0,$raw.Length)
        } finally {
            [void][WhiteboardBridgeWin32]::GlobalUnlock($handle)
        }
    }
} finally {
    [void][WhiteboardBridgeWin32]::CloseClipboard()
}
$report=[pscustomobject]@{
  Tool='Whiteboard Bridge Lab / Windows Clipboard Inspector'
  DateUtc=[DateTimeOffset]::UtcNow.ToString('o')
  WindowsClipboardSequence=$sequence
  Formats=@($records)
  ContentsCaptured=$false
  Note='Enumera formatos visibles por Win32; no demuestra que sean serializaciones editables de Microsoft Whiteboard.'
}
Write-Host "`nFormatos detectados: $($records.Count)  |  Secuencia: $sequence" -ForegroundColor Cyan
$records | Format-Table -AutoSize
if($ReportPath){
    $absPath=$ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($ReportPath)
    $folder=[System.IO.Path]::GetDirectoryName($absPath)
    if(-not [System.IO.Directory]::Exists($folder)){New-Item -ItemType Directory -Path $folder -Force | Out-Null}
    $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $absPath -Encoding UTF8
    Write-Host "Metadatos guardados: $absPath" -ForegroundColor Green
}
if($null -ne $raw){
    $absDump=$ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($DumpPath)
    $folder=[System.IO.Path]::GetDirectoryName($absDump)
    if(-not [System.IO.Directory]::Exists($folder)){New-Item -ItemType Directory -Path $folder -Force | Out-Null}
    [System.IO.File]::WriteAllBytes($absDump,$raw)
    $sha=[System.Security.Cryptography.SHA256]::Create()
    try {$digest=([BitConverter]::ToString($sha.ComputeHash($raw))).Replace('-','').ToLowerInvariant()}
    finally {$sha.Dispose()}
    Write-Warning 'Se guardó una copia BINARIA de datos que podrían ser privados. No la comparta sin inspeccionarla.'
    Write-Host "Archivo: $absDump`nBytes: $($raw.Length)`nSHA256: $digest" -ForegroundColor Yellow
}
