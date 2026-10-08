# Registro de jugadores (PHP)

Aplicación PHP sencilla para registrar jugadores con imagen PNG opcional.

## Archivos
| Archivo | Para qué sirve |
|---|---|
| `index.php` | `GET`: muestra el formulario · `POST`: valida, sube la imagen y **redirige a `resultado.php`** · `GET ?lista=1`: listado |
| `resultado.php` | Segunda página: datos del jugador, su imagen o la calavera (con error si la subida falló) |
| `captura.html` | Formulario (validación en cliente + vista previa de la imagen) |
| `calavera.svg` | Imagen que se muestra si no hay imagen o falla la subida |
| `uploads/` | Imágenes PNG subidas (con `.htaccess` que bloquea scripts) |
| `data/` | `jugadores.json` con los registros (protegida con `.htaccess`) |
| `Dockerfile`, `docker-compose.yml` | Ejecución con Docker (opcional) |

## Cómo ejecutarlo
**PHP integrado (lo más rápido, PHP 8+ con `fileinfo`):**
```bash
php -S localhost:8000
```
Abre <http://localhost:8000/>.

**XAMPP / Apache:** copia la carpeta a `htdocs` y abre `http://localhost/registro_jugadores/`.

**Docker:** `docker compose up --build` → <http://localhost:8080/>.

**Permisos (Linux):**
```bash
chmod 775 uploads data
sudo chown -R www-data:www-data uploads data   # usuario del servidor (www-data, apache, nginx…)
```
`index.php` intenta crear `uploads/` y `data/` si no existen.

## Seguridad implementada
- **XSS / inyección de código:** toda salida pasa por `htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')`.
- **Validación doble:** HTML5 + JavaScript en cliente; expresiones regulares, `filter_var` y listas blancas en servidor.
- **Imagen:** opcional; solo PNG y ≤ 10 KB. Servidor: código de error de subida, tamaño, extensión, MIME real (`finfo`) y `getimagesize`.
- **Nombre de archivo aleatorio** (`random_bytes`), nunca el original; `is_uploaded_file` + `move_uploaded_file`.
- **`uploads/` y `data/`** con `.htaccess` (en nginx hay que añadir una regla equivalente).
- **JSON** con `flock` para evitar que dos envíos simultáneos se pisen.

## Comportamiento tras enviar
| Caso | Resultado |
|---|---|
| Campos inválidos | `index.php` muestra la lista de errores y un enlace para volver (no redirige) |
| Campos válidos + PNG válido | Redirige a `resultado.php`: datos + imagen subida |
| Campos válidos + sin imagen | Datos + calavera, **sin error** |
| Campos válidos + imagen rechazada | Datos + calavera + "Error al subir la imagen: motivo" |

## Pruebas manuales sugeridas
1. Enviar con todo correcto y un PNG de menos de 10 KB.
2. Enviar sin imagen (calavera, sin error).
3. Subir un `.jpg`, un PNG de más de 10 KB y un `.php` renombrado a `.png` (los tres deben fallar).
4. Poner `<script>alert(1)</script>` en nombre y alias (se muestra como texto).
5. Saltarse el cliente (DevTools o `curl`) con edad `999` o email inválido (el servidor debe rechazarlo).
6. Marcar armas y artes mágicas y comprobar el listado `index.php?lista=1`.

## Limitaciones
- PHP no se ejecuta en GitHub Pages: hace falta un servidor con PHP.
- Los registros se guardan en un JSON (suficiente para clase); para producción usaría MySQL con PDO y consultas preparadas.
