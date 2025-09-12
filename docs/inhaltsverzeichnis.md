# 📚 AutoDev-AI Dokumentation - Inhaltsverzeichnis

> **Zentrales Navigationsdokument für die gesamte Projektdokumentation**  
> Stand: September 2025 | Version: 2.0.0

---

## 🎯 Hauptdokumente (Canonical Sources)

Diese Dokumente definieren die maßgebliche Wahrheit für das Projekt:

| Dokument                       | Beschreibung                                      | Status     |
| ------------------------------ | ------------------------------------------------- | ---------- |
| [📋 Roadmap](./roadmap.md)     | Strategische Entwicklungsplanung und Meilensteine | ✅ Aktuell |
| [💡 Konzept](./konzept.md)     | Vollständige Projektphilosophie und MCP-Vision    | ✅ Aktuell |
| [📝 Changelog](./changelog.md) | Versionshistorie und Änderungen                   | ✅ Aktuell |
| [✅ Todo](./todo.md)           | Aktuelle Sprint-Aufgaben und Backlog              | ✅ Aktuell |

---

## 📁 Dokumentationsstruktur

### 📖 `/guides` - Anleitungen und Tutorials (5 Dokumente)

Schritt-für-Schritt-Anleitungen für Benutzer und Entwickler.

| Dokument                                                      | Beschreibung                       | Zielgruppe  |
| ------------------------------------------------------------- | ---------------------------------- | ----------- |
| [USER_GUIDE.md](./guides/USER_GUIDE.md)                       | Benutzerhandbuch für die Tauri-App | Endbenutzer |
| [DEPLOYMENT.md](./guides/DEPLOYMENT.md)                       | Deployment- und Installation       | DevOps      |
| [CONTRIBUTING.md](./guides/CONTRIBUTING.md)                   | Beitragsrichtlinien                | Entwickler  |
| [deployment-guide.md](./guides/deployment-guide.md)           | Erweiterte Deployment-Anleitung    | DevOps      |
| [github-workflow-guide.md](./guides/github-workflow-guide.md) | GitHub Actions Workflow-Guide      | CI/CD       |

### 🔧 `/reference` - Technische Referenz (5 Dokumente)

API-Dokumentation, Befehlsreferenzen und technische Spezifikationen.

| Dokument                                                 | Beschreibung                   | Format  |
| -------------------------------------------------------- | ------------------------------ | ------- |
| [api-specification.md](./reference/api-specification.md) | Vollständige API-Dokumentation | OpenAPI |
| [API_COMMANDS.md](./reference/API_COMMANDS.md)           | Befehlsreferenz                | CLI     |
| [README.md](./reference/README.md)                       | API-Übersicht                  | Docs    |
| [PIPELINE_README.md](./reference/PIPELINE_README.md)     | CI/CD Pipeline-Referenz        | YAML    |
| [MENU_SYSTEM.md](./reference/MENU_SYSTEM.md)             | Menüsystem-Referenz            | UI      |

### 🏗️ `/architecture` - System-Design und Architektur (5 Dokumente)

Architekturentscheidungen, Designmuster und technische Implementierungen.

| Dokument                                                                | Beschreibung              | Typ       |
| ----------------------------------------------------------------------- | ------------------------- | --------- |
| [architecture.md](./architecture/architecture.md)                       | Gesamtsystemarchitektur   | Übersicht |
| [TAURI_IMPLEMENTATION.md](./architecture/TAURI_IMPLEMENTATION.md)       | Tauri Desktop-App Details | Backend   |
| [security-implementation.md](./architecture/security-implementation.md) | Sicherheitsframework      | Security  |
| [security-framework.md](./architecture/security-framework.md)           | Sicherheits-Framework     | Security  |
| [IMPLEMENTATION_PLAN.md](./architecture/IMPLEMENTATION_PLAN.md)         | Implementierungsplan      | Strategy  |

### 💡 `/howtos` - Praktische Anleitungen (4 Dokumente)

Kurze, problemorientierte Anleitungen und Best Practices.

| Dokument                                                              | Beschreibung               | Kategorie   |
| --------------------------------------------------------------------- | -------------------------- | ----------- |
| [security-best-practices.md](./howtos/security-best-practices.md)     | Sicherheits-Best-Practices | Security    |
| [responsive-design-guide.md](./howtos/responsive-design-guide.md)     | Responsive Design Guide    | UI/UX       |
| [security-remediation-plan.md](./howtos/security-remediation-plan.md) | Security-Remediation-Plan  | Security    |
| [issue-resolution.md](./howtos/issue-resolution.md)                   | Issue-Resolution-Guide     | Development |

---

## 🗺️ Navigation nach Anwendungsfall

### 🚀 **Für neue Entwickler**

1. Start mit [Konzept](./konzept.md) - Verstehe die Vision
2. Lies [CONTRIBUTING.md](./guides/CONTRIBUTING.md) - Lerne die Regeln
3. Studiere [architecture.md](./architecture/architecture.md) - Verstehe das System
4. Folge [USER_GUIDE.md](./guides/USER_GUIDE.md) - Nutze die Anwendung

### 🔧 **Für DevOps/Deployment**

1. [DEPLOYMENT.md](./guides/DEPLOYMENT.md) - Basis-Deployment
2. [deployment-guide.md](./guides/deployment-guide.md) - Erweiterte Optionen
3. [PIPELINE_README.md](./reference/PIPELINE_README.md) - CI/CD-Referenz

### 🔒 **Für Security**

1. [security-implementation.md](./architecture/security-implementation.md) - Framework
2. [security-best-practices.md](./howtos/security-best-practices.md) - Best Practices
3. [security-remediation-plan.md](./howtos/security-remediation-plan.md) - Remediation

---

## 📊 Dokumentationsstatus

| Kategorie    | Dokumente | Aktuell | Veraltet | Review nötig |
| ------------ | --------- | ------- | -------- | ------------ |
| Guides       | 5         | ✅ 5    | ⚠️ 0     | 🔄 0         |
| Reference    | 5         | ✅ 4    | ⚠️ 0     | 🔄 1         |
| Architecture | 5         | ✅ 4    | ⚠️ 0     | 🔄 1         |
| HowTos       | 4         | ✅ 4    | ⚠️ 0     | 🔄 0         |

---

## 🔍 Schnellsuche

### Nach Technologie

- **Tauri**: [TAURI_IMPLEMENTATION.md](./architecture/TAURI_IMPLEMENTATION.md)
- **Security**: [security-implementation.md](./architecture/security-implementation.md)

### Nach Phase

- **Planung**: [roadmap.md](./roadmap.md), [todo.md](./todo.md)
- **Entwicklung**: [CONTRIBUTING.md](./guides/CONTRIBUTING.md), [api-specification.md](./reference/api-specification.md)
- **Deployment**: [DEPLOYMENT.md](./guides/DEPLOYMENT.md)

---

## 📝 Wartungshinweise

### Aktualisierungsrichtlinien

1. **Canonical Sources** (roadmap, konzept, changelog, todo) haben höchste Priorität
2. **Guides** bei Feature-Änderungen aktualisieren
3. **Reference** bei API-Änderungen aktualisieren
4. **Architecture** bei Design-Änderungen aktualisieren

### Versionierung

- Dieses Inhaltsverzeichnis: v2.0.0
- Letzte Aktualisierung: September 2025
- Nächste Review: Oktober 2025

---

## 🤝 Kontakt & Support

- **Repository**: [github.com/meinzeug/autodevai](https://github.com/meinzeug/autodevai)
- **Issues**: [GitHub Issues](https://github.com/meinzeug/autodevai/issues)
- **Dokumentations-Feedback**: Erstelle ein Issue mit Label `documentation`

---

_Dieses Inhaltsverzeichnis wird automatisch bei größeren Dokumentationsänderungen aktualisiert._
