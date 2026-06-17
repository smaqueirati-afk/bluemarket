# ============================================================
# BlueMarket - Renombrar carpeta pescaderia a panel
# Ejecutar desde PowerShell en C:\Users\Sebastian\Bluemarket
# ============================================================

$repo = "C:\Users\Sebastian\Bluemarket"
Set-Location $repo

# Paso 1: Renombrar la carpeta
Write-Host "Renombrando carpeta..." -ForegroundColor Cyan
Rename-Item "$repo\src\app\pescaderia" "$repo\src\app\panel"
Write-Host "OK - carpeta renombrada a /panel" -ForegroundColor Green

# Paso 2: Python reemplaza todas las referencias internas
Write-Host "`nReemplazando referencias en el codigo..." -ForegroundColor Cyan

python3 -c "
import os

repo = r'C:\Users\Sebastian\Bluemarket'

carpetas = [
    os.path.join(repo, 'src', 'app', 'panel'),
    os.path.join(repo, 'src', 'app', 'auth', 'callback'),
    os.path.join(repo, 'src', 'components'),
]

archivos = []
for carpeta in carpetas:
    for root, dirs, files in os.walk(carpeta):
        for f in files:
            if f.endswith('.js') or f.endswith('.ts'):
                archivos.append(os.path.join(root, f))

archivos += [
    os.path.join(repo, 'next.config.ts'),
    os.path.join(repo, 'src', 'app', '(developer)', 'dashboard', 'actions.js'),
    os.path.join(repo, 'src', 'app', '(developer)', 'dashboard', 'PanelDeveloper.js'),
]

reemplazos = [
    ('/pescaderia/productos', '/panel/productos'),
    ('/pescaderia/clientes', '/panel/clientes'),
    ('/pescaderia/fidelizacion', '/panel/fidelizacion'),
    ('/pescaderia/proveedores', '/panel/proveedores'),
    (\"destination: '/pescaderia'\", \"destination: '/panel'\"),
    (\"destino = '/pescaderia'\", \"destino = '/panel'\"),
    ('redirect(\`\${origin}/pescaderia\`)', 'redirect(\`\${origin}/panel\`)'),
    ('href=\"/pescaderia\"', 'href=\"/panel\"'),
    (\"href='/pescaderia'\", \"href='/panel'\"),
    (\"revalidatePath('/pescaderia')\", \"revalidatePath('/panel')\"),
    (\"revalidatePath('/pescaderia/productos')\", \"revalidatePath('/panel/productos')\"),
    (\"revalidatePath('/pescaderia/clientes')\", \"revalidatePath('/panel/clientes')\"),
    (\"revalidatePath('/pescaderia/fidelizacion')\", \"revalidatePath('/panel/fidelizacion')\"),
    (\"revalidatePath('/pescaderia/proveedores')\", \"revalidatePath('/panel/proveedores')\"),
]

for ruta in archivos:
    if not os.path.exists(ruta):
        continue
    with open(ruta, 'r', encoding='utf-8') as f:
        contenido = f.read()
    nuevo = contenido
    for viejo, nuevo_txt in reemplazos:
        nuevo = nuevo.replace(viejo, nuevo_txt)
    if nuevo != contenido:
        with open(ruta, 'w', encoding='utf-8') as f:
            f.write(nuevo)
        print('  Actualizado: ' + os.path.basename(ruta))

print('Reemplazos OK')
"

# Paso 3: Git
Write-Host "`nHaciendo commit..." -ForegroundColor Cyan
git add -A
git commit -m "feat: renombrar pescaderia a panel - URL generica para cualquier rubro"
git push

Write-Host "`nListo! URL ahora es /panel en lugar de /pescaderia" -ForegroundColor Green
