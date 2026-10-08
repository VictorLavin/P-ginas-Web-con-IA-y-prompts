package com.kernellab.model;

import java.util.List;
import java.util.Map;

/** Un arranque simulado y sus problemas. Gson lo convierte a JSON y viceversa. */
public record BootRecord(
        Long id, String createdAt, String os, String distro, String preset, String result,
        double bootSeconds, int security, int performance, double sizeMb, int ramMb,
        String message, Map<String, String> config, List<Issue> issues) {

    /** severity: error, warning o info. */
    public record Issue(String severity, String message) {}
}
