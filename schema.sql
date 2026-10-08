-- KernelLab: base de datos para guardar arranques y errores
CREATE DATABASE IF NOT EXISTS kernellab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kernellab;

CREATE TABLE IF NOT EXISTS boot_event (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  os           ENUM('linux','windows') NOT NULL,
  distro       VARCHAR(40) NULL,
  preset       VARCHAR(40) NULL,
  result       ENUM('ok','warning','failed') NOT NULL,
  boot_seconds DECIMAL(5,2) NOT NULL,
  security     TINYINT UNSIGNED NOT NULL,
  performance  TINYINT UNSIGNED NOT NULL,
  size_mb      DECIMAL(6,1) NOT NULL,
  ram_mb       SMALLINT UNSIGNED NOT NULL,
  message      VARCHAR(255) NOT NULL,
  config       JSON NOT NULL,
  INDEX idx_os_created (os, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS boot_issue (
  id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  boot_id  BIGINT NOT NULL,
  severity ENUM('error','warning','info') NOT NULL,
  message  VARCHAR(255) NOT NULL,
  CONSTRAINT fk_issue_boot FOREIGN KEY (boot_id) REFERENCES boot_event(id) ON DELETE CASCADE,
  INDEX idx_severity (severity)
) ENGINE=InnoDB;

-- Usuario de desarrollo (cambia la contraseña si lo usas fuera de tu equipo)
CREATE USER IF NOT EXISTS 'kernellab'@'localhost' IDENTIFIED BY 'kernellab';
GRANT SELECT, INSERT ON kernellab.* TO 'kernellab'@'localhost';
FLUSH PRIVILEGES;
