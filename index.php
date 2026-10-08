<?php
declare(strict_types=1);

/* ---------- Configuration ---------- */
const UPLOAD_DIR = __DIR__ . '/uploads';
const MAX_IMAGE_BYTES = 10 * 1024; // 10 KB
const DATA_FILE = __DIR__ . '/data/jugadores.json';

/* ---------- Helpers ---------- */

// Escape any value before printing it in HTML (prevents XSS / code injection)
function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// Make sure the uploads directory exists and is writable by the web server
function asegurarDirectorioUploads(): bool
{
    if (!is_dir(UPLOAD_DIR)) {
        if (!mkdir(UPLOAD_DIR, 0775, true) && !is_dir(UPLOAD_DIR)) {
            return false;
        }
    }
    if (!is_writable(UPLOAD_DIR)) {
        @chmod(UPLOAD_DIR, 0775);
    }
    return is_writable(UPLOAD_DIR);
}

// Validates the text fields. Returns [cleanData, errors]
function validarCampos(array $post): array
{
    $errores = [];
    $datos = [
        'nombre'         => trim((string)($post['nombre'] ?? '')),
        'alias'          => trim((string)($post['alias'] ?? '')),
        'edad'           => trim((string)($post['edad'] ?? '')),
        'email'          => trim((string)($post['email'] ?? '')),
        'juego_favorito' => trim((string)($post['juego_favorito'] ?? '')),
    ];

    if (!preg_match("/^[\p{L}\p{M}\s'.\-]{2,50}$/u", $datos['nombre'])) {
        $errores[] = 'El nombre debe tener entre 2 y 50 caracteres (letras, espacios, apóstrofos, puntos o guiones).';
    }
    if (!preg_match('/^[\p{L}\p{N}_.\- ]{2,20}$/u', $datos['alias'])) {
        $errores[] = 'El alias debe tener entre 2 y 20 caracteres (letras, números, espacios, _ . -).';
    }
    $edad = filter_var($datos['edad'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 5, 'max_range' => 120]]);
    if ($edad === false) {
        $errores[] = 'La edad debe ser un número entero entre 5 y 120.';
    }
    if (strlen($datos['email']) > 100 || !filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) {
        $errores[] = 'El email no es válido.';
    }
    $lenJuego = mb_strlen($datos['juego_favorito'], 'UTF-8');
    if ($lenJuego < 2 || $lenJuego > 50) {
        $errores[] = 'El juego favorito debe tener entre 2 y 50 caracteres.';
    }

    // Weapons: optional, but only values from the allowed list
    $permitidas = ['Maza', 'Martillo', 'Espada', 'Arco'];
    $armas = $post['armas'] ?? [];
    $armas = is_array($armas) ? array_map('strval', $armas) : [];
    if (array_diff($armas, $permitidas)) {
        $errores[] = 'Alguna de las armas seleccionadas no es válida.';
    }
    $datos['armas'] = array_values(array_intersect($permitidas, $armas));

    // Magic arts: required, "si" or "no"
    $magia = (string)($post['artes_magicas'] ?? '');
    if (!in_array($magia, ['si', 'no'], true)) {
        $errores[] = 'Indica si practica artes mágicas.';
    }
    $datos['artes_magicas'] = $magia;

    return [$datos, $errores];
}

// Processes the optional image.
// Returns ['estado' => 'ninguna'|'ok'|'error', 'ruta' => ?string, 'mensaje' => ?string]
function procesarImagen(array $files): array
{
    $archivo = $files['imagen'] ?? null;

    // No file selected: not an error
    if ($archivo === null || $archivo['error'] === UPLOAD_ERR_NO_FILE) {
        return ['estado' => 'ninguna', 'ruta' => null, 'mensaje' => null];
    }

    $fallo = fn(string $m) => ['estado' => 'error', 'ruta' => null, 'mensaje' => $m];

    if ($archivo['error'] === UPLOAD_ERR_INI_SIZE || $archivo['error'] === UPLOAD_ERR_FORM_SIZE) {
        return $fallo('La imagen supera el tamaño máximo permitido (10 KB).');
    }
    if ($archivo['error'] !== UPLOAD_ERR_OK) {
        return $fallo('Ocurrió un error al subir la imagen.');
    }
    if (!is_uploaded_file($archivo['tmp_name'])) {
        return $fallo('Archivo de imagen no válido.');
    }

    // Size
    if ($archivo['size'] > MAX_IMAGE_BYTES) {
        return $fallo('La imagen supera el tamaño máximo permitido (10 KB).');
    }

    // Extension
    $extension = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
    if ($extension !== 'png') {
        return $fallo('Solo se permiten imágenes con extensión .png.');
    }

    // Real MIME type (detected from content, not from the browser)
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    if ($finfo->file($archivo['tmp_name']) !== 'image/png') {
        return $fallo('El archivo no es una imagen PNG válida.');
    }
    // Extra check: must be parseable as a PNG image
    $info = @getimagesize($archivo['tmp_name']);
    if ($info === false || $info[2] !== IMAGETYPE_PNG) {
        return $fallo('El archivo no es una imagen PNG válida.');
    }

    // Directory
    if (!asegurarDirectorioUploads()) {
        return $fallo('No se pudo guardar la imagen: la carpeta "uploads" no es escribible.');
    }

    // Random name: never trust the user's file name
    $nombreFinal = bin2hex(random_bytes(8)) . '.png';
    if (!move_uploaded_file($archivo['tmp_name'], UPLOAD_DIR . '/' . $nombreFinal)) {
        return $fallo('No se pudo guardar la imagen en el servidor.');
    }

    return ['estado' => 'ok', 'ruta' => 'uploads/' . $nombreFinal, 'mensaje' => null];
}

/* ---------- Persistence (JSON file, no database needed) ---------- */

function guardarJugador(array $datos, ?string $ruta): bool
{
    $dir = dirname(DATA_FILE);
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        return false;
    }
    if (!file_exists($dir . '/.htaccess')) {
        @file_put_contents($dir . '/.htaccess', "Require all denied\n");
    }
    $fp = @fopen(DATA_FILE, 'c+');
    if (!$fp) {
        return false;
    }
    flock($fp, LOCK_EX); // avoid two simultaneous requests overwriting each other
    $lista = json_decode((string)stream_get_contents($fp), true);
    $lista = is_array($lista) ? $lista : [];
    $lista[] = $datos + ['imagen' => $ruta, 'fecha' => date('Y-m-d H:i')];
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($lista, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return true;
}

function leerJugadores(): array
{
    $lista = is_file(DATA_FILE) ? json_decode((string)file_get_contents(DATA_FILE), true) : [];
    return is_array($lista) ? $lista : [];
}

// List of registered players (GET index.php?lista=1)
function mostrarLista(): void
{
    $jugadores = array_reverse(leerJugadores());
    ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Jugadores registrados</title>
    <style>
        body { font-family: system-ui, sans-serif; background: #f2f4f8; margin: 0; padding: 2rem; }
        .card { max-width: 900px; margin: 0 auto; background: #ffff44; padding: 1.5rem 2rem; border-radius: 10px; }
        h1 { margin-top: 0; text-align: center; }
        .scroll { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; background: #fff; }
        th, td { padding: .5rem .75rem; border-bottom: 1px solid #ddd; text-align: left; vertical-align: middle; }
        th { background: #222; color: #fff; }
        img { width: 48px; height: 48px; object-fit: contain; }
        a { color: #1f55b8; }
    </style>
</head>
<body>
<div class="card">
    <h1>Jugadores registrados (<?= count($jugadores) ?>)</h1>
    <?php if (!$jugadores): ?>
        <p>Todavía no hay ningún jugador registrado.</p>
    <?php else: ?>
    <div class="scroll">
    <table>
        <tr><th>Imagen</th><th>Alias</th><th>Nombre</th><th>Edad</th><th>Juego</th><th>Armas</th><th>Magia</th><th>Fecha</th></tr>
        <?php foreach ($jugadores as $j): ?>
        <tr>
            <td><img src="<?= e((string)($j['imagen'] ?? 'calavera.svg') ?: 'calavera.svg') ?>" alt=""></td>
            <td><?= e((string)($j['alias'] ?? '')) ?></td>
            <td><?= e((string)($j['nombre'] ?? '')) ?></td>
            <td><?= e((string)($j['edad'] ?? '')) ?></td>
            <td><?= e((string)($j['juego_favorito'] ?? '')) ?></td>
            <td><?= e(implode(', ', (array)($j['armas'] ?? [])) ?: '—') ?></td>
            <td><?= ($j['artes_magicas'] ?? '') === 'si' ? 'Sí' : 'No' ?></td>
            <td><?= e((string)($j['fecha'] ?? '')) ?></td>
        </tr>
        <?php endforeach; ?>
    </table>
    </div>
    <?php endif; ?>
    <p><a href="index.php">← Registrar un jugador</a></p>
</div>
</body>
</html>
<?php
}

/* ---------- Request handling ---------- */

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['lista'])) {
        mostrarLista();
        exit;
    }
    // Show the form
    readfile(__DIR__ . '/captura.html');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: GET, POST');
    exit('Método no permitido');
}

// ----- POST -----
[$datos, $errores] = validarCampos($_POST);
$imagen = null;
$guardado = true;

if (empty($errores)) {
    $imagen = procesarImagen($_FILES);
    $guardado = guardarJugador($datos, $imagen['ruta']);

    // Post/Redirect/Get: pass the result to resultado.php and redirect,
    // so refreshing the result page does not resubmit the form.
    session_start();
    $_SESSION['resultado'] = ['datos' => $datos, 'imagen' => $imagen, 'guardado' => $guardado];
    header('Location: resultado.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Resultado del registro</title>
    <style>
        body { font-family: system-ui, sans-serif; background: #f2f4f8; margin: 0; padding: 2rem; }
        .card { max-width: 520px; margin: 0 auto; background: #fff; padding: 1.5rem 2rem; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
        h1 { margin-top: 0; font-size: 1.5rem; }
        dl { display: grid; grid-template-columns: max-content 1fr; gap: .5rem 1rem; }
        dt { font-weight: 600; }
        dd { margin: 0; }
        .errores { background: #fdecea; border-left: 4px solid #c0392b; padding: .5rem 1rem; color: #7b241c; }
        .aviso { background: #fff4e5; border-left: 4px solid #e67e22; padding: .5rem 1rem; color: #7d4a0e; margin-bottom: 1rem; }
        .avatar { text-align: center; margin: 1rem 0; }
        .avatar img { max-width: 200px; height: auto; border-radius: 8px; }
        .resultado { background: #ffff44; }
        .resultado h1 { text-align: center; }
        .columnas { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: center; }
        .columnas p { margin: .9rem 0; }
        .imagen-box img { display: block; width: 100%; max-width: 200px; height: auto; border: 1px solid #00f; }
        .error-img { margin-top: .75rem; color: #7b241c; }
        @media (max-width: 480px) { .columnas { grid-template-columns: 1fr; } }
        a { color: #2d6cdf; }
    </style>
</head>
<body>
<div class="card">
<?php if (!empty($errores)): ?>

    <h1>Hay errores en el formulario</h1>
    <div class="errores">
        <ul>
            <?php foreach ($errores as $error): ?>
                <li><?= e($error) ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
    <p><a href="index.php">← Volver al formulario</a></p>

<?php endif; ?>
</div>
</body>
</html>
