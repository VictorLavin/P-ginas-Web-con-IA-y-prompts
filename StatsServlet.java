package com.kernellab.web;

import com.kernellab.dao.BootDao;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

/** GET /api/stats?os=linux devuelve totales, tiempo medio y los problemas más frecuentes. */
@WebServlet("/api/stats")
public class StatsServlet extends HttpServlet {
    private static final Logger LOG = Logger.getLogger(StatsServlet.class.getName());
    private final BootDao dao = new BootDao();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String os = req.getParameter("os");
        if (os != null && !Set.of("linux", "windows").contains(os)) {
            Json.error(resp, 400, "os debe ser linux o windows");
            return;
        }
        try {
            Json.write(resp, 200, dao.stats(os));
        } catch (SQLException e) {
            LOG.log(Level.SEVERE, "No se pudieron calcular las estadísticas", e);
            Json.error(resp, 500, "No se pudo leer la base de datos");
        }
    }
}
