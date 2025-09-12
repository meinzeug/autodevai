# 🔒 Bekannte Sicherheitslücken und Abhängigkeiten

> **Status:** Dokumentiert | **Stand:** Januar 2025 | **Priorität:** Mittel

## 📊 Übersicht

Dieses Dokument listet alle bekannten Sicherheitslücken in den Projektabhängigkeiten auf und dokumentiert die Entscheidungen zur Handhabung.

## 🚨 Aktuelle Vulnerabilities (3 Moderate)

### 1. RUSTSEC-2024-0437: Protobuf Recursion Vulnerability

**Betroffene Abhängigkeit:** `protobuf 2.28.0`  
**Schweregrad:** Moderate  
**Abhängigkeitspfad:** `prometheus 0.13.4 → protobuf 2.28.0`

**Status:** ⚠️ **Akzeptiertes Risiko**

**Begründung:**
- Prometheus ist **essentiell** für das Monitoring-System (siehe `docs/konzept.md`)
- Die Vulnerability betrifft unkontrollierte Rekursion, die zu Crashes führen kann
- Unser Use-Case exponiert keine externen Protobuf-Schnittstellen
- Monitoring läuft in isolierter Umgebung

**Mitigation:**
- Warten auf Prometheus Update auf protobuf >=3.7.2
- Alternative: Custom Metrics Implementation ohne Protobuf (geplant für v3.0)

### 2. RUSTSEC-2023-0071: RSA Marvin Attack

**Betroffene Abhängigkeit:** `rsa 0.9.8`  
**Schweregrad:** 5.9 (Medium)  
**Abhängigkeitspfad:** `sqlx-mysql 0.8.6 → rsa 0.9.8`

**Status:** ⚠️ **Akzeptiertes Risiko**

**Begründung:**
- Timing-Seitenkanal-Angriff, der physischen Zugriff erfordert
- SQLx verwendet RSA nur für MySQL-Authentifizierung
- Datenbank läuft lokal in Docker-Container
- Kein Fix verfügbar (upstream issue)

**Mitigation:**
- Verwendung von PostgreSQL statt MySQL in Produktion empfohlen
- Monitoring auf SQLx Updates

### 3. RUSTSEC-2024-0413: GTK3 Unmaintained

**Betroffene Abhängigkeit:** `atk 0.18.2`  
**Schweregrad:** Warning (Unmaintained)  
**Abhängigkeitspfad:** `gtk 0.18.2 → wry → tauri`

**Status:** ✅ **Niedrige Priorität**

**Begründung:**
- Nur eine Warnung, keine aktive Sicherheitslücke
- Tauri-Abhängigkeit (Core Framework)
- Migration zu GTK4 geplant in Tauri v3

## 📋 Maßnahmenplan

### Kurzfristig (Sprint 1-2)
- [ ] Monitoring auf Updates der betroffenen Packages
- [ ] Security Scanning in CI/CD Pipeline verstärken

### Mittelfristig (v2.5)
- [ ] Evaluierung alternativer Metrics-Bibliotheken
- [ ] PostgreSQL als primäre Datenbank etablieren

### Langfristig (v3.0)
- [ ] Custom Metrics Implementation ohne Protobuf
- [ ] Tauri v3 Migration (GTK4 Support)

## 🔧 Befehle zur Überprüfung

```bash
# NPM Vulnerabilities prüfen
npm audit

# Cargo/Rust Vulnerabilities prüfen
cd src-tauri && cargo audit

# Detaillierte Informationen
cargo audit --deny warnings
```

## 📝 Entscheidungsprotokoll

| Datum      | Entscheidung | Begründung | Verantwortlich |
|------------|--------------|------------|----------------|
| 2025-01-12 | Prometheus beibehalten trotz Protobuf-Lücke | Essentiell für Monitoring, isolierte Umgebung | Team |
| 2025-01-12 | RSA/MySQL akzeptiert | Lokale DB, Timing-Attack unpraktikabel | Team |
| 2025-01-12 | GTK3 Warning ignoriert | Tauri-Core-Abhängigkeit, nur Warnung | Team |

## 🔗 Referenzen

- [RUSTSEC-2024-0437](https://rustsec.org/advisories/RUSTSEC-2024-0437)
- [RUSTSEC-2023-0071](https://rustsec.org/advisories/RUSTSEC-2023-0071)
- [RUSTSEC-2024-0413](https://rustsec.org/advisories/RUSTSEC-2024-0413)
- [GitHub Security Advisories](https://github.com/meinzeug/autodevai/security/dependabot)

---

**Zuletzt aktualisiert:** 12.01.2025  
**Nächste Review:** 01.02.2025