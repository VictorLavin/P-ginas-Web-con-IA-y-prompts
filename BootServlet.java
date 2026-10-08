package com.kernellab.web;

import com.google.gson.JsonParseException;
import com.kernellab.dao.BootDao;
import com.kernellab.model.BootRecord;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

/** POST /api/boots guarda un arranque. GET /api/boots?os=linux&limit=20 lista los últimos. */
@WebServlet("/api/boots")
public class BootServlet extends HttpServlet {
    private static final Logger LOG = Logger.getLogger(BootServlet.class.getName());
    private static final Set<String> OS = Set.of("linux", "windows");
    private static final Set<String> RESULT = Set.of("ok", "warning", "failed");
    private static final Set<String> SEVERITY = Set.of("error", "warning", "info");
    private final BootDao dao = new BootDao();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        req.setCharacterEncoding("UTF-8");
        if (req.getContentLength() > 65536) {
            Json.error(resp, 413, "Cuerpo demasiado grande");
            return;
        }
        BootRecord b;
        try {
            b = Json.GSON.fromJson(req.getReader(), BootRecord.class);
        } catch (JsonParseException e) {
            Json.error(resp, 400, "JSON no válido");
            return;
        }
        String problem = validate(b);
        if (problem != null) {
            Json.error(resp, 400, problem);
            return;
        }
        try {
            Json.write(resp, 201, Map.of("id", dao.insert(b)));
        } catch (SQLException e) {
            LOG.log(Level.SEVERE, "No se pudo guardar el arranque", e);
            Json.error(resp, 500, "No se pudo guardar en la base de datos");
        }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String os = req.getParameter("os");
        if (os != null && !OS.contains(os)) {
            Json.error(resp, 400, "os debe ser linux o windows");
            return;
        }
        int limit = 20;
        try {
            if (req.getParameter("limit") != null) limit = Math.max(1, Math.min(100, Integer.parseInt(req.getParameter("limit"))));
        } catch (NumberFormatException e) {
            Json.error(resp, 400, "limit debe ser un número");
            return;
        }
        try {
            Json.write(resp, 200, dao.latest(os, limit));
        } catch (SQLException e) {
            LOG.log(Level.SEVERE, "No se pudo leer el historial", e);
            Json.error(resp, 500, "No se pudo leer la base de datos");
        }
    }

    private static String validate(BootRecord b) {
        if (b == null) return "Cuerpo vacío";
        if (!OS.contains(b.os())) return "os debe ser linux o windows";
        if (!RESULT.contains(b.result())) return "result debe ser ok, warning o failed";
        if (b.message() == null || b.message().isBlank()) return "Falta el mensaje";
        if (b.bootSeconds() < 0 || b.bootSeconds() > 999) return "bootSeconds fuera de rango";
        if (b.security() < 0 || b.security() > 100 || b.performance() < 0 || b.performance() > 100) return "security y performance deben estar entre 0 y 100";
        if (b.sizeMb() < 0 || b.sizeMb() > 9999 || b.ramMb() < 0 || b.ramMb() > 65535) return "sizeMb o ramMb fuera de rango";
        if (b.config() != null && b.config().size() > 100) return "Demasiadas opciones en config";
        if (b.issues() != null) {
            if (b.issues().size() > 50) return "Demasiados problemas";
            for (BootRecord.Issue i : b.issues()) {
                if (i == null || !SEVERITY.contains(i.severity()) || i.message() == null) return "Problema no válido";
            }
        }
        return null;
    }
}
