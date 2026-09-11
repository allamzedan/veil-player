# Optional dev placeholder only. Run manually via `npm run icon` — not part of `npm run dist`.
# Packaged Windows icon: place your file at build/icon.ico
# In-app UI logo: src/assets/veil-logo.png
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'build'
$outPath = Join-Path $outDir 'icon.png'

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Add-Type -AssemblyName System.Drawing
$size = 256
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(255, 13, 15, 20))
$accent = [System.Drawing.Color]::FromArgb(255, 91, 140, 255)
$brush = New-Object System.Drawing.SolidBrush $accent
$pen = New-Object System.Drawing.Pen $accent, 8
$g.FillEllipse($brush, 48, 48, 160, 160)
$font = New-Object System.Drawing.Font(
  'Segoe UI',
  96,
  [System.Drawing.FontStyle]::Bold,
  [System.Drawing.GraphicsUnit]::Pixel
)
$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
$g.DrawString('V', $font, $white, $rect, $format)
$g.Dispose()
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Wrote $outPath"
