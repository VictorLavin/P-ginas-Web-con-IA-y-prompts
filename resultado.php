<?php
declare(strict_types=1);

// Result page: shown after index.php processes the form (POST -> redirect -> GET)
session_start();

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$r = $_SESSION['resultado'] ?? null;
if (!is_array($r)) {            // opened directly, without registering anyone
    header('Location: index.php');
    exit;
}
$datos    = $r['datos'];
$imagen   = $r['imagen'];       // ['estado' => 'ok'|'ninguna'|'error', 'ruta' => ?, 'mensaje' => ?]
$guardado = $r['guardado'];
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Datos del Jugador</title>
    <style>
        body { font-family: system-ui, sans-serif; background: #f2f4f8; margin: 0; padding: 2rem; }
        .card { max-width: 520px; margin: 0 auto; background: #ffff44; padding: 1.5rem 2rem; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
        h1 { margin-top: 0; font-size: 1.5rem; text-align: center; }
        .columnas { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: center; }
        .columnas p { margin: .9rem 0; }
        .imagen-box img { display: block; width: 100%; max-width: 200px; height: auto; border: 1px solid #00f; background: #fff; }
        .error-img { margin-top: .75rem; color: #7b241c; }
        a { color: #1f55b8; }
        @media (max-width: 480px) { .columnas { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
<div class="card">
    <h1>Datos del Jugador</h1>

    <?php if (!$guardado): ?>
        <p class="error-img">No se pudo guardar el registro en el listado (comprueba los permisos de la carpeta data/).</p>
    <?php endif; ?>

    <div class="columnas">
        <div class="datos">
            <p><strong>Nombre:</strong> <?= e($datos['nombre']) ?></p>
            <p><strong>Alias:</strong> <?= e($datos['alias']) ?></p>
            <p><strong>Edad:</strong> <?= e((string)$datos['edad']) ?></p>
            <p><strong>Email:</strong> <?= e($datos['email']) ?></p>
            <p><strong>Juego favorito:</strong> <?= e($datos['juego_favorito']) ?></p>
            <p><strong>Armas seleccionadas:</strong>
                <?= $datos['armas'] ? e(implode(', ', $datos['armas'])) : 'Ninguna' ?></p>
            <p><strong>¿Practica artes mágicas?:</strong>
                <?= $datos['artes_magicas'] === 'si' ? 'Sí' : 'No' ?></p>
        </div>

        <div class="imagen-box">
            <?php if ($imagen['estado'] === 'ok'): ?>
                <p><strong>Imagen subida:</strong></p>
                <img src="<?= e($imagen['ruta']) ?>" alt="Imagen del jugador <?= e($datos['alias']) ?>">
            <?php else: ?>
                <!-- No image, or the upload failed: skull -->
                <p><strong>No se subió ninguna imagen.</strong></p>
                <img src="calavera.svg" alt="Calavera">
                <?php if ($imagen['estado'] === 'error'): ?>
                    <p class="error-img">Error al subir la imagen: <?= e((string)$imagen['mensaje']) ?></p>
                <?php endif; ?>
            <?php endif; ?>
        </div>
    </div>

    <p><a href="index.php">Registrar otro jugador</a> · <a href="index.php?lista=1">Ver jugadores registrados</a></p>
</div>
</body>
</html>
