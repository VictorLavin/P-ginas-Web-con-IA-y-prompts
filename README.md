# KernelLab v5: frontend + Jakarta EE + MySQL

```
frontend/   Páginas (index, linux, windows) con HTML, CSS y JavaScript
backend/    Proyecto Maven (WAR): servlets, filtro CORS y DAO con JDBC
database/   schema.sql con las tablas boot_event y boot_issue
```

## Cómo ponerlo en marcha
1. **MySQL**: `mysql -u root -p < database/schema.sql` (crea la base `kernellab` y el usuario `kernellab`/`kernellab`, solo para desarrollo).
2. **Backend**: en `backend/` ejecuta `mvn clean package`. Genera `target/kernellab.war`, que ya incluye el frontend.
3. **Tomcat 10.1** (Jakarta EE 10): copia el WAR en `webapps/` y arranca Tomcat.
4. Abre **http://localhost:8080/kernellab/** y pulsa «Simular arranque». El resultado y los errores se guardan en MySQL y aparecen en la sección «Registro de arranques».

También puedes abrir `frontend/index.html` directamente en el navegador: las simulaciones funcionan sin servidor y solo se pierde el guardado. Si cambias el puerto o el contexto de Tomcat, edita `frontend/js/config.js`.

## API
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/boots` | Guarda un arranque y sus problemas (JSON) |
| GET | `/api/boots?os=linux&limit=20` | Últimos arranques con sus problemas |
| GET | `/api/stats?os=windows` | Totales, tiempo medio y problemas más frecuentes |

## Notas
- **Tomcat 9 o Java EE 8 (`javax.*`)**: cambia en el código `jakarta.servlet` por `javax.servlet` y en el `pom.xml` usa `javax:javaee-web-api:8.0.1`.
- La contraseña de `db.properties` y el CORS con `*` son solo para desarrollo. También puedes definir `KERNELLAB_DB_URL`, `KERNELLAB_DB_USER` y `KERNELLAB_DB_PASSWORD` como variables de entorno.
- Las consultas usan `PreparedStatement`, así que los datos que llegan del navegador nunca se concatenan en el SQL.
