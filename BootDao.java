package com.kernellab.dao;

import com.google.gson.Gson;
import com.kernellab.db.Db;
import com.kernellab.model.BootRecord;
import com.kernellab.model.BootRecord.Issue;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Acceso a MySQL con JDBC y consultas preparadas (sin concatenar datos del usuario en el SQL). */
public class BootDao {
    private static final Gson GSON = new Gson();

    private static String cut(String s, int max) {
        return s == null ? null : (s.length() <= max ? s : s.substring(0, max));
    }

    /** Guarda el arranque y sus problemas en una sola transacción. Devuelve el id generado. */
    public long insert(BootRecord b) throws SQLException {
        String sqlBoot = "INSERT INTO boot_event (os, distro, preset, result, boot_seconds, security, performance, size_mb, ram_mb, message, config) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
        String sqlIssue = "INSERT INTO boot_issue (boot_id, severity, message) VALUES (?,?,?)";
        try (Connection c = Db.open()) {
            c.setAutoCommit(false);
            try (PreparedStatement ps = c.prepareStatement(sqlBoot, Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, b.os());
                ps.setString(2, cut(b.distro(), 40));
                ps.setString(3, cut(b.preset(), 40));
                ps.setString(4, b.result());
                ps.setDouble(5, b.bootSeconds());
                ps.setInt(6, b.security());
                ps.setInt(7, b.performance());
                ps.setDouble(8, b.sizeMb());
                ps.setInt(9, b.ramMb());
                ps.setString(10, cut(b.message(), 255));
                ps.setString(11, GSON.toJson(b.config() == null ? Map.of() : b.config()));
                ps.executeUpdate();
                long id;
                try (ResultSet keys = ps.getGeneratedKeys()) {
                    keys.next();
                    id = keys.getLong(1);
                }
                if (b.issues() != null && !b.issues().isEmpty()) {
                    try (PreparedStatement pi = c.prepareStatement(sqlIssue)) {
                        for (Issue i : b.issues()) {
                            pi.setLong(1, id);
                            pi.setString(2, i.severity());
                            pi.setString(3, cut(i.message(), 255));
                            pi.addBatch();
                        }
                        pi.executeBatch();
                    }
                }
                c.commit();
                return id;
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }

    /** Últimos arranques (os puede ser null para ambos sistemas), con sus problemas. */
    public List<BootRecord> latest(String os, int limit) throws SQLException {
        String sql = "SELECT id, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created, os, distro, preset, result, boot_seconds, security, performance, size_mb, ram_mb, message FROM boot_event"
                + (os == null ? "" : " WHERE os = ?") + " ORDER BY id DESC LIMIT ?";
        List<BootRecord> rows = new ArrayList<>();
        Map<Long, List<Issue>> issues = new LinkedHashMap<>();
        try (Connection c = Db.open(); PreparedStatement ps = c.prepareStatement(sql)) {
            int n = 1;
            if (os != null) ps.setString(n++, os);
            ps.setInt(n, limit);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    long id = rs.getLong("id");
                    List<Issue> list = new ArrayList<>();
                    issues.put(id, list);
                    rows.add(new BootRecord(id, rs.getString("created"), rs.getString("os"), rs.getString("distro"),
                            rs.getString("preset"), rs.getString("result"), rs.getDouble("boot_seconds"),
                            rs.getInt("security"), rs.getInt("performance"), rs.getDouble("size_mb"),
                            rs.getInt("ram_mb"), rs.getString("message"), null, list));
                }
            }
            if (!rows.isEmpty()) {
                String marks = String.join(",", java.util.Collections.nCopies(rows.size(), "?"));
                try (PreparedStatement pi = c.prepareStatement("SELECT boot_id, severity, message FROM boot_issue WHERE boot_id IN (" + marks + ") ORDER BY id")) {
                    int k = 1;
                    for (Long id : issues.keySet()) pi.setLong(k++, id);
                    try (ResultSet rs = pi.executeQuery()) {
                        while (rs.next()) issues.get(rs.getLong(1)).add(new Issue(rs.getString(2), rs.getString(3)));
                    }
                }
            }
        }
        return rows;
    }

    /** Totales por resultado, tiempo medio y los problemas más repetidos. */
    public Map<String, Object> stats(String os) throws SQLException {
        String where = os == null ? "" : " WHERE os = ?";
        Map<String, Object> out = new LinkedHashMap<>();
        try (Connection c = Db.open()) {
            try (PreparedStatement ps = c.prepareStatement("SELECT COUNT(*) AS total, COALESCE(SUM(result = 'ok'), 0) AS ok, COALESCE(SUM(result = 'warning'), 0) AS warning, COALESCE(SUM(result = 'failed'), 0) AS failed, COALESCE(ROUND(AVG(boot_seconds), 2), 0) AS avg_s FROM boot_event" + where)) {
                if (os != null) ps.setString(1, os);
                try (ResultSet rs = ps.executeQuery()) {
                    rs.next();
                    out.put("total", rs.getLong("total"));
                    out.put("ok", rs.getLong("ok"));
                    out.put("warning", rs.getLong("warning"));
                    out.put("failed", rs.getLong("failed"));
                    out.put("avgSeconds", rs.getDouble("avg_s"));
                }
            }
            List<Map<String, Object>> top = new ArrayList<>();
            String sql = "SELECT i.severity, i.message, COUNT(*) AS n FROM boot_issue i JOIN boot_event b ON b.id = i.boot_id WHERE i.severity <> 'info'"
                    + (os == null ? "" : " AND b.os = ?") + " GROUP BY i.severity, i.message ORDER BY n DESC, i.message LIMIT 5";
            try (PreparedStatement ps = c.prepareStatement(sql)) {
                if (os != null) ps.setString(1, os);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("severity", rs.getString("severity"));
                        m.put("message", rs.getString("message"));
                        m.put("count", rs.getLong("n"));
                        top.add(m);
                    }
                }
            }
            out.put("topIssues", top);
        }
        return out;
    }
}
