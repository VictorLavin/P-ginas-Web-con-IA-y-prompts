package com.kernellab.web;

import com.google.gson.Gson;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

/** Pequeño ayudante para responder JSON desde los servlets. */
final class Json {
    static final Gson GSON = new Gson();

    private Json() {}

    static void write(HttpServletResponse resp, int status, Object body) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        resp.getWriter().write(GSON.toJson(body));
    }

    static void error(HttpServletResponse resp, int status, String message) throws IOException {
        write(resp, status, Map.of("error", message));
    }
}
