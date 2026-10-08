package com.kernellab.db;

import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

/** Abre conexiones JDBC con los datos de db.properties (o de variables de entorno). */
public final class Db {
    private static final Properties P = new Properties();

    static {
        try (InputStream in = Db.class.getResourceAsStream("/db.properties")) {
            if (in != null) P.load(in);
            Class.forName(P.getProperty("driver", "com.mysql.cj.jdbc.Driver"));
        } catch (IOException | ClassNotFoundException e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    private Db() {}

    private static String cfg(String key) {
        String env = System.getenv("KERNELLAB_DB_" + key.toUpperCase());
        return env != null ? env : P.getProperty(key);
    }

    public static Connection open() throws SQLException {
        return DriverManager.getConnection(cfg("url"), cfg("user"), cfg("password"));
    }
}
