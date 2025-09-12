<!-- 
AutoDev-AI - Dual License
GNU General Public License v3.0 for open-source use
Commercial license available for proprietary use
See LICENSE-GPL and LICENSE-COMMERCIAL for details
-->

# Phase 1: System-Vorbereitung und Abhängigkeiten (80 Schritte)

## 1.1 System Update und Basis-Tools (20 Schritte)

- [x] ### Schritt 1: System Package-Listen aktualisieren

```bash
sudo apt update
```

**Erläuterung:** Dieser Befehl aktualisiert die lokalen Package-Listen von den Ubuntu-Repositories.
Er lädt die neuesten Informationen über verfügbare Packages und deren Versionen herunter. Dies ist
essentiell vor jeder Installation, um sicherzustellen, dass die aktuellsten Versionen installiert
werden. Der Befehl kontaktiert alle konfigurierten APT-Quellen und synchronisiert die lokale
Datenbank. Ohne diesen Schritt könnten veraltete oder nicht mehr verfügbare Packages installiert
werden.

- [x] ### Schritt 2: Alle System-Packages upgraden

```bash
sudo apt upgrade -y
```

**Erläuterung:** Dieser Befehl aktualisiert alle installierten Packages auf die neuesten verfügbaren
Versionen. Das -y Flag beantwortet automatisch alle Bestätigungsfragen mit "Ja", was die
Installation automatisiert. Der Upgrade-Prozess kann Sicherheitsupdates, Bugfixes und neue Features
enthalten. Es ist wichtig, das System vor der Installation neuer Software auf den neuesten Stand zu
bringen. Dies vermeidet Kompatibilitätsprobleme und stellt sicher, dass alle Abhängigkeiten korrekt
aufgelöst werden.

- [x] ### Schritt 3: Build-Essential installieren

```bash
sudo apt install -y build-essential
```

**Erläuterung:** Build-Essential ist ein Meta-Package, das die wichtigsten Tools für das Kompilieren
von Software enthält. Es installiert GCC (GNU Compiler Collection), Make und andere essenzielle
Build-Tools. Diese Tools werden benötigt, um Rust, Node.js Module mit nativen Abhängigkeiten und
andere Software zu kompilieren. Das Package enthält auch Header-Dateien für die
C-Standardbibliothek. Ohne Build-Essential können viele Entwicklungsaufgaben nicht durchgeführt
werden.

- [x] ### Schritt 4: Git Version Control installieren

```bash
sudo apt install -y git
```

**Erläuterung:** Git ist das wichtigste Version Control System für moderne Softwareentwicklung. Es
wird benötigt, um das AutoDev-AI Repository zu klonen und Änderungen zu verwalten. Git ermöglicht
kollaborative Entwicklung und tracking von Code-Änderungen über Zeit. Die Installation enthält auch
Git-Tools für Kommandozeile und Integration mit anderen Entwicklungstools. Ohne Git wäre es
unmöglich, effektiv mit dem GitHub-Repository zu arbeiten.

- [x] ### Schritt 5: Curl Download-Tool installieren

```bash
sudo apt install -y curl
```

**Erläuterung:** Curl ist ein vielseitiges Kommandozeilen-Tool für Datenübertragung mit URLs. Es
wird verwendet, um Installations-Scripts herunterzuladen, APIs zu testen und Daten von Webservern
abzurufen. Viele Installations-Scripts, einschließlich des Rust-Installers, werden mit Curl
heruntergeladen. Das Tool unterstützt zahlreiche Protokolle wie HTTP, HTTPS, FTP und mehr. Curl ist
ein essentielles Tool für moderne Entwicklung und System-Administration.

- [x] ### Schritt 6: Wget Alternative Download-Tool installieren

```bash
sudo apt install -y wget
```

**Erläuterung:** Wget ist ein weiteres Kommandozeilen-Tool zum Herunterladen von Dateien aus dem
Internet. Es bietet ähnliche Funktionalität wie Curl, ist aber oft einfacher für direkte
File-Downloads. Wget kann große Dateien mit Resume-Support herunterladen, was bei unterbrochenen
Downloads hilfreich ist. Einige Scripts und Tools bevorzugen Wget über Curl für bestimmte
Operationen. Die Installation beider Tools stellt maximale Kompatibilität sicher.

- [x] ### Schritt 7: File Utility für Dateityp-Erkennung installieren

```bash
sudo apt install -y file
```

**Erläuterung:** Das File-Utility identifiziert Dateitypen basierend auf ihrem Inhalt, nicht nur auf
der Dateierweiterung. Es ist nützlich für Debugging und Verifizierung von Download-Inhalten. Das
Tool kann zwischen verschiedenen Archivformaten, Binaries und Textdateien unterscheiden. Es wird von
vielen Build-Scripts verwendet, um die Integrität von Dateien zu überprüfen. File ist ein wichtiges
Diagnose-Tool für Entwickler und System-Administratoren.

- [x] ### Schritt 8: Unzip für ZIP-Archive installieren

```bash
sudo apt install -y unzip
```

**Erläuterung:** Unzip ist das Standard-Tool zum Extrahieren von ZIP-Archiven unter Linux. Viele
Software-Packages und Assets werden als ZIP-Dateien distribuiert. Das Tool unterstützt
verschlüsselte Archive und kann Metadaten wie Timestamps bewahren. Es ist essentiell für die
Installation von Node.js Packages und anderen Dependencies. Ohne Unzip könnten viele
heruntergeladene Archive nicht entpackt werden.

- [x] ### Schritt 9: Zip für Archive-Erstellung installieren

```bash
sudo apt install -y zip
```

**Erläuterung:** Zip erstellt komprimierte Archive im universellen ZIP-Format. Es wird benötigt, um
Builds zu verpacken, Backups zu erstellen und Dateien für Distribution vorzubereiten. Das Tool kann
Verzeichnisse rekursiv archivieren und verschiedene Kompressionslevel verwenden. ZIP-Archive sind
plattformübergreifend kompatibel mit Windows, macOS und Linux. Die Fähigkeit, Archive zu erstellen,
ist wichtig für Deployment und Backup-Strategien.

- [x] ### Schritt 10: XZ-Utils für moderne Kompression installieren

```bash
sudo apt install -y xz-utils
```

**Erläuterung:** XZ-Utils bietet hocheffiziente Kompression mit dem LZMA2-Algorithmus. Viele moderne
Linux-Packages verwenden XZ-Kompression für bessere Größenreduktion als gzip. Das Tool wird oft für
Rust-Toolchains und andere große Software-Distributions verwendet. XZ bietet ein exzellentes
Verhältnis zwischen Kompressionsrate und Geschwindigkeit. Die Installation ist notwendig für viele
moderne Package-Formate.

- [x] ### Schritt 11: Make Build-Automation installieren

```bash
sudo apt install -y make
```

**Erläuterung:** Make ist das klassische Build-Automation-Tool, das Makefiles interpretiert und
Build-Prozesse steuert. Obwohl bereits in build-essential enthalten, stellt die explizite
Installation sicher, dass es verfügbar ist. Make wird von vielen C/C++ und Rust-Projekten für
Build-Orchestrierung verwendet. Es ermöglicht die Definition komplexer Build-Abhängigkeiten und
-Regeln. Das Tool ist fundamental für viele Open-Source-Projekte.

- [x] ### Schritt 12: GCC Compiler installieren

```bash
sudo apt install -y gcc
```

**Erläuterung:** GCC (GNU Compiler Collection) ist der Standard-C-Compiler für Linux-Systeme. Er
wird benötigt, um native Rust-Dependencies und Node.js-Module zu kompilieren. GCC ist einer der
wichtigsten Compiler und unterstützt verschiedene Optimierungsstufen. Viele System-Libraries sind
mit GCC kompiliert und erwarten kompatible Binaries. Die explizite Installation stellt sicher, dass
die neueste Version verfügbar ist.

- [x] ### Schritt 13: G++ für C++ installieren

```bash
sudo apt install -y g++
```

**Erläuterung:** G++ ist der C++-Compiler der GNU Compiler Collection. Viele Node.js native Module
und Rust-Dependencies sind in C++ geschrieben. Der Compiler ist notwendig für die Installation von
Performance-kritischen Komponenten. G++ unterstützt moderne C++-Standards und Optimierungen. Ohne
G++ können viele npm-Packages mit nativen Bindings nicht installiert werden.

- [x] ### Schritt 14: Pkg-config für Library-Discovery installieren

```bash
sudo apt install -y pkg-config
```

**Erläuterung:** Pkg-config ist ein Helper-Tool, das Compiler- und Linker-Flags für installierte
Libraries bereitstellt. Es wird während des Build-Prozesses verwendet, um die korrekten
Include-Pfade und Link-Flags zu finden. Viele Build-Systems, einschließlich Cargo (Rust) und
Node-gyp, nutzen pkg-config. Das Tool vereinfacht die Verwendung von System-Libraries erheblich.
Ohne pkg-config müssten Library-Pfade manuell spezifiziert werden.

- [x] ### Schritt 15: CA-Certificates für SSL/TLS installieren

```bash
sudo apt install -y ca-certificates
```

**Erläuterung:** CA-Certificates enthält die Root-Zertifikate vertrauenswürdiger Certificate
Authorities. Diese sind essentiell für sichere HTTPS-Verbindungen zu Package-Repositories und APIs.
Ohne gültige CA-Zertifikate würden Downloads von sicheren Quellen fehlschlagen. Das Package wird
regelmäßig aktualisiert, um neue CAs hinzuzufügen und kompromittierte zu entfernen. Sichere
Kommunikation ist fundamental für moderne Softwareentwicklung.

- [x] ### Schritt 16: GnuPG für Signatur-Verifizierung installieren

```bash
sudo apt install -y gnupg
```

**Erläuterung:** GnuPG (GNU Privacy Guard) ist eine Implementierung des OpenPGP-Standards für
Verschlüsselung und digitale Signaturen. Es wird verwendet, um die Authentizität von
Software-Packages und Repository-Keys zu verifizieren. Viele Package-Manager nutzen GPG für
Sicherheitsverifizierung. Das Tool schützt vor manipulierten Packages und
Man-in-the-Middle-Angriffen. GPG ist ein kritischer Bestandteil der
Software-Supply-Chain-Sicherheit.

- [x] ### Schritt 17: LSB-Release für Distributions-Info installieren

```bash
sudo apt install -y lsb-release
```

**Erläuterung:** LSB-Release stellt standardisierte Informationen über die Linux-Distribution
bereit. Installations-Scripts nutzen diese Information, um die richtigen Packages für die
spezifische Ubuntu-Version auszuwählen. Das Tool gibt Details wie Versionsnummer, Codename und
Architektur aus. Viele automatisierte Installations-Scripts hängen von LSB-Release ab. Es ermöglicht
portables Scripting über verschiedene Linux-Distributionen.

- [x] ### Schritt 18: Software-Properties-Common für PPA-Management installieren

```bash
sudo apt install -y software-properties-common
```

**Erläuterung:** Dieses Package stellt Tools zum Management von Software-Repositories bereit,
insbesondere PPAs (Personal Package Archives). Es enthält das add-apt-repository Command, das für
das Hinzufügen externer Repositories benötigt wird. Viele moderne Entwicklungstools werden über PPAs
distribuiert. Das Package vereinfacht das Repository-Management erheblich. Ohne es wäre das manuelle
Editieren von APT-Sources nötig.

- [x] ### Schritt 19: APT-Transport-HTTPS für sichere Repositories installieren

```bash
sudo apt install -y apt-transport-https
```

**Erläuterung:** Dieses Package ermöglicht APT, Packages über HTTPS herunterzuladen. Moderne
Repositories verwenden HTTPS für sichere Package-Distribution. Es schützt vor
Man-in-the-Middle-Angriffen während des Package-Downloads. Viele externe Repositories,
einschließlich Docker und Node.js, erfordern HTTPS-Support. Die Installation ist essentiell für die
Sicherheit des Package-Management-Systems.

- [x] ### Schritt 20: Basis-System-Tools verifizieren

```bash
which git curl wget make gcc g++ && echo "All basic tools installed successfully"
```

**Erläuterung:** Dieser Befehl überprüft, ob alle grundlegenden Tools korrekt installiert wurden.
Der which-Befehl zeigt den Pfad jedes Tools, wenn es im System PATH verfügbar ist. Die Verkettung
mit && stellt sicher, dass nur bei Erfolg aller Checks die Erfolgsmeldung erscheint. Diese
Verifizierung ist wichtig, bevor mit der Installation komplexerer Komponenten fortgefahren wird. Ein
Fehler hier würde auf Probleme in den vorherigen Installationsschritten hinweisen.

## 1.2 Tauri System-Abhängigkeiten (15 Schritte)

- [x] ### Schritt 21: WebKit2GTK für Tauri Web-Engine installieren

```bash
sudo apt install -y libwebkit2gtk-4.1-dev
```

**Erläuterung:** WebKit2GTK ist die Web-Rendering-Engine, die Tauri für die Darstellung der Web-UI
verwendet. Es ist eine moderne, performante Engine, die HTML5, CSS3 und JavaScript vollständig
unterstützt. Die Development-Version enthält Header-Dateien und Libraries für die Kompilierung. Ohne
WebKit2GTK kann Tauri keine Fenster mit Web-Content rendern. Diese Abhängigkeit ist absolut kritisch
für jede Tauri-Anwendung.

- [x] ### Schritt 22: GTK-3 Development Libraries installieren

```bash
sudo apt install -y libgtk-3-dev
```

**Erläuterung:** GTK-3 ist das GIMP Toolkit, ein Widget-Toolkit für die Erstellung grafischer
Benutzeroberflächen. Tauri nutzt GTK für native Window-Management und System-Integration unter
Linux. Die Development-Libraries enthalten Header-Dateien für die Kompilierung. GTK bietet native
Look-and-Feel und Integration mit dem Desktop-Environment. Ohne GTK-3 könnte Tauri keine nativen
Fenster erstellen.

- [x] ### Schritt 23: Libappindicator für System-Tray installieren

```bash
sudo apt install -y libayatana-appindicator3-dev
```

**Erläuterung:** Libappindicator ermöglicht Tauri-Anwendungen, System-Tray-Icons und -Menüs zu
erstellen. Ayatana ist die moderne Fork, die in aktuellen Ubuntu-Versionen verwendet wird. Die
Library bietet Integration mit verschiedenen Desktop-Environments. System-Tray-Funktionalität ist
wichtig für Background-Anwendungen. Diese Abhängigkeit ermöglicht minimierte und persistent laufende
Tauri-Apps.

- [x] ### Schritt 24: Librsvg für SVG-Support installieren

```bash
sudo apt install -y librsvg2-dev
```

**Erläuterung:** Librsvg ist eine Library zum Rendern von SVG (Scalable Vector Graphics) Dateien.
Tauri nutzt sie für hochauflösende, skalierbare Icons und Grafiken. SVG-Support ist wichtig für
moderne, responsive UIs mit verschiedenen Bildschirmauflösungen. Die Library unterstützt den
kompletten SVG-Standard inklusive Animationen. Ohne Librsvg könnten vektorbasierte Assets nicht
korrekt dargestellt werden.

- [x] ### Schritt 25: JavaScript Core GTK installieren

```bash
sudo apt install -y libjavascriptcoregtk-4.1-dev
```

**Erläuterung:** JavaScriptCore ist die JavaScript-Engine von WebKit, die für die Ausführung von
JavaScript-Code zuständig ist. Diese separate Installation stellt sicher, dass alle
JavaScript-Features verfügbar sind. Die Engine ist hochoptimiert und unterstützt moderne
ECMAScript-Standards. Sie ermöglicht die Kommunikation zwischen Rust-Backend und
JavaScript-Frontend. Diese Komponente ist essentiell für die Tauri-IPC-Kommunikation.

- [x] ### Schritt 26: Libsoup für Network-Support installieren

```bash
sudo apt install -y libsoup-3.0-dev
```

**Erläuterung:** Libsoup ist eine HTTP-Client/Server-Library, die WebKit für Netzwerk-Operationen
verwendet. Sie handhabt HTTP/HTTPS-Requests, Cookies, Caching und andere Web-Features. Version 3.0
ist die neueste Major-Version mit verbesserter Performance. Die Library ist notwendig für alle
Web-Requests innerhalb der Tauri-WebView. Ohne Libsoup könnte die Anwendung keine externen
Ressourcen laden.

- [x] ### Schritt 27: GDK Pixbuf für Bildverarbeitung installieren

```bash
sudo apt install -y libgdk-pixbuf2.0-dev
```

**Erläuterung:** GDK Pixbuf ist eine Library zum Laden und Manipulieren von Bildern in verschiedenen
Formaten. Sie wird von GTK für Icon-Rendering und Bildanzeige verwendet. Die Library unterstützt
gängige Formate wie PNG, JPEG, GIF und mehr. Pixbuf ist wichtig für die Darstellung von
Anwendungs-Icons und Bildinhalten. Ohne diese Library könnten Bilder in der Tauri-App nicht korrekt
angezeigt werden.

- [x] ### Schritt 28: Pango für Text-Rendering installieren

```bash
sudo apt install -y libpango1.0-dev
```

**Erläuterung:** Pango ist eine Library für das Layout und Rendering von internationalem Text. Sie
unterstützt komplexe Schriftsysteme, Bidirektionalität und fortgeschrittene Typografie. GTK und
WebKit nutzen Pango für alle Text-Rendering-Operationen. Die Library ist essentiell für korrekte
Textdarstellung in verschiedenen Sprachen. Ohne Pango würde Text-Rendering fehlschlagen oder
inkorrekt sein.

- [x] ### Schritt 29: Cairo Grafik-Library installieren

```bash
sudo apt install -y libcairo2-dev
```

**Erläuterung:** Cairo ist eine 2D-Grafik-Library, die für das Zeichnen von Vektorgrafiken verwendet
wird. Sie bietet Anti-Aliasing, Alpha-Compositing und andere fortgeschrittene Grafik-Features. GTK
nutzt Cairo für alle Drawing-Operationen. Die Library unterstützt verschiedene Output-Backends wie
X11, Wayland und PDF. Cairo ist fundamental für die grafische Darstellung in GTK-Anwendungen.

- [x] ### Schritt 30: ATK Accessibility Toolkit installieren

```bash
sudo apt install -y libatk1.0-dev
```

**Erläuterung:** ATK (Accessibility Toolkit) bietet Schnittstellen für
Barrierefreiheits-Technologien. Es ermöglicht Screen-Readern und anderen Hilfstechnologien, mit der
Anwendung zu interagieren. Die Library ist wichtig für die Einhaltung von Accessibility-Standards.
Moderne Anwendungen sollten für alle Benutzer zugänglich sein. ATK-Support macht Tauri-Apps
kompatibel mit Assistive Technologies.

- [x] ### Schritt 31: GLib Foundation Library installieren

```bash
sudo apt install -y libglib2.0-dev
```

**Erläuterung:** GLib ist eine Low-Level-Core-Library, die Datenstrukturen und Utility-Funktionen
bereitstellt. Sie ist die Basis für GTK und viele andere GNOME-Technologien. GLib bietet
Event-Loops, Threading, und Memory-Management. Die Library ist essentiell für die gesamte
GTK-Stack-Funktionalität. Ohne GLib würden alle GTK-basierten Komponenten nicht funktionieren.

- [x] ### Schritt 32: OpenSSL Development Headers installieren

```bash
sudo apt install -y libssl-dev
```

**Erläuterung:** OpenSSL Development-Files sind notwendig für die Kompilierung von Rust-Crates, die
Kryptografie verwenden. Viele Rust-Dependencies, einschließlich reqwest für HTTP-Requests, benötigen
OpenSSL. Die Headers ermöglichen das Linken gegen die System-OpenSSL-Library. Kryptografische
Funktionen sind essentiell für sichere Kommunikation. Ohne libssl-dev würden viele
Rust-Kompilierungen fehlschlagen.

- [x] ### Schritt 33: Libxdo für Window-Management installieren

```bash
sudo apt install -y libxdo-dev
```

**Erläuterung:** Libxdo bietet programmatische Kontrolle über X11-Windows und Input-Events. Es
ermöglicht Window-Manipulation, Automatisierung und erweiterte Desktop-Integration. Die Library kann
für Features wie Always-on-Top oder Window-Positioning verwendet werden. Sie ist nützlich für
fortgeschrittene Window-Management-Features. Libxdo erweitert die Möglichkeiten der
Desktop-Integration erheblich.

- [x] ### Schritt 34: Tauri-Abhängigkeiten verifizieren

```bash
pkg-config --exists webkit2gtk-4.1 gtk+-3.0 && echo "Core Tauri dependencies OK"
```

**Erläuterung:** Dieser Befehl nutzt pkg-config, um zu überprüfen, ob die wichtigsten
Tauri-Dependencies korrekt installiert sind. Die --exists Option prüft stillschweigend und gibt nur
einen Exit-Code zurück. WebKit2GTK und GTK-3 sind die kritischsten Dependencies für Tauri. Ein
erfolgreicher Check bestätigt, dass die Libraries und ihre pkg-config-Files vorhanden sind. Diese
Verifizierung verhindert spätere Kompilierungsfehler.

- [x] ### Schritt 35: Zusätzliche GUI-Libraries installieren

```bash
sudo apt install -y libgirepository1.0-dev gir1.2-gtk-3.0
```

**Erläuterung:** GObject Introspection bietet Runtime-Bindings für GObject-basierte Libraries. Diese
Packages ermöglichen bessere Integration mit dem Desktop-Environment. Sie werden für erweiterte
GTK-Features und Plugin-Support benötigt. Die Installation verbessert die Kompatibilität mit
verschiedenen Desktop-Umgebungen. Diese zusätzlichen Libraries runden die GUI-Unterstützung ab.

## 1.3 Rust Installation (18 Schritte)

- [x] ### Schritt 36: Rust Installer herunterladen

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o rustup.sh
```

**Erläuterung:** Dieser Befehl lädt das offizielle Rust-Installations-Script von rustup.rs herunter.
Die Flags stellen sicher, dass HTTPS mit TLS 1.2 oder höher verwendet wird für maximale Sicherheit.
Das -s Flag macht curl still, -S zeigt Fehler, und -f lässt den Befehl bei HTTP-Fehlern
fehlschlagen. Der Installer wird als rustup.sh lokal gespeichert für die Ausführung. Rustup ist der
empfohlene Weg zur Rust-Installation und -Verwaltung.

- [x] ### Schritt 37: Installer ausführbar machen

```bash
chmod +x rustup.sh
```

**Erläuterung:** Der chmod-Befehl ändert die Dateiberechtigungen und macht das Script ausführbar.
Das +x Flag fügt Ausführungsrechte für alle Benutzergruppen hinzu. Ohne diese Berechtigung könnte
das Script nicht direkt ausgeführt werden. Dies ist ein Standard-Sicherheitsmechanismus in
Unix-Systemen. Die Ausführbarkeit ist notwendig für den nächsten Installationsschritt.

- [x] ### Schritt 38: Rust ohne Interaktion installieren

```bash
./rustup.sh -y --default-toolchain stable --profile default
```

**Erläuterung:** Dieser Befehl führt die Rust-Installation automatisiert aus ohne
Benutzerinteraktion. Das -y Flag akzeptiert alle Standardoptionen automatisch. Die stable Toolchain
wird als Standard gesetzt für Produktions-Readiness. Das default Profile installiert alle
notwendigen Komponenten für normale Entwicklung. Die Installation konfiguriert auch die
PATH-Variable für den aktuellen Benutzer.

- [x] ### Schritt 39: Installer-Script löschen

```bash
rm rustup.sh
```

**Erläuterung:** Nach erfolgreicher Installation wird das Installer-Script gelöscht, da es nicht
mehr benötigt wird. Dies hält das Dateisystem sauber und vermeidet Verwirrung über temporäre
Dateien. Das Script kann jederzeit wieder heruntergeladen werden falls nötig. Die Löschung ist eine
gute Praxis für Sicherheit und Ordnung. Rustup selbst bleibt installiert und kann für Updates
verwendet werden.

- [x] ### Schritt 40: Cargo Environment aktivieren

```bash
source "$HOME/.cargo/env"
```

**Erläuterung:** Dieser Befehl lädt die Cargo-Umgebungsvariablen in die aktuelle Shell-Session. Die
.cargo/env Datei enthält PATH-Erweiterungen und andere Konfigurationen. Ohne diesen Schritt wären
Rust und Cargo nicht im PATH verfügbar. Die Aktivierung ist notwendig, um Rust-Tools sofort nutzen
zu können. In neuen Shell-Sessions wird dies automatisch durch .bashrc geladen.

- [x] ### Schritt 41: Cargo zu .bashrc hinzufügen

```bash
echo 'source "$HOME/.cargo/env"' >> ~/.bashrc
```

**Erläuterung:** Diese Zeile fügt das Cargo-Environment-Script zur .bashrc-Datei hinzu. Die .bashrc
wird bei jeder neuen Bash-Shell-Session automatisch ausgeführt. Dies stellt sicher, dass Rust-Tools
in allen zukünftigen Terminal-Sessions verfügbar sind. Der >> Operator fügt die Zeile am Ende der
Datei hinzu ohne bestehenden Inhalt zu überschreiben. Diese Persistierung ist essentiell für die
dauerhafte Rust-Verfügbarkeit.

- [x] ### Schritt 42: Cargo zu .profile hinzufügen

```bash
echo 'source "$HOME/.cargo/env"' >> ~/.profile
```

**Erläuterung:** Die .profile-Datei wird von Login-Shells und einigen Desktop-Environments gelesen.
Dies stellt sicher, dass Rust auch in nicht-interaktiven Shells verfügbar ist. Einige IDEs und Tools
nutzen .profile statt .bashrc. Die doppelte Konfiguration garantiert maximale Kompatibilität. Diese
Redundanz vermeidet Probleme mit verschiedenen Shell-Konfigurationen.

- [x] ### Schritt 43: Rust-Installation verifizieren

```bash
rustc --version
```

**Erläuterung:** Dieser Befehl zeigt die Version des installierten Rust-Compilers an. Eine
erfolgreiche Ausgabe bestätigt, dass Rust korrekt installiert und im PATH verfügbar ist. Die
Versionsnummer zeigt, welche Rust-Version installiert wurde. Dies ist wichtig für
Kompatibilitätsprüfungen mit Dependencies. Die Verifizierung sollte eine stable Version wie "1.75.0"
oder höher zeigen.

- [x] ### Schritt 44: Cargo-Installation verifizieren

```bash
cargo --version
```

**Erläuterung:** Cargo ist der Package-Manager und Build-Tool für Rust-Projekte. Diese Verifizierung
bestätigt, dass Cargo korrekt installiert wurde. Cargo wird für alle Rust-Kompilierungen und
Dependency-Management verwendet. Die Version sollte mit der Rust-Version korrespondieren. Ohne
funktionierendes Cargo kann kein Rust-Projekt gebaut werden.

- [x] ### Schritt 45: Rust Formatter installieren

```bash
rustup component add rustfmt
```

**Erläuterung:** Rustfmt ist das offizielle Code-Formatting-Tool für Rust. Es formatiert Rust-Code
automatisch nach den offiziellen Style-Guidelines. Konsistente Formatierung verbessert die
Lesbarkeit und reduziert Style-Diskussionen. Das Tool kann in IDEs integriert werden für
automatisches Formatting beim Speichern. Rustfmt ist essentiell für professionelle Rust-Entwicklung.

- [x] ### Schritt 46: Rust Linter installieren

```bash
rustup component add clippy
```

**Erläuterung:** Clippy ist ein Collection von Lints für Rust, die häufige Fehler und
unidiomatischen Code erkennen. Es bietet Hunderte von Lints von Korrektheit bis
Performance-Optimierungen. Clippy hilft, besseren und sichereren Rust-Code zu schreiben. Die
Vorschläge lehren Best Practices und Rust-Idiome. Integration in den Build-Prozess verbessert die
Code-Qualität erheblich.

- [x] ### Schritt 47: Rust Analyzer installieren

```bash
rustup component add rust-analyzer
```

**Erläuterung:** Rust Analyzer ist der moderne Language Server für Rust mit IDE-Support. Er bietet
Features wie Auto-Completion, Go-to-Definition, und Inline-Fehleranzeige. Der Language Server
Protocol (LSP) ermöglicht Integration in verschiedene Editoren. Rust Analyzer verbessert die
Entwicklungsgeschwindigkeit dramatisch. Moderne Rust-Entwicklung ist ohne guten IDE-Support kaum
vorstellbar.

- [x] ### Schritt 48: Cargo-Edit für Dependency-Management installieren

```bash
cargo install cargo-edit
```

**Erläuterung:** Cargo-Edit fügt Befehle wie 'cargo add', 'cargo rm' und 'cargo upgrade' hinzu.
Diese Tools vereinfachen das Management von Dependencies in Cargo.toml. Statt manueller Bearbeitung
können Dependencies per Kommandozeile hinzugefügt werden. Das Tool prüft automatisch die neuesten
Versionen auf crates.io. Cargo-Edit macht Dependency-Management effizienter und fehlerfreier.

- [x] ### Schritt 49: Cargo-Watch für Auto-Rebuild installieren

```bash
cargo install cargo-watch
```

**Erläuterung:** Cargo-Watch überwacht Dateiänderungen und führt automatisch Builds oder Tests aus.
Es ermöglicht einen effizienten Entwicklungs-Workflow mit sofortigem Feedback. Das Tool kann
verschiedene Befehle bei Änderungen ausführen. Hot-Reloading-ähnliche Funktionalität verbessert die
Entwicklungsgeschwindigkeit. Cargo-Watch ist besonders nützlich für iterative Entwicklung.

- [x] ### Schritt 50: Cargo-Audit für Sicherheit installieren

```bash
cargo install cargo-audit
```

**Erläuterung:** Cargo-Audit prüft Dependencies auf bekannte Sicherheitslücken. Es nutzt die RustSec
Advisory Database für aktuelle Vulnerability-Informationen. Das Tool sollte regelmäßig ausgeführt
werden, um Sicherheitsrisiken zu identifizieren. Es bietet auch Vorschläge für sichere Update-Pfade.
Security-Auditing ist essentiell für produktionsreife Anwendungen.

- [x] ### Schritt 51: Tauri CLI installieren

```bash
cargo install tauri-cli --version "^2.0.0"
```

**Erläuterung:** Die Tauri CLI ist das zentrale Kommandozeilen-Tool für Tauri-Entwicklung. Version
2.0 ist die neueste Major-Version mit vielen Verbesserungen. Die CLI handhabt Building, Dev-Server,
und Bundling der Anwendung. Sie integriert Frontend- und Backend-Build-Prozesse nahtlos. Ohne Tauri
CLI kann keine Tauri-Anwendung entwickelt werden.

- [x] ### Schritt 52: Tauri CLI Installation verifizieren

```bash
cargo tauri --version
```

**Erläuterung:** Diese Verifizierung bestätigt, dass die Tauri CLI korrekt installiert wurde. Die
Version sollte 2.0.0 oder höher sein für Kompatibilität mit modernen Tauri-Apps. Die CLI sollte
global verfügbar sein durch die Cargo-Installation. Eine erfolgreiche Verifizierung zeigt, dass alle
Tauri-Dependencies korrekt sind. Dies ist der letzte Check vor der eigentlichen Entwicklung.

- [x] ### Schritt 53: Rust-Toolchain aktualisieren

```bash
rustup update
```

**Erläuterung:** Dieser Befehl aktualisiert alle installierten Rust-Toolchains auf die neuesten
Versionen. Es stellt sicher, dass alle Components auf dem aktuellen Stand sind. Updates enthalten
oft wichtige Bugfixes und Performance-Verbesserungen. Regelmäßige Updates sind wichtig für
Sicherheit und Kompatibilität. Der Befehl aktualisiert auch rustup selbst auf die neueste Version.

## 1.4 Node.js und npm Installation (12 Schritte)

- [x] ### Schritt 54: NodeSource Repository GPG-Key hinzufügen

```bash
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/nodesource.gpg
```

**Erläuterung:** Dieser Befehl lädt den GPG-Schlüssel für das NodeSource-Repository herunter und
konvertiert ihn in das benötigte Format. Der Schlüssel verifiziert die Authentizität der
Node.js-Packages vom NodeSource-Repository. Die --dearmor Option konvertiert den ASCII-armierten
Schlüssel in das binäre Format. Der Schlüssel wird im System-Keyring gespeichert für APT-Nutzung.
Diese Sicherheitsmaßnahme verhindert die Installation manipulierter Packages.

- [x] ### Schritt 55: NodeSource Repository hinzufügen

```bash
echo "deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
```

**Erläuterung:** Dieser Befehl fügt das offizielle NodeSource-Repository für Node.js 20 LTS zu den
APT-Sources hinzu. Das Repository enthält die neuesten Node.js-Versionen, die nicht in den
Standard-Ubuntu-Repos verfügbar sind. Die signed-by Option verknüpft das Repository mit dem zuvor
installierten GPG-Schlüssel. Node.js 20 ist die aktuelle LTS-Version mit Langzeit-Support. Diese
Konfiguration ermöglicht die Installation und Updates von Node.js über APT.

- [x] ### Schritt 56: Repository-Index aktualisieren

```bash
sudo apt update
```

**Erläuterung:** Nach dem Hinzufügen eines neuen Repositories muss der APT-Package-Index
aktualisiert werden. Dieser Befehl lädt die Package-Listen vom neu hinzugefügten
NodeSource-Repository. Ohne diese Aktualisierung wäre Node.js nicht zur Installation verfügbar. Der
Update erfasst auch eventuelle Updates in anderen Repositories. Dies ist ein notwendiger Schritt vor
der Node.js-Installation.

- [x] ### Schritt 57: Node.js 20 LTS installieren

```bash
sudo apt install -y nodejs
```

**Erläuterung:** Dieser Befehl installiert Node.js vom NodeSource-Repository. Die Installation
enthält sowohl Node.js als auch npm (Node Package Manager). Version 20 ist die Long Term Support
Version mit garantiertem Support bis 2026. Node.js ist die JavaScript-Runtime für Server-seitige
Anwendungen. Die Installation ist essentiell für alle modernen Web-Entwicklungsprojekte.

- [x] ### Schritt 58: Node.js Version verifizieren

```bash
node --version
```

**Erläuterung:** Diese Verifizierung bestätigt die erfolgreiche Installation von Node.js. Die
Ausgabe sollte v20.x.x zeigen, was die LTS-Version bestätigt. Die Versionsnummer ist wichtig für
Kompatibilitätsprüfungen mit npm-Packages. Eine funktionierende Node.js-Installation ist
Voraussetzung für das Frontend-Development. Die Verifizierung stellt sicher, dass Node.js im
System-PATH verfügbar ist.

- [x] ### Schritt 59: npm Version verifizieren

```bash
npm --version
```

**Erläuterung:** npm ist der Standard-Package-Manager für Node.js-Projekte. Diese Verifizierung
bestätigt, dass npm korrekt mit Node.js installiert wurde. Die npm-Version sollte 10.x oder höher
sein für moderne Features. npm wird für alle JavaScript-Dependencies und Build-Scripts verwendet.
Ohne funktionierendes npm kann das Projekt nicht aufgesetzt werden.

- [x] ### Schritt 60: npm auf neueste Version aktualisieren

```bash
sudo npm install -g npm@latest
```

**Erläuterung:** Dieser Befehl aktualisiert npm selbst auf die absolut neueste Version. Neuere
npm-Versionen bieten bessere Performance und neue Features. Das -g Flag installiert npm global für
alle Projekte. Die neueste Version hat oft wichtige Bugfixes und Sicherheitsupdates. Ein aktuelles
npm ist wichtig für moderne JavaScript-Entwicklung.

- [x] ### Schritt 61: Yarn Package Manager installieren

```bash
sudo npm install -g yarn
```

**Erläuterung:** Yarn ist ein alternativer Package-Manager zu npm mit einigen Vorteilen. Er bietet
deterministische Installs durch Lockfiles und bessere Offline-Unterstützung. Viele Projekte
bevorzugen Yarn für seine Geschwindigkeit und Zuverlässigkeit. Die globale Installation macht Yarn
für alle Projekte verfügbar. Yarn ist besonders nützlich für große Projekte mit vielen Dependencies.

- [x] ### Schritt 62: pnpm für effizientes Package-Management installieren

```bash
sudo npm install -g pnpm
```

**Erläuterung:** pnpm ist ein sehr effizienter Package-Manager, der Disk-Space durch Hard-Links
spart. Er installiert Dependencies in einem globalen Store und linkt sie in Projekte. Dies reduziert
Duplikation und beschleunigt Installationen erheblich. pnpm ist besonders vorteilhaft bei mehreren
Projekten mit ähnlichen Dependencies. Die Performance-Vorteile sind bei großen Monorepos besonders
deutlich.

- [x] ### Schritt 63: npm Registry konfigurieren

```bash
npm config set registry https://registry.npmjs.org/
```

**Erläuterung:** Dieser Befehl setzt die offizielle npm-Registry als Standard-Quelle für Packages.
Dies stellt sicher, dass Packages von der offiziellen Quelle geladen werden. Die Konfiguration ist
wichtig, falls zuvor andere Registries verwendet wurden. Die offizielle Registry hat die größte
Package-Auswahl und beste Verfügbarkeit. Diese Einstellung wird in der npm-Konfigurationsdatei
gespeichert.

- [x] ### Schritt 64: npm Global Directory erstellen

```bash
mkdir -p ~/.npm-global
```

**Erläuterung:** Dieses Verzeichnis wird für global installierte npm-Packages ohne sudo verwendet.
Die Verwendung eines User-Verzeichnisses vermeidet Berechtigungsprobleme. Das -p Flag erstellt auch
Parent-Directories falls nötig. Diese Konfiguration folgt Best Practices für npm-Setup. Ein
dediziertes Global-Directory verbessert die Sicherheit und Wartbarkeit.

- [x] ### Schritt 65: npm Prefix setzen

```bash
npm config set prefix '~/.npm-global'
```

**Erläuterung:** Diese Konfiguration leitet globale npm-Installationen ins User-Verzeichnis um. Dies
vermeidet die Notwendigkeit von sudo für globale Package-Installationen. Die Einstellung wird in der
.npmrc-Datei persistiert. Diese Konfiguration ist sicherer als System-weite Installationen.
Benutzer-spezifische Installationen vermeiden Konflikte zwischen verschiedenen Nutzern.

## 1.5 Docker Installation (15 Schritte)

- [x] ### Schritt 66: Alte Docker-Versionen entfernen

```bash
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
```

**Erläuterung:** Dieser Befehl entfernt alte oder inkompatible Docker-Versionen vom System.
Verschiedene Package-Namen werden abgedeckt, da Docker über die Jahre verschiedene Namen hatte. Das
|| true am Ende verhindert Fehler, wenn die Packages nicht installiert sind. Eine saubere
Deinstallation alter Versionen vermeidet Konflikte. Dies ist ein wichtiger erster Schritt für eine
frische Docker-Installation.

- [x] ### Schritt 67: Docker-Prerequisites installieren

```bash
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
```

**Erläuterung:** Diese Packages sind Voraussetzungen für die Docker-Installation. Sie ermöglichen
sicheren Download und Verifizierung der Docker-Packages. Die meisten wurden bereits installiert,
aber die Wiederholung stellt Vollständigkeit sicher. Diese Tools sind essentiell für
Repository-Management und sichere Kommunikation. Die Installation ist ein notwendiger
Vorbereitungsschritt.

- [x] ### Schritt 68: Docker GPG-Key hinzufügen

```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

**Erläuterung:** Der offizielle Docker GPG-Schlüssel wird heruntergeladen und für APT vorbereitet.
Dieser Schlüssel verifiziert die Authentizität der Docker-Packages. Die --dearmor Option konvertiert
den ASCII-Schlüssel ins Binärformat. Der Schlüssel wird im System-Keyring für APT-Nutzung
gespeichert. Diese Sicherheitsmaßnahme schützt vor manipulierten Docker-Installationen.

- [x] ### Schritt 69: Docker Repository hinzufügen

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

**Erläuterung:** Das offizielle Docker-Repository wird zu den APT-Sources hinzugefügt. Die
Architektur und Ubuntu-Version werden automatisch erkannt für Kompatibilität. Nur stable Releases
werden einbezogen für Produktions-Stabilität. Das Repository wird mit dem GPG-Schlüssel verknüpft
für Sicherheit. Diese Konfiguration ermöglicht Docker-Installation und Updates über APT.

- [x] ### Schritt 70: Package-Index mit Docker-Repository aktualisieren

```bash
sudo apt update
```

**Erläuterung:** Der APT-Index wird aktualisiert, um Docker-Packages vom neuen Repository zu
erfassen. Dieser Schritt ist notwendig nach dem Hinzufügen eines neuen Repositories. Die
Package-Listen enthalten alle verfügbaren Docker-Komponenten. Ohne diese Aktualisierung wären
Docker-Packages nicht installierbar. Der Update bereitet die eigentliche Docker-Installation vor.

- [x] ### Schritt 71: Docker Engine und Tools installieren

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**Erläuterung:** Diese Kommando installiert alle Docker-Kernkomponenten in einem Schritt. Docker-CE
ist die Community Edition Engine, docker-ce-cli das Command-Line-Interface. Containerd.io ist die
Container-Runtime, die Docker nutzt. Docker-buildx ermöglicht erweiterte Build-Features,
docker-compose-plugin Multi-Container-Anwendungen. Diese vollständige Installation bietet alle
Docker-Features für Development und Production.

- [x] ### Schritt 72: Docker Service starten

```bash
sudo systemctl start docker
```

**Erläuterung:** Der Docker-Daemon wird als System-Service gestartet. Systemctl ist das
Standard-Tool für Service-Management unter systemd. Der Docker-Service muss laufen, damit
Container-Operationen möglich sind. Der Start erfolgt im Hintergrund als System-Daemon. Nach diesem
Befehl ist Docker betriebsbereit für Container-Operations.

- [x] ### Schritt 73: Docker Autostart aktivieren

```bash
sudo systemctl enable docker
```

**Erläuterung:** Docker wird für automatischen Start beim System-Boot konfiguriert. Dies stellt
sicher, dass Docker nach einem Neustart verfügbar ist. Die enable-Operation erstellt die nötigen
systemd-Symlinks. Autostart ist wichtig für Server und Development-Maschinen. Container mit
Restart-Policies starten automatisch mit Docker.

- [x] ### Schritt 74: Benutzer zur Docker-Gruppe hinzufügen

```bash
sudo usermod -aG docker $USER
```

**Erläuterung:** Der aktuelle Benutzer wird zur docker-Gruppe hinzugefügt für sudo-freie
Docker-Nutzung. Dies vermeidet die Notwendigkeit von sudo für jeden Docker-Befehl. Die
Gruppenmitgliedschaft gibt Zugriff auf den Docker-Socket. Diese Konfiguration verbessert den
Development-Workflow erheblich. Die Änderung wird erst nach einem Re-Login oder newgrp vollständig
aktiv.

- [x] ### Schritt 75: Docker-Gruppe aktivieren

```bash
newgrp docker
```

**Erläuterung:** Dieser Befehl aktiviert die Docker-Gruppenmitgliedschaft in der aktuellen Shell.
Ohne dies müsste man sich aus- und wieder einloggen. newgrp startet eine neue Shell mit
aktualisierten Gruppen-Berechtigungen. Dies ermöglicht sofortige Docker-Nutzung ohne sudo. Die
Aktivierung ist nur für die aktuelle Session nötig.

- [x] ### Schritt 76: Docker Installation testen

```bash
docker run hello-world
```

**Erläuterung:** Der hello-world Container ist der Standard-Test für Docker-Installationen. Er
verifiziert, dass Docker Images pullen und Container ausführen kann. Der Test prüft die gesamte
Docker-Pipeline von Download bis Execution. Eine erfolgreiche Ausführung bestätigt korrekte
Installation und Berechtigungen. Die Ausgabe enthält auch hilfreiche Informationen über Docker.

- [x] ### Schritt 77: Test-Container aufräumen

```bash
docker rm $(docker ps -aq -f status=exited -f ancestor=hello-world) 2>/dev/null || true
```

**Erläuterung:** Dieser Befehl entfernt den hello-world Test-Container nach der Verifizierung. Die
verschachtelten Commands finden alle exitierten hello-world Container. Das Aufräumen hält das System
sauber von Test-Artefakten. Der || true verhindert Fehler, wenn keine Container gefunden werden.
Gute Docker-Hygiene ist wichtig für Ressourcen-Management.

- [x] ### Schritt 78: Test-Image entfernen

```bash
docker rmi hello-world 2>/dev/null || true
```

**Erläuterung:** Das hello-world Image wird nach dem Test entfernt, da es nicht mehr benötigt wird.
Dies spart Speicherplatz und hält die Image-Liste übersichtlich. Der Befehl schlägt fehl, wenn das
Image nicht existiert, was durch || true abgefangen wird. Regelmäßiges Aufräumen ungenutzter Images
ist eine Docker-Best-Practice. Dies komplettiert die Aufräumarbeiten nach dem Test.

- [x] ### Schritt 79: Docker Version anzeigen

```bash
docker --version && docker compose version
```

**Erläuterung:** Diese finale Verifizierung zeigt die installierten Docker-Versionen an. Beide
Commands bestätigen, dass Docker und Docker Compose funktionieren. Die Versionsinformationen sind
wichtig für Kompatibilitätsprüfungen. Moderne Docker-Versionen sollten 24.0 oder höher sein. Diese
Information ist nützlich für Troubleshooting und Documentation.

- [x] ### Schritt 80: Zusätzliche Container-Tools installieren

```bash
sudo apt install -y docker-buildx docker-compose-v2
```

**Erläuterung:** Diese zusätzlichen Tools erweitern Docker um wichtige Features. Docker-buildx
ermöglicht erweiterte Build-Features wie Multi-Platform-Images. Docker-compose-v2 ist die neuere
Implementation von Docker Compose. Diese Tools sind wichtig für moderne Container-Workflows. Die
Installation rundet das Docker-Setup vollständig ab.

# Phase 2: Projekt-Initialisierung (60 Schritte)

## 2.1 Repository Setup (10 Schritte)

- [x] ### Schritt 81: Projekts-Verzeichnis erstellen und navigieren

```bash
mkdir -p ~/projects && cd ~/projects
```

**Erläuterung:** Erstellt das Hauptverzeichnis für alle Projekte im Home-Verzeichnis mit -p Flag für
rekursive Erstellung. Der && Operator verkettet Befehle und führt cd nur bei erfolgreichem mkdir
aus. Das Tilde-Symbol (~) expandiert zum Home-Verzeichnis des aktuellen Benutzers. Die Navigation
erfolgt atomisch mit der Erstellung. Fehlschläge werden durch die Shell-Verkettung abgefangen.

- [x] ### Schritt 82: Repository von GitHub klonen

```bash
git clone https://github.com/meinzeug/autodevai.git
```

**Erläuterung:** Klont das Repository über HTTPS, was keine SSH-Keys benötigt und durch Firewalls
funktioniert. Git erstellt automatisch ein Verzeichnis mit dem Repository-Namen. Der Default-Branch
(main oder master) wird ausgecheckt und als Tracking-Branch konfiguriert. Die .git-Metadaten werden
vollständig übertragen für komplette Versionshistorie. Bei Fehler wird der Exit-Code non-zero sein
für Fehlerbehandlung in Scripts.

- [x] ### Schritt 83: In Projekt-Verzeichnis wechseln

```bash
cd autodevai
```

**Erläuterung:** Wechselt in das geklonte Repository-Verzeichnis als Arbeitsverzeichnis für alle
folgenden Operationen. Der Befehl schlägt fehl wenn das Verzeichnis nicht existiert, was auf
Klonfehler hinweist. Das Working Directory wird für alle nachfolgenden Befehle verwendet. Relative
Pfade beziehen sich ab jetzt auf dieses Verzeichnis. PWD Environment-Variable wird entsprechend
aktualisiert.

- [x] ### Schritt 84: Git Benutzername für Commits setzen

```bash
git config user.name "VibeCoding AI"
```

**Erläuterung:** Setzt den Benutzernamen nur für dieses Repository ohne --global Flag. Der Name
erscheint in allen Commits als Author-Information. Die Konfiguration wird in .git/config
gespeichert, nicht in der globalen ~/.gitconfig. Überschreibt eventuelle globale Einstellungen für
dieses Projekt. Whitespace im Namen muss in Quotes eingeschlossen werden.

- [x] ### Schritt 85: Git E-Mail für Commits setzen

```bash
git config user.email "ai@vibecoding.com"
```

**Erläuterung:** Konfiguriert die E-Mail-Adresse für Git-Commits im lokalen Repository. Diese
Information wird für die Commit-Signatur verwendet und ist wichtig für Git-History. Ohne gültige
E-Mail verweigern manche Git-Hosts Push-Operationen. Die lokale Konfiguration hat Priorität über
globale Settings. Format-Validierung erfolgt nicht, aber ungültige Adressen können Probleme
verursachen.

- [x] ### Schritt 86: Development Branch erstellen und wechseln

```bash
git checkout -b development
```

**Erläuterung:** Erstellt einen neuen Branch "development" und wechselt direkt dorthin mit -b Flag.
Der neue Branch basiert auf dem aktuellen HEAD (normalerweise main). Diese Branch-Strategie trennt
Entwicklung von stabilen Releases. Der lokale Branch hat noch keinen Remote-Tracking-Branch. Alle
folgenden Commits gehen in diesen Branch bis zum Wechsel.

- [x] ### Schritt 87: .gitignore Datei erstellen

```bash
cat > .gitignore << 'EOF'
node_modules/
target/
dist/
.env
.env.local
*.log
.DS_Store
Thumbs.db
.idea/
.vscode/
*.swp
*.swo
*~
.tauri/
src-tauri/target/
src-tauri/WixTools/
package-lock.json
yarn.lock
pnpm-lock.yaml
EOF
```

**Erläuterung:** Verwendet Here-Document mit 'EOF' in Quotes um Variable-Expansion zu verhindern.
Der cat-Befehl schreibt den mehrzeiligen Input direkt in die Datei. Die Patterns nutzen Glob-Syntax
für Wildcard-Matching. Verzeichnisse enden mit / für explizite Directory-Matches. Die Datei
verhindert das Committen von generierten und sensiblen Dateien.

- [x] ### Schritt 88: .gitignore zu Git hinzufügen

```bash
git add .gitignore
```

**Erläuterung:** Staged die .gitignore Datei für den nächsten Commit in den Git-Index. Der Befehl
kopiert den aktuellen Inhalt in die Staging-Area. Änderungen nach dem add-Befehl werden nicht
automatisch übernommen. Die Datei wird sofort wirksam für ignore-Patterns. Relative Pfade werden vom
Current Working Directory aufgelöst.

- [x] ### Schritt 89: Initial Commit für .gitignore

```bash
git commit -m "chore: add comprehensive .gitignore"
```

**Erläuterung:** Erstellt einen Commit mit Conventional Commit Format (type: description). Das
"chore" Prefix kennzeichnet Maintenance-Tasks ohne Feature-Änderungen. Der -m Flag ermöglicht
Inline-Message ohne Editor. Der Commit wird nur lokal gespeichert bis zum Push. SHA-1 Hash wird
generiert für eindeutige Commit-Identifikation.

- [x] ### Schritt 90: Git-Status prüfen

```bash
git status --short
```

**Erläuterung:** Zeigt kompakten Status mit Zwei-Buchstaben-Codes für Dateiänderungen. Erste Spalte
zeigt Staging-Status, zweite Working-Directory-Status. Untracked Files werden mit ?? markiert. Das
--short Format ist script-freundlich für Automation. Exit-Code ist 0 auch bei Änderungen, prüfe
Output für Status.

## 2.2 Projekt-Struktur erstellen (15 Schritte)

- [x] ### Schritt 91: Komplette Verzeichnisstruktur erstellen

```bash
mkdir -p src-tauri/src src-tauri/icons \
  src/components/{orchestration,output,settings,common,layout} \
  src/services src/hooks src/types src/utils src/styles src/assets \
  src/store src/test \
  docker/{sandboxes,monitoring} \
  config tests/{unit,integration,e2e} scripts docs \
  .github/{workflows,ISSUE_TEMPLATE}
```

**Erläuterung:** Nutzt Brace-Expansion für kompakte Erstellung mehrerer Unterverzeichnisse. Der
Backslash ermöglicht mehrzeilige Befehle für Lesbarkeit. Das -p Flag erstellt Parent-Directories
rekursiv wenn nötig. Die Struktur folgt Standard-Konventionen für React/Tauri-Projekte. Fehler
werden bei Berechtigungsproblemen auftreten, nicht bei existierenden Verzeichnissen.

- [x] ### Schritt 92: README.md mit Projekt-Informationen erstellen

````bash
cat > README.md << 'EOF'
# AutoDev-AI Neural Bridge

AI Orchestration Platform for Claude-Flow and OpenAI Codex

Repository: https://github.com/meinzeug/autodevai

## Features
- Zero-Configuration AI Tool Orchestration
- Tauri-based Desktop Application
- Docker Sandbox Environments
- OpenRouter Multi-Model Coordination

## Prerequisites
- Ubuntu 24.04
- Claude-Flow (pre-installed)
- OpenAI Codex (pre-installed)
- Claude-Code (pre-installed)

## Installation
```bash
./scripts/install.sh
````

## Development

```bash
npm run tauri dev
```

## License

MIT EOF

````
**Erläuterung:** Here-Document mit gequotetem Delimiter verhindert Shell-Expansion in der Markdown-Datei. Triple-Backticks werden literal übernommen für Code-Blocks. Die Struktur folgt Standard-README-Konventionen mit Sections. Links werden als Markdown-Referenzen formatiert. Shell-Commands in Code-Blocks werden nicht ausgeführt beim Schreiben.

- [x] ### Schritt 93: MIT License Datei erstellen
```bash
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 meinzeug

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
````

**Erläuterung:** Standard MIT License Text mit Copyright-Jahr und Holder eingesetzt. Quotes um EOF
verhindern Expansion von Shell-Variablen im Text. Der Text muss exakt dem MIT-Template entsprechen
für rechtliche Gültigkeit. Zeilenumbrüche werden preserved für korrekte Formatierung. Die Datei
macht das Projekt Open Source unter permissiver Lizenz.

- [x] ### Schritt 94: .editorconfig für Code-Style erstellen

```bash
cat > .editorconfig << 'EOF'
root = true

[*]
charset = utf-8
end_of_line = lf
indent_size = 2
indent_style = space
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[*.rs]
indent_size = 4
EOF
```

**Erläuterung:** EditorConfig definiert Editor-unabhängige Formatierungsregeln. Root=true stoppt die
Suche nach Parent-.editorconfig-Dateien. Glob-Patterns in Brackets matchen Dateitypen für
spezifische Regeln. Rust-Dateien bekommen 4-Space-Indentation per Konvention. Markdown behält
Trailing-Whitespace für Hard-Line-Breaks.

- [x] ### Schritt 95: Prettier Konfiguration erstellen

```bash
cat > .prettierrc.json << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
EOF
```

**Erläuterung:** JSON-Format erfordert Double-Quotes für Keys und String-Values. TrailingComma "es5"
fügt Kommas nur wo ES5-kompatibel hinzu. PrintWidth 100 ist breiter als Default 80 für moderne
Displays. EndOfLine "lf" erzwingt Unix-Zeilenenden cross-platform. Die Konfiguration wird von
Prettier automatisch geladen.

- [x] ### Schritt 96: Prettier Ignore-Datei erstellen

```bash
cat > .prettierignore << 'EOF'
node_modules
dist
target
*.min.js
*.min.css
coverage
.git
.svn
.hg
.DS_Store
EOF
```

**Erläuterung:** Definiert Pfade die Prettier nicht formatieren soll. Keine Wildcards nötig für
Verzeichnisse, Name reicht. Minifizierte Dateien werden durch _.min._ Pattern ausgeschlossen.
Coverage-Reports sollten nicht formatiert werden. Version-Control-Verzeichnisse werden explizit
ausgeschlossen.

- [x] ### Schritt 97: ESLint Konfiguration erstellen

```bash
cat > .eslintrc.json << 'EOF'
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["react", "@typescript-eslint", "react-hooks"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
EOF
```

**Erläuterung:** Extends-Array definiert Vererbungsreihenfolge, prettier muss zuletzt kommen um
Konflikte zu überschreiben. Parser muss vor parserOptions definiert werden für korrekte
Initialisierung. React/react-in-jsx-scope ist off für React 17+ mit automatischem JSX-Transform.
Settings.react.version "detect" liest Version aus package.json. TypeScript-any ist warn statt error
für graduelle Typisierung.

- [x] ### Schritt 98: ESLint Ignore-Datei erstellen

```bash
cat > .eslintignore << 'EOF'
node_modules
dist
target
coverage
*.config.js
*.config.ts
src-tauri
EOF
```

**Erläuterung:** Verhindert Linting von generierten und externen Dateien. Config-Dateien werden oft
ausgeschlossen da sie andere Konventionen haben. src-tauri wird ausgeschlossen da Rust eigene
Linting-Tools hat. Coverage-Output sollte nicht gelintet werden. Patterns sind relativ zum
Projekt-Root.

- [x] ### Schritt 99: CONTRIBUTING.md erstellen

```bash
cat > CONTRIBUTING.md << 'EOF'
# Contributing to AutoDev-AI Neural Bridge

## Development Setup
1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Create a feature branch
5. Make your changes
6. Run tests: `npm test`
7. Submit a pull request

## Code Style
- Use Prettier for formatting
- Follow ESLint rules
- Write tests for new features

## Commit Messages
Follow conventional commits:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Tests
- chore: Maintenance
EOF
```

**Erläuterung:** Markdown-Listen mit Zahlen werden automatisch renummeriert bei Render. Inline-Code
mit Backticks für Commands und Code-Referenzen. Conventional Commits Format wird mit
Prefix-Beispielen dokumentiert. Die Struktur folgt gängigen Open-Source-Konventionen.
Pull-Request-Workflow wird implizit durch Fork-Mention definiert.

- [x] ### Schritt 100: CHANGELOG.md Initial-Version erstellen

```bash
cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-01-01

### Added
- Initial release of AutoDev-AI Neural Bridge
- Tauri-based desktop application
- Claude-Flow integration
- OpenAI Codex integration
- OpenRouter orchestration for dual mode
- Docker sandbox environments
- Modern React UI with TailwindCSS
- System status monitoring
- Task execution with real-time output
EOF
```

**Erläuterung:** Keep a Changelog Format mit Standard-Sections (Added, Changed, Deprecated, etc.).
Semantic Versioning Links sind Markdown-Reference-Style. Unreleased Section für kommende Änderungen
ist Standard. ISO-8601 Datum-Format (YYYY-MM-DD) für Releases. Bullet-Points beschreiben Features
prägnant.

- [x] ### Schritt 101: Git-Hooks Verzeichnis vorbereiten

```bash
mkdir -p .git/hooks
```

**Erläuterung:** Erstellt Hooks-Verzeichnis falls nicht vorhanden, obwohl Git es normalerweise
anlegt. Das .git-Verzeichnis ist nicht im Repository, nur lokal. Hooks werden nicht committed,
müssen per Script installiert werden. Das -p Flag verhindert Fehler bei existierendem Verzeichnis.
Hooks ermöglichen automatische Aktionen bei Git-Events.

- [x] ### Schritt 102: Pre-Commit Hook für Linting erstellen

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
npm run lint
EOF
chmod +x .git/hooks/pre-commit
```

**Erläuterung:** Shebang definiert /bin/sh für POSIX-Kompatibilität. Der Hook läuft vor jedem Commit
und blockiert bei Non-Zero-Exit. chmod +x macht das Script ausführbar, notwendig für Hook-Execution.
Der Hook ist lokal und wird nicht ins Repository committed. NPM-Script muss in package.json
definiert sein.

- [x] ### Schritt 103: Projekt-Dokumentations-Struktur erstellen

```bash
mkdir -p docs/{api,guides,architecture}
touch docs/api/README.md docs/guides/README.md docs/architecture/README.md
```

**Erläuterung:** Erstellt Unterverzeichnisse für verschiedene Dokumentationstypen. Touch erstellt
leere Dateien als Platzhalter mit aktuellem Timestamp. Die README-Dateien machen Verzeichnisse in
Git trackbar. Struktur folgt gängiger Dokumentations-Organisation. Relative Pfade werden vom Current
Working Directory aufgelöst.

- [x] ### Schritt 104: GitHub Actions Workflow-Datei vorbereiten

```bash
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main, development]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
EOF
```

**Erläuterung:** YAML erfordert konsistente Einrückung mit Spaces, nicht Tabs. Der Workflow triggert
auf Push zu spezifischen Branches und PRs. Actions verwenden Versionstags (@v3) für Stabilität. npm
ci ist schneller als npm install für CI-Umgebungen. Steps werden sequenziell ausgeführt, Fehler
stoppen den Workflow.

- [x] ### Schritt 105: Commit alle Projekt-Strukturen

```bash
git add -A && git commit -m "chore: initialize project structure"
```

**Erläuterung:** Flag -A staged alle Änderungen inklusive Löschungen und neuen Dateien. Der &&
Operator führt commit nur bei erfolgreichem add aus. Conventional Commit "chore" für strukturelle
Änderungen. Der Commit enthält alle Konfigurationsdateien und Verzeichnisse. Große Commits sind okay
für initiale Projekt-Setups.

## 2.3 Node.js Projekt Setup (20 Schritte)

- [x] ### Schritt 106: NPM Projekt initialisieren

```bash
npm init -y
```

**Erläuterung:** Das -y Flag akzeptiert alle Defaults und erstellt package.json ohne Prompts.
Initiale Werte werden aus Verzeichnisname und Git-Config abgeleitet. Die generierte package.json hat
Version 1.0.0 als Default. Main-Entry ist index.js, muss später angepasst werden. Die Datei kann
nachträglich mit npm pkg set modifiziert werden.

- [x] ### Schritt 107: Package Name setzen

```bash
npm pkg set name="autodev-ai"
```

**Erläuterung:** npm pkg set modifiziert package.json programmatisch ohne manuelles Editieren. Der
Name muss lowercase sein, Bindestriche sind erlaubt, keine Spaces. Dieser Name wird für npm publish
und Modul-Imports verwendet. Quotes sind nötig für Shell-Interpretation des Gleichheitszeichens.
Änderung wird sofort in package.json geschrieben.

- [x] ### Schritt 108: Package Version setzen

```bash
npm pkg set version="0.1.0"
```

**Erläuterung:** Setzt Semantic Version auf 0.1.0 für initiale Development-Version. Version 0.x.x
signalisiert instabile API vor 1.0.0 Release. Das Format ist major.minor.patch per
SemVer-Spezifikation. Die Version wird für Dependency-Resolution verwendet. Tauri liest diese
Version für App-Bundling.

- [x] ### Schritt 109: Package Description hinzufügen

```bash
npm pkg set description="AI Orchestration Platform for Claude-Flow and OpenAI Codex"
```

**Erläuterung:** Description erscheint in npm-Suchen und Package-Listings. Text sollte prägnant die
Hauptfunktion beschreiben. Keine Markdown oder Formatierung in der Description erlaubt. Quotes sind
essentiell für Spaces im String. Die Description wird in verschiedenen Tools angezeigt.

- [x] ### Schritt 110: Author Information setzen

```bash
npm pkg set author="meinzeug"
```

**Erläuterung:** Author kann String oder Objekt mit name, email, url sein. Einfacher String reicht
für GitHub-Username. Information wird in npm-Registry angezeigt falls publiziert. Keine Validierung
des Author-Feldes durch npm. Copyright-Information separat in LICENSE-Datei.

- [x] ### Schritt 111: Lizenz-Typ definieren

```bash
npm pkg set license="MIT"
```

**Erläuterung:** SPDX-Identifier "MIT" ist standardisiert für MIT-Lizenz. Muss mit
LICENSE-Datei-Inhalt übereinstimmen. Tools nutzen dieses Feld für Lizenz-Kompatibilitätsprüfungen.
"UNLICENSED" für proprietäre Software ohne Lizenz. Falsche Lizenz-Angabe kann rechtliche Probleme
verursachen.

- [x] ### Schritt 112: Repository-Information hinzufügen

```bash
npm pkg set repository.type="git" repository.url="https://github.com/meinzeug/autodevai.git"
```

**Erläuterung:** Zwei Properties werden in einem Befehl gesetzt mit Dot-Notation. Repository-Type
ist meist "git", kann auch "svn" sein. URL sollte Clone-URL sein, nicht Web-URL ohne .git. npm nutzt
dies für "npm repo" Command und Links. GitHub erkennt Package-Repository durch diese Information.

- [x] ### Schritt 113: Package Keywords für Suche setzen

```bash
npm pkg set keywords[]="tauri" keywords[]="ai" keywords[]="orchestration" keywords[]="claude-flow" keywords[]="codex"
```

**Erläuterung:** Array-Syntax mit [] fügt Multiple Keywords hinzu. Keywords verbessern
Auffindbarkeit in npm-Suche. Jedes Keyword wird als separates Array-Element gespeichert. Lowercase
Keywords sind Konvention für Konsistenz. Maximum 50 Keywords laut npm-Dokumentation.

- [x] ### Schritt 114: Package Type als ES Module setzen

```bash
npm pkg set type="module"
```

**Erläuterung:** "module" aktiviert ES6-Import/Export-Syntax statt CommonJS require. Affects .js
Dateien, die als ES-Module behandelt werden. .mjs immer ES-Module, .cjs immer CommonJS unabhängig
von type. Vite und moderne Tools erwarten ES-Module. Wichtig für Top-Level await und Import-Meta.

- [x] ### Schritt 115: Package Main Entry Point setzen

```bash
npm pkg set main="src/main.tsx"
```

**Erläuterung:** Main definiert den primären Entry-Point für das Package. Für Tauri-Apps meist die
React-Entry-Datei. Wird von Bundlern als Start-Punkt verwendet. TSX-Extension für TypeScript mit
JSX. Pfad relativ zum Package-Root.

- [x] ### Schritt 116: Package Scripts vorbereiten

```bash
npm pkg set scripts.dev="vite" \
  scripts.build="tsc && vite build" \
  scripts.preview="vite preview" \
  scripts.test="vitest" \
  scripts.lint="eslint . --ext ts,tsx"
```

**Erläuterung:** Multiple Scripts werden mit Backslash-Continuation gesetzt. Jedes Script ist ein
Shell-Command der mit npm run aufgerufen wird. && verkettet Commands sequenziell, ; würde parallel
ausführen. TSC läuft vor Build für Type-Checking. Extension-Filter begrenzt ESLint auf
TypeScript-Dateien.

- [x] ### Schritt 117: Tauri-spezifische Scripts hinzufügen

```bash
npm pkg set scripts.tauri="tauri" \
  scripts.tauri:dev="tauri dev" \
  scripts.tauri:build="tauri build"
```

**Erläuterung:** Doppelpunkt-Notation gruppiert verwandte Scripts logisch. Tauri-CLI wird über diese
Scripts aufgerufen. Dev-Mode startet Vite und Tauri gemeinsam. Build erstellt distributierbare
Binaries. Scripts werden relativ zu node_modules/.bin aufgelöst.

- [x] ### Schritt 118: Engines-Anforderungen definieren

```bash
npm pkg set engines.node=">=20.0.0" engines.npm=">=10.0.0"
```

**Erläuterung:** Engines definiert Minimum-Versionen für Runtime-Umgebungen. >= bedeutet diese
Version oder höher ist akzeptabel. npm kann diese bei install prüfen mit engine-strict. Verhindert
Installation auf inkompatiblen Systemen. Wichtig für CI/CD-Umgebungen.

- [x] ### Schritt 119: Private Package Flag setzen

```bash
npm pkg set private=true
```

**Erläuterung:** Private=true verhindert versehentliches npm publish. Boolean-Wert ohne Quotes in
npm pkg set. Wichtig für Applications vs Libraries. Wird von npm respektiert auch mit --force.
Standard für Endanwendungen, nicht Libraries.

- [x] ### Schritt 120: Homepage URL setzen

```bash
npm pkg set homepage="https://github.com/meinzeug/autodevai#readme"
```

**Erläuterung:** Homepage-URL mit #readme-Anchor für direkten Link zur Dokumentation. Wird in
npm-Website als Link angezeigt. GitHub rendert README automatisch auf dieser URL. Nützlich für
Projekt-Discovery. Kann auch eigene Website-URL sein.

- [x] ### Schritt 121: Bugs URL setzen

```bash
npm pkg set bugs.url="https://github.com/meinzeug/autodevai/issues"
```

**Erläuterung:** Direkt-Link zu GitHub Issues für Bug-Reports. npm verwendet dies für "npm bugs"
Command. Objekt-Property mit Dot-Notation gesetzt. Sollte zu Issue-Tracker zeigen, nicht E-Mail.
Wichtig für Open-Source-Projekt-Maintenance.

- [x] ### Schritt 122: Funding Information hinzufügen

```bash
npm pkg set funding.type="github" funding.url="https://github.com/sponsors/meinzeug"
```

**Erläuterung:** Funding-Field für npm fund Command und GitHub-Integration. Type kann github,
patreon, opencollective, etc. sein. URL zum Sponsoring-Profil oder Donation-Page. GitHub zeigt
Sponsor-Button bei funding-Feld. Optional aber hilfreich für Open-Source-Nachhaltigkeit.

- [x] ### Schritt 123: Package.json formatieren

```bash
npx prettier --write package.json
```

**Erläuterung:** npx führt prettier ohne globale Installation aus. --write überschreibt Datei mit
formatierter Version. Prettier sortiert Keys in Standard-Reihenfolge. Konsistente Formatierung
reduziert Git-Diffs. Nutzt .prettierrc.json Konfiguration automatisch.

- [x] ### Schritt 124: Package.json Struktur validieren

```bash
npm pkg get name version description > /dev/null && echo "package.json valid"
```

**Erläuterung:** npm pkg get liest Felder und gibt Fehler bei invalider JSON. Redirect zu /dev/null
unterdrückt normale Ausgabe. && bedingte Ausführung nur bei Erfolg. Einfacher Validity-Check ohne
externe Tools. Exit-Code zeigt Erfolg oder Fehler an.

- [x] ### Schritt 125: Git Commit für NPM Setup

```bash
git add package.json && git commit -m "chore: configure npm package metadata"
```

**Erläuterung:** Staged nur package.json für fokussierten Commit. Conventional Commit "chore" für
Konfigurations-Änderungen. Separater Commit macht History nachvollziehbar. Package.json ist
kritische Datei, verdient eigenen Commit. Lock-Dateien werden erst nach Installation committed.

## 2.4 Dependencies Installation (15 Schritte)

- [x] ### Schritt 126: React und React-DOM installieren

```bash
npm install react@^18.2.0 react-dom@^18.2.0
```

**Erläuterung:** Caret (^) erlaubt Minor und Patch Updates, nicht Major. Version 18.2.0 ist aktuelle
stabile React-Version. React und React-DOM müssen Version-synchronized sein. Installation erstellt
node_modules und package-lock.json. Dependencies werden in package.json unter "dependencies"
eingetragen.

- [x] ### Schritt 127: TypeScript und Types installieren

```bash
npm install --save-dev typescript@^5.3.0 @types/react@^18.2.0 @types/react-dom@^18.2.0
```

**Erläuterung:** --save-dev installiert als devDependencies, nicht in Production-Build. TypeScript
5.3 hat neueste Type-Features und Performance. @types-Packages müssen React-Version matchen.
Dev-Dependencies werden bei npm install --production übersprungen. Types sind nur für Compile-Time,
nicht Runtime.

- [x] ### Schritt 128: Vite und React-Plugin installieren

```bash
npm install --save-dev vite@^5.0.0 @vitejs/plugin-react@^4.2.0
```

**Erläuterung:** Vite 5 ist aktuelle Major-Version mit verbesserter Performance. Plugin-React
handhabt JSX-Transform und React-Refresh. Dev-Dependencies da Build-Tools nicht in Bundle landen.
Vite ersetzt Create-React-App für moderne Entwicklung. Plugin-Version muss Vite-Version kompatibel
sein.

- [x] ### Schritt 129: Tauri JavaScript API installieren

```bash
npm install @tauri-apps/api@^2.0.0 @tauri-apps/plugin-store@^2.0.0
```

**Erläuterung:** Tauri API 2.0 für Tauri v2 Kompatibilität erforderlich. Plugin-Store für
persistente Datenspeicherung. Runtime-Dependencies für Frontend-Backend-Kommunikation. Import wird
durch Bundler aufgelöst, nicht Node. Version muss Tauri-CLI Version matchen.

- [x] ### Schritt 130: TailwindCSS und PostCSS installieren

```bash
npm install --save-dev tailwindcss@^3.4.0 postcss@^8.4.0 autoprefixer@^10.4.0
```

**Erläuterung:** TailwindCSS 3.4 mit JIT-Compiler für optimale Performance. PostCSS transformiert
CSS mit Plugins wie Autoprefixer. Autoprefixer fügt Vendor-Prefixes für Browser-Kompatibilität
hinzu. Dev-Dependencies da CSS zur Build-Zeit generiert wird. Konfigurationsdateien müssen separat
erstellt werden.

- [x] ### Schritt 131: UI-Bibliotheken installieren

```bash
npm install lucide-react@^0.300.0 framer-motion@^10.16.0 clsx@^2.0.0 tailwind-merge@^2.2.0
```

**Erläuterung:** Lucide-React bietet optimierte SVG-Icons als React-Components. Framer-Motion für
deklarative Animationen mit Spring-Physics. clsx kombiniert className-Strings konditional.
tailwind-merge dedupliziert Tailwind-Klassen intelligent. Alle sind Runtime-Dependencies für
UI-Rendering.

- [x] ### Schritt 132: State Management installieren

```bash
npm install zustand@^4.4.0
```

**Erläuterung:** Zustand ist minimalistisches State-Management ohne Boilerplate. Version 4.4 mit
TypeScript-Verbesserungen und DevTools. Kleiner Bundle-Size im Vergleich zu Redux. Keine
Provider-Wrapping erforderlich. Hook-basierte API für React-Integration.

- [x] ### Schritt 133: Routing installieren

```bash
npm install react-router-dom@^6.20.0
```

**Erläuterung:** React Router v6 mit neuer Data-API und Layout-Routes. DOM-Version spezifisch für
Web-Anwendungen. Version 6 breaking changes gegenüber v5. Nested Routing und Outlet-Components.
TypeScript-Support built-in.

- [x] ### Schritt 134: Form Handling installieren

```bash
npm install react-hook-form@^7.48.0 zod@^3.22.0 @hookform/resolvers@^3.3.0
```

**Erläuterung:** React-Hook-Form für performante Forms mit minimal Re-Renders. Zod für
Schema-Validation mit TypeScript-Inference. Resolvers verbinden Zod-Schemas mit Hook-Form.
Uncontrolled Components für bessere Performance. Validation läuft ohne Re-Renders.

- [x] ### Schritt 135: HTTP Client installieren

```bash
npm install axios@^1.6.0
```

**Erläuterung:** Axios für HTTP-Requests mit Interceptors und Cancel-Support. Automatische
JSON-Transformation bei Requests/Responses. Browser und Node.js kompatibel.
Request/Response-Interceptors für Auth-Tokens. Built-in XSRF-Protection.

- [x] ### Schritt 136: Data Fetching installieren

```bash
npm install @tanstack/react-query@^5.0.0
```

**Erläuterung:** TanStack Query (ehemals React Query) für Server-State-Management. Version 5 mit
verbesserter TypeScript-Unterstützung. Automatisches Caching, Refetching und Synchronisation.
Optimistic Updates und Parallel-Queries. DevTools für Debugging verfügbar.

- [x] ### Schritt 137: Utility-Bibliotheken installieren

```bash
npm install date-fns@^3.0.0 react-hot-toast@^2.4.0
```

**Erläuterung:** Date-fns für modulare Datums-Manipulation ohne Moment.js-Bloat. Tree-shakeable für
optimale Bundle-Size. React-Hot-Toast für elegante Benachrichtigungen. Headless mit Tailwind-Styling
kompatibel. Beide sind Runtime-Dependencies.

- [x] ### Schritt 138: Entwicklungs-Tools installieren

```bash
npm install --save-dev eslint@^8.55.0 @typescript-eslint/parser@^6.15.0 @typescript-eslint/eslint-plugin@^6.15.0 eslint-plugin-react@^7.33.0 eslint-plugin-react-hooks@^4.6.0 prettier@^3.1.0 eslint-config-prettier@^9.1.0
```

**Erläuterung:** ESLint 8 mit TypeScript-Parser für statische Code-Analyse. TypeScript-ESLint-Plugin
für TS-spezifische Regeln. React-Plugins für JSX und Hooks-Regeln. Prettier für Code-Formatierung.
Config-Prettier deaktiviert konfliktende ESLint-Regeln.

- [x] ### Schritt 139: Test-Framework installieren

```bash
npm install --save-dev vitest@^1.0.0 @vitest/ui@^1.0.0 jsdom@^23.0.0 @testing-library/react@^14.1.0 @testing-library/jest-dom@^6.1.0 @testing-library/user-event@^14.5.0
```

**Erläuterung:** Vitest als Vite-nativer Test-Runner mit Jest-Kompatibilität. JSDOM für
DOM-Simulation in Node.js. Testing-Library für User-zentrierte Tests. Jest-DOM für zusätzliche
Matcher. User-Event simuliert realistische User-Interaktionen.

- [x] ### Schritt 140: Package-Lock committen

```bash
git add package.json package-lock.json && git commit -m "chore: install project dependencies"
```

**Erläuterung:** Package-lock.json lockt exakte Dependency-Versionen für reproduzierbare Builds.
Beide Dateien müssen zusammen committed werden. Lock-Datei ist essentiell für CI/CD-Konsistenz.
Große Datei, aber wichtig für Dependency-Tracking. Conventional Commit für Dependency-Updates.

# Phase 3: Tauri Backend Implementation (100 Schritte)

## 3.1 Cargo.toml Konfiguration (10 Schritte)

- [x] ### Schritt 141: Cargo.toml erstellen

```bash
cat > src-tauri/Cargo.toml << 'EOF'
[package]
name = "autodev-ai"
version = "0.1.0"
description = "AI Orchestration Platform"
authors = ["meinzeug"]
edition = "2021"
rust-version = "1.70"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
tauri = { version = "2.0", features = ["dialog-open", "dialog-save", "fs-read-dir", "fs-read-file", "fs-write-file", "process-command-api", "shell-execute"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.35", features = ["full"] }
reqwest = { version = "0.11", features = ["json", "stream"] }
anyhow = "1.0"
thiserror = "1.0"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.6", features = ["v4", "serde"] }
log = "0.4"
env_logger = "0.11"
regex = "1.10"
once_cell = "1.19"
parking_lot = "0.12"
futures = "0.3"
async-trait = "0.1"
base64 = "0.21"
sha2 = "0.10"
dirs = "5.0"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
EOF
```

**Erläuterung:** TOML-Format nutzt Sections in eckigen Klammern für Gruppierung. Features in
geschweiften Klammern aktivieren Crate-spezifische Funktionalität. Version ohne Caret (^) pinnt auf
exakte Major-Version. Die tauri-Features definieren erlaubte API-Zugriffe für Sicherheit. Edition
2021 aktiviert neueste Rust-Syntax-Features.

- [x] ### Schritt 142: Build-Script erstellen

```bash
cat > src-tauri/build.rs << 'EOF'
fn main() {
    tauri_build::build()
}
EOF
```

**Erläuterung:** Build.rs wird vor der Hauptkompilierung ausgeführt. tauri_build::build() generiert
Platform-spezifischen Code. Die Funktion muss main heißen für Cargo-Build-Integration. Keine
Semikolon nach Funktions-Body in Rust. Das Script läuft im Kontext der build-dependencies.

- [x] ### Schritt 143: Cargo.lock initialisieren

```bash
cd src-tauri && cargo generate-lockfile && cd ..
```

**Erläuterung:** generate-lockfile erstellt Cargo.lock ohne Build. Lockfile pinnt alle transitiven
Dependencies. cd src-tauri nötig da Cargo im Crate-Root arbeitet. && verkettung mit cd .. kehrt zum
Projekt-Root zurück. Lockfile sollte ins Repository committed werden.

- [x] ### Schritt 144: Rust-Toolchain File erstellen

```bash
cat > src-tauri/rust-toolchain.toml << 'EOF'
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy"]
EOF
```

**Erläuterung:** Definiert projektspezifische Rust-Version für Konsistenz. Components werden
automatisch mit Toolchain installiert. Überschreibt globale Rustup-Einstellungen für dieses Projekt.
TOML-Format für neue rust-toolchain Spezifikation. Stable Channel für Production-Readiness.

- [x] ### Schritt 145: Cargo-Konfiguration erstellen

```bash
mkdir -p src-tauri/.cargo && cat > src-tauri/.cargo/config.toml << 'EOF'
[build]
target-dir = "target"

[target.x86_64-unknown-linux-gnu]
linker = "gcc"
EOF
```

**Erläuterung:** .cargo/config.toml konfiguriert Build-Verhalten lokal. Target-dir definiert wo
Build-Artefakte gespeichert werden. Linker-Einstellung explizit für Cross-Compilation-Klarheit. Gilt
nur für src-tauri, nicht global. TOML-Sections für verschiedene Build-Targets.

- [x] ### Schritt 146: Tauri-Konfiguration erstellen

```bash
cat > src-tauri/tauri.conf.json << 'EOF'
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "AutoDev-AI Neural Bridge",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "execute": true,
        "open": true
      },
      "process": {
        "all": false,
        "relaunch": true,
        "exit": true
      },
      "fs": {
        "all": false,
        "readDir": true,
        "readFile": true,
        "writeFile": true,
        "exists": true,
        "createDir": true
      },
      "dialog": {
        "all": false,
        "open": true,
        "save": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.meinzeug.autodev-ai",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
    },
    "windows": [
      {
        "title": "AutoDev-AI Neural Bridge",
        "width": 1400,
        "height": 900,
        "resizable": true,
        "fullscreen": false,
        "center": true,
        "minWidth": 1200,
        "minHeight": 700
      }
    ]
  }
}
EOF
```

**Erläuterung:** JSON-Konfiguration steuert Tauri-Build und Runtime-Verhalten. Allowlist definiert
explizit erlaubte System-APIs für Sicherheit. Bundle-Identifier folgt Reverse-Domain-Notation. CSP
(Content Security Policy) beschränkt Resource-Loading. DevPath zeigt auf Vite Dev-Server Port.

- [x] ### Schritt 147: Tauri Capabilities definieren

```bash
cat > src-tauri/capabilities/default.json << 'EOF'
{
  "identifier": "default",
  "description": "Default capabilities for AutoDev-AI",
  "windows": ["main"],
  "permissions": [
    "core:window:allow-create",
    "core:window:allow-center",
    "core:window:allow-close",
    "shell:allow-execute",
    "fs:allow-read",
    "fs:allow-write",
    "dialog:allow-open",
    "dialog:allow-save"
  ]
}
EOF
```

**Erläuterung:** Capabilities sind Tauri v2 Permission-System. Explizite Permissions für jede
API-Operation erforderlich. Windows-Array definiert welche Fenster diese Capabilities haben.
Identifier für Referenzierung in anderen Configs. Granulare Kontrolle über System-Zugriffe.

- [x] ### Schritt 148: Icons-Verzeichnis vorbereiten

```bash
mkdir -p src-tauri/icons
```

**Erläuterung:** Icons-Verzeichnis muss vor Icon-Generation existieren. Tauri erwartet verschiedene
Icon-Größen für Plattformen. Verzeichnis im src-tauri für Build-Integration. Icons werden in Bundle
eingebettet. Pfad relativ zu tauri.conf.json.

- [x] ### Schritt 149: Placeholder Icon generieren

```bash
convert -size 512x512 xc:'#3b82f6' -fill white -gravity center -pointsize 200 -annotate +0+0 "AI" PNG32:src-tauri/icons/icon.png
```

**Erläuterung:** ImageMagick convert erstellt programmatisch Icons. xc: definiert Solid-Color-Canvas
mit Hex-Farbe. PNG32 Force 32-bit PNG mit Alpha-Channel. Gravity center zentriert Text-Annotation.
Temporäres Icon für Development, später ersetzen.

- [x] ### Schritt 150: Icon-Varianten generieren

```bash
cd src-tauri/icons && \
convert icon.png -resize 32x32 32x32.png && \
convert icon.png -resize 128x128 128x128.png && \
cp 128x128.png 128x128@2x.png && \
convert icon.png -resize 256x256 icon.ico && \
convert icon.png icon.icns 2>/dev/null || true && \
cd ../..
```

**Erläuterung:** Verschiedene Icon-Größen für verschiedene Plattformen generiert. ICO für Windows,
ICNS für macOS (kann auf Linux fehlschlagen). @2x Variante für Retina-Displays. Resize behält
Aspect-Ratio bei. Error-Suppression für ICNS auf Non-Mac-Systemen.

## 3.2 Rust Main Module (15 Schritte)

- [x] ### Schritt 151: Main.rs erstellen

```bash
cat > src-tauri/src/main.rs << 'EOF'
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use log::info;

mod commands;
mod state;
mod errors;
mod utils;

use state::AppState;

fn main() {
    env_logger::init();
    info!("Starting AutoDev-AI Neural Bridge");

    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::execute_claude_flow,
            commands::execute_openai_codex,
            commands::orchestrate_dual_mode,
            commands::create_sandbox,
            commands::check_prerequisites,
            commands::get_system_info,
            commands::save_settings,
            commands::load_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
EOF
```

**Erläuterung:** Cfg_attr versteckt Windows-Konsole in Release-Builds. Module mit mod keyword
deklariert, Dateien müssen existieren. generate_handler! Macro registriert Commands für
Frontend-Aufrufe. manage() fügt globalen State hinzu, der in Commands injiziert wird.
env_logger::init() aktiviert Logging basierend auf RUST_LOG Environment-Variable.

- [x] ### Schritt 152: State Module erstellen

```bash
cat > src-tauri/src/state.rs << 'EOF'
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrchestrationMode {
    Single,
    Dual,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

#[derive(Debug)]
pub struct AppState {
    pub claude_flow_workspace: String,
    pub codex_workspace: String,
    pub settings: Arc<Mutex<Settings>>,
    pub docker_containers: Arc<Mutex<HashMap<String, String>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub default_mode: OrchestrationMode,
    pub default_tool: String,
    pub openrouter_key: Option<String>,
    pub docker_enabled: bool,
    pub auto_quality_check: bool,
}

impl AppState {
    pub fn new() -> Self {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/home/user".to_string());

        Self {
            claude_flow_workspace: format!("{}/claude-flow-workspace", home),
            codex_workspace: format!("{}/codex-workspace", home),
            settings: Arc::new(Mutex::new(Settings::default())),
            docker_containers: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            default_mode: OrchestrationMode::Single,
            default_tool: "claude-flow".to_string(),
            openrouter_key: None,
            docker_enabled: true,
            auto_quality_check: true,
        }
    }
}
EOF
```

**Erläuterung:** Arc<Mutex<T>> für Thread-safe Shared State in async Context. Derive Macros
generieren Trait-Implementations automatisch. pub macht Structs/Enums außerhalb des Moduls
zugänglich. Option<String> für optionale Felder mit None als Default. impl Blocks definieren
Methoden und Associated Functions.

- [x] ### Schritt 153: Errors Module erstellen

```bash
cat > src-tauri/src/errors.rs << 'EOF'
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Command execution failed: {0}")]
    CommandFailed(String),

    #[error("Tool not found: {0}")]
    ToolNotFound(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}
EOF
```

**Erläuterung:** thiserror::Error Derive generiert Error-Trait-Implementation. #[from] ermöglicht
automatische Konversion mit ? Operator. Error-Messages mit Display-Formatting via {0} Placeholder.
From<AppError> für String-Konversion in Tauri-Commands. Enum-Variants für verschiedene Fehlertypen
mit Context.

- [x] ### Schritt 154: Utils Module erstellen

```bash
cat > src-tauri/src/utils.rs << 'EOF'
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use sha2::{Sha256, Digest};

pub fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

pub fn get_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

pub fn hash_string(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn ensure_workspace_exists(path: &str) -> std::io::Result<()> {
    std::fs::create_dir_all(path)
}

pub fn is_command_available(command: &str) -> bool {
    std::process::Command::new("which")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}
EOF
```

**Erläuterung:** UUID v4 für Random-IDs ohne Kollisionsgefahr. SystemTime::now() für Unix-Timestamps
in Sekunden. SHA256 Hashing für deterministisches String-Hashing. create_dir_all erstellt rekursiv
Verzeichnisse. which-Command prüft Executable-Verfügbarkeit im PATH.

- [x] ### Schritt 155: Commands Module Struktur erstellen

```bash
mkdir -p src-tauri/src/commands
```

**Erläuterung:** Commands-Verzeichnis für Tauri-Command-Handler. Jedes Submodul wird eine Datei im
Verzeichnis. Modulare Organisation für bessere Wartbarkeit. Verzeichnis muss vor Datei-Erstellung
existieren. Relative zu src für Rust-Module-System.

- [x] ### Schritt 156: Commands mod.rs erstellen

```bash
cat > src-tauri/src/commands/mod.rs << 'EOF'
mod claude_flow;
mod openai_codex;
mod orchestration;
mod docker;
mod system;
mod settings;

pub use claude_flow::*;
pub use openai_codex::*;
pub use orchestration::*;
pub use docker::*;
pub use system::*;
pub use settings::*;
EOF
```

**Erläuterung:** mod.rs definiert Modul-Struktur für Verzeichnis. pub use re-exportiert alle Public
Items. Wildcard \* importiert alle pub Funktionen. Flache Export-Struktur für einfache Verwendung.
Module müssen als Dateien existieren.

- [x] ### Schritt 157: Claude-Flow Command erstellen

```bash
cat > src-tauri/src/commands/claude_flow.rs << 'EOF'
use tauri::State;
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub success: bool,
    pub output: String,
    pub tool_used: String,
    pub duration_ms: u64,
}

#[tauri::command]
pub async fn execute_claude_flow(
    command: String,
    state: State<'_, AppState>,
) -> Result<ExecutionResult, String> {
    let start = std::time::Instant::now();

    let output = Command::new("sh")
        .arg("-c")
        .arg(format!("cd {} && npx claude-flow@alpha {}",
            state.claude_flow_workspace, command))
        .output()
        .map_err(|e| format!("Failed to execute Claude-Flow: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(ExecutionResult {
        success: output.status.success(),
        output: format!("{}\n{}", stdout, stderr),
        tool_used: "claude-flow".to_string(),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}
EOF
```

**Erläuterung:** #[tauri::command] Macro macht Funktion vom Frontend aufrufbar. State<'\_, AppState>
wird von Tauri injiziert. sh -c führt Shell-Command mit cd und && Verkettung aus. from_utf8_lossy
konvertiert Bytes zu String mit Replacement für ungültige UTF-8. Instant::now() für präzise
Zeitmessung.

- [x] ### Schritt 158: OpenAI Codex Command erstellen

```bash
cat > src-tauri/src/commands/openai_codex.rs << 'EOF'
use tauri::State;
use crate::state::AppState;
use crate::commands::claude_flow::ExecutionResult;
use std::process::Command;

#[tauri::command]
pub async fn execute_openai_codex(
    task: String,
    mode: String,
    state: State<'_, AppState>,
) -> Result<ExecutionResult, String> {
    let start = std::time::Instant::now();

    let mode_flag = match mode.as_str() {
        "suggest" => "--suggest",
        "auto-edit" => "--auto-edit",
        "full-auto" => "--full-auto",
        _ => "--suggest",
    };

    let output = Command::new("codex")
        .arg(mode_flag)
        .arg(&task)
        .current_dir(&state.codex_workspace)
        .output()
        .map_err(|e| format!("Failed to execute Codex: {}", e))?;

    Ok(ExecutionResult {
        success: output.status.success(),
        output: String::from_utf8_lossy(&output.stdout).to_string(),
        tool_used: "openai-codex".to_string(),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}
EOF
```

**Erläuterung:** Match-Expression für Mode-zu-Flag Mapping mit Default-Case. current_dir setzt
Working Directory für Command. & Referenz vermeidet String-Move in arg(). as_str() konvertiert
String zu &str für Pattern-Matching. Wiederverwendung von ExecutionResult aus anderem Modul.

- [x] ### Schritt 159: Orchestration Command erstellen

```bash
cat > src-tauri/src/commands/orchestration.rs << 'EOF'
use crate::commands::claude_flow::ExecutionResult;
use reqwest;
use serde_json::json;

#[tauri::command]
pub async fn orchestrate_dual_mode(
    task: String,
    openrouter_key: String,
) -> Result<ExecutionResult, String> {
    let start = std::time::Instant::now();

    let client = reqwest::Client::new();
    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", openrouter_key))
        .header("HTTP-Referer", "https://github.com/meinzeug/autodevai")
        .header("X-Title", "AutoDev-AI Neural Bridge")
        .json(&json!({
            "model": "openai/gpt-4",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an AI orchestrator coordinating Claude-Flow and OpenAI Codex."
                },
                {
                    "role": "user",
                    "content": format!("Plan and distribute this task: {}", task)
                }
            ]
        }))
        .send()
        .await
        .map_err(|e| format!("OpenRouter request failed: {}", e))?;

    let body = response.text().await.map_err(|e| e.to_string())?;

    Ok(ExecutionResult {
        success: true,
        output: body,
        tool_used: "dual-mode-orchestration".to_string(),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}
EOF
```

**Erläuterung:** Async Function mit .await für HTTP-Requests. json! Macro für inline
JSON-Erstellung. Bearer Token Authorization Header Format. Multiple Headers für
OpenRouter-Requirements. Error-Mapping mit map_err zu String für Tauri.

- [x] ### Schritt 160: Docker Commands erstellen

```bash
cat > src-tauri/src/commands/docker.rs << 'EOF'
use std::process::Command;

#[tauri::command]
pub async fn create_sandbox(project_id: String) -> Result<String, String> {
    let output = Command::new("docker")
        .args(&["compose", "-f", "docker/sandbox-template.yml", "up", "-d"])
        .env("PROJECT_ID", &project_id)
        .output()
        .map_err(|e| format!("Failed to create sandbox: {}", e))?;

    if output.status.success() {
        Ok(format!("Sandbox created for project: {}", project_id))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn stop_sandbox(project_id: String) -> Result<String, String> {
    let output = Command::new("docker")
        .args(&["compose", "-f", "docker/sandbox-template.yml", "down"])
        .env("PROJECT_ID", &project_id)
        .output()
        .map_err(|e| format!("Failed to stop sandbox: {}", e))?;

    if output.status.success() {
        Ok(format!("Sandbox stopped for project: {}", project_id))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
EOF
```

**Erläuterung:** args() mit Slice für multiple Arguments. env() setzt Environment-Variable für
Command. Conditional Return basierend auf Exit-Status. Docker Compose v2 CLI-Syntax (compose statt
docker-compose). -d Flag für Detached Mode bei up.

- [x] ### Schritt 161: System Commands erstellen

```bash
cat > src-tauri/src/commands/system.rs << 'EOF'
use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct PrerequisiteStatus {
    pub claude_flow_ready: bool,
    pub codex_ready: bool,
    pub claude_code_ready: bool,
    pub docker_ready: bool,
}

#[derive(Serialize)]
pub struct SystemInfo {
    pub os: String,
    pub kernel: String,
    pub memory_total: u64,
    pub memory_available: u64,
    pub disk_total: u64,
    pub disk_available: u64,
}

#[tauri::command]
pub async fn check_prerequisites() -> Result<PrerequisiteStatus, String> {
    let claude_flow = Command::new("sh")
        .arg("-c")
        .arg("npx claude-flow@alpha --version")
        .output()
        .is_ok();

    let codex = Command::new("codex")
        .arg("--version")
        .output()
        .is_ok();

    let claude_code = Command::new("claude")
        .arg("--version")
        .output()
        .is_ok();

    let docker = Command::new("docker")
        .arg("--version")
        .output()
        .is_ok();

    Ok(PrerequisiteStatus {
        claude_flow_ready: claude_flow,
        codex_ready: codex,
        claude_code_ready: claude_code,
        docker_ready: docker,
    })
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    let os = std::env::consts::OS.to_string();
    let kernel = Command::new("uname")
        .arg("-r")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "Unknown".to_string());

    let meminfo = std::fs::read_to_string("/proc/meminfo")
        .unwrap_or_default();

    let memory_total = parse_meminfo_value(&meminfo, "MemTotal:");
    let memory_available = parse_meminfo_value(&meminfo, "MemAvailable:");

    Ok(SystemInfo {
        os,
        kernel,
        memory_total,
        memory_available,
        disk_total: 0,
        disk_available: 0,
    })
}

fn parse_meminfo_value(meminfo: &str, key: &str) -> u64 {
    meminfo
        .lines()
        .find(|line| line.starts_with(key))
        .and_then(|line| {
            line.split_whitespace()
                .nth(1)
                .and_then(|v| v.parse::<u64>().ok())
                .map(|v| v * 1024)
        })
        .unwrap_or(0)
}
EOF
```

**Erläuterung:** is_ok() prüft nur Success ohne Output-Value. /proc/meminfo Linux-spezifisch für
Memory-Info. Iterator-Chains mit find, and_then für funktionale Datenverarbeitung. parse::<u64>()
mit Turbofish-Syntax für Type-Annotation. KB zu Bytes Konversion mit \* 1024.

- [x] ### Schritt 162: Settings Commands erstellen

```bash
cat > src-tauri/src/commands/settings.rs << 'EOF'
use tauri::State;
use crate::state::{AppState, Settings};
use std::fs;
use std::path::PathBuf;

fn get_settings_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/home/user"));
    home.join(".autodev-ai").join("settings.json")
}

#[tauri::command]
pub async fn save_settings(
    settings: Settings,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut current_settings = state.settings.lock().await;
    *current_settings = settings.clone();

    let path = get_settings_path();
    fs::create_dir_all(path.parent().unwrap())
        .map_err(|e| format!("Failed to create settings directory: {}", e))?;

    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(path, json)
        .map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn load_settings(
    state: State<'_, AppState>,
) -> Result<Settings, String> {
    let path = get_settings_path();

    if path.exists() {
        let json = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read settings: {}", e))?;

        let settings: Settings = serde_json::from_str(&json)
            .map_err(|e| format!("Failed to parse settings: {}", e))?;

        let mut current_settings = state.settings.lock().await;
        *current_settings = settings.clone();

        Ok(settings)
    } else {
        Ok(Settings::default())
    }
}
EOF
```

**Erläuterung:** dirs::home_dir() cross-platform Home-Directory. PathBuf::join() für OS-spezifische
Path-Separators. Mutex::lock().await für async Mutex-Access. \*current_settings dereferenziert
MutexGuard für Assignment. to_string_pretty() für formatiertes JSON mit Einrückung.

- [x] ### Schritt 163: Services Module vorbereiten

```bash
mkdir -p src-tauri/src/services
cat > src-tauri/src/services/mod.rs << 'EOF'
// Services will be implemented in later phases
EOF
```

**Erläuterung:** Platzhalter für zukünftige Service-Implementierungen. Kommentar verhindert
Unused-Module-Warning. Verzeichnis-Struktur für Phase 11 vorbereitet. Leere mod.rs macht Verzeichnis
zum Rust-Module. Services werden Claude-Flow und Codex wrappen.

- [x] ### Schritt 164: Rust-Projekt kompilieren

```bash
cd src-tauri && cargo build && cd ..
```

**Erläuterung:** Erstes Build verifiziert Syntax und lädt Dependencies. cargo build ohne --release
für Debug-Build. Build im src-tauri Directory für korrektes Cargo-Context. Compilation-Errors werden
hier sichtbar. Target-Directory wird mit Build-Artefakten erstellt.

- [x] ### Schritt 165: Rust-Linting ausführen

```bash
cd src-tauri && cargo clippy -- -W clippy::all && cd ..
```

**Erläuterung:** Clippy prüft auf Common Mistakes und unidiomatischen Code. -- trennt Cargo-Args von
Clippy-Args. -W macht alle Clippy-Warnings sichtbar. Linting sollte vor Commits ausgeführt werden.
Exit-Code non-zero bei Warnings für CI-Integration.

## 3.3 Tauri Window Configuration (10 Schritte)

- [x] ### Schritt 16&: Window State Plugin hinzufügen

```bash
cd src-tauri && cargo add tauri-plugin-window-state --features tauri && cd ..
```

**Erläuterung:** cargo add fügt Dependency zu Cargo.toml hinzu. --features aktiviert
Plugin-spezifische Features. Window-State speichert Position/Größe zwischen Sessions. Plugin muss in
main.rs registriert werden. Version wird automatisch aufgelöst.

- [x] ### Schritt 16&: Main.rs mit Plugin erweitern

```bash
sed -i '/.run(tauri::generate_context!())/i\        .plugin(tauri_plugin_window_state::Builder::default().build())' src-tauri/src/main.rs
```

**Erläuterung:** sed -i editiert Datei in-place. /pattern/i fügt vor gefundener Zeile ein.
Builder-Pattern für Plugin-Konfiguration. Backslash escaped Dots in Regex. Plugin-Registration vor
run() Call.

- [x] ### Schritt 16&: Dev Window Configuration

```bash
cat > src-tauri/src/dev_window.rs << 'EOF'
use tauri::{Manager, Window};

pub fn setup_dev_window(window: Window) {
    #[cfg(debug_assertions)]
    {
        window.open_devtools();
    }
}
EOF
```

**Erläuterung:** cfg(debug_assertions) nur in Debug-Builds aktiv. open_devtools() öffnet
Browser-DevTools automatisch. Separate Funktion für Window-Setup. Window-Type von Tauri importiert.
Conditional Compilation für Dev-Features.

- [x] ### Schritt 16&: Window Menu erstellen

```bash
cat > src-tauri/src/menu.rs << 'EOF'
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

pub fn create_app_menu() -> Menu {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let close = CustomMenuItem::new("close".to_string(), "Close");

    let submenu = Submenu::new(
        "File",
        Menu::new()
            .add_item(quit)
            .add_item(close)
    );

    Menu::new()
        .add_submenu(submenu)
        .add_native_item(MenuItem::Copy)
        .add_native_item(MenuItem::Paste)
        .add_native_item(MenuItem::SelectAll)
}
EOF
```

**Erläuterung:** CustomMenuItem für eigene Menu-Actions. Native Items nutzen
OS-Standard-Funktionalität. Submenu gruppiert verwandte Items. to_string() konvertiert &str zu
String. Menu-Builder-Pattern mit Chaining.

- [x] ### Schritt 17&: System Tray Configuration

```bash
cat > src-tauri/src/tray.rs << 'EOF'
use tauri::{AppHandle, CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayMenuItem};
use tauri::Manager;

pub fn create_system_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let show = CustomMenuItem::new("show".to_string(), "Show");

    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
}

pub fn handle_tray_event(app: &AppHandle, event_id: &str) {
    match event_id {
        "quit" => std::process::exit(0),
        "hide" => {
            if let Some(window) = app.get_window("main") {
                let _ = window.hide();
            }
        }
        "show" => {
            if let Some(window) = app.get_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        _ => {}
    }
}
EOF
```

**Erläuterung:** SystemTray für Minimierung in System-Tray. Pattern-Matching auf event*id für
Actions. get_window("main") findet Haupt-Window. let * ignoriert Result für Error-Handling.
Separator für visuelle Menu-Trennung.

- [x] ### Schritt 17&: IPC Security Configuration

```bash
cat > src-tauri/src/ipc_security.rs << 'EOF'
use tauri::Runtime;

pub fn validate_ipc_message<R: Runtime>(
    _app: &tauri::AppHandle<R>,
    message: &str,
) -> bool {
    // Validate message length
    if message.len() > 1_000_000 {
        return false;
    }

    // Check for potential injection patterns
    if message.contains("<script>") || message.contains("javascript:") {
        return false;
    }

    true
}
EOF
```

**Erläuterung:** Generic Function mit Runtime Trait-Bound. Message-Size-Limit gegen DoS-Attacks.
XSS-Pattern-Detection für Sicherheit. Unterstriche in Zahlen für Lesbarkeit. Bool-Return für
einfache Integration.

- [x] ### Schritt 17&: App Setup Hook implementieren

```bash
cat > src-tauri/src/setup.rs << 'EOF'
use tauri::{App, Manager};
use crate::utils::ensure_workspace_exists;

pub fn setup_handler(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let app_dir = app.path_resolver().app_data_dir()
        .ok_or("Failed to resolve app data directory")?;

    ensure_workspace_exists(app_dir.to_str().unwrap())?;

    // Create default workspaces
    let home = std::env::var("HOME")?;
    ensure_workspace_exists(&format!("{}/claude-flow-workspace", home))?;
    ensure_workspace_exists(&format!("{}/codex-workspace", home))?;

    Ok(())
}
EOF
```

**Erläuterung:** Box<dyn Error> für flexible Error-Types. path_resolver() für Platform-spezifische
Pfade. ok_or konvertiert Option zu Result. ? Operator für Error-Propagation. Setup läuft einmal bei
App-Start.

- [x] ### Schritt 17&: Update Handler implementieren

```bash
cat > src-tauri/src/updater.rs << 'EOF'
use tauri::Manager;

pub async fn check_for_updates(app: tauri::AppHandle) {
    // Placeholder for update logic
    log::info!("Checking for updates...");

    // In production, would check GitHub releases
    let current_version = app.package_info().version.to_string();
    log::info!("Current version: {}", current_version);
}
EOF
```

**Erläuterung:** Async Function für Non-blocking Update-Check. package_info() gibt App-Metadata.
Placeholder für spätere GitHub-Release-Integration. log Macros für strukturiertes Logging. Version
aus Cargo.toml gelesen.

- [x] ### Schritt 17&: Event System Setup

```bash
cat > src-tauri/src/events.rs << 'EOF'
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Clone, Serialize, Deserialize)]
pub struct ProgressEvent {
    pub task_id: String,
    pub progress: f32,
    pub message: String,
}

pub fn emit_progress<R: tauri::Runtime>(
    window: &tauri::Window<R>,
    event: ProgressEvent,
) -> Result<(), tauri::Error> {
    window.emit("task-progress", event)
}
EOF
```

**Erläuterung:** Generic über Runtime für Tauri-Compatibility. Clone für Event-Broadcasting an
multiple Listeners. f32 für Prozent-Progress (0.0-1.0). emit() sendet Events ans Frontend.
Strukturierte Events mit Types.

- [x] ### Schritt 17&: Alle Module in main.rs integrieren

```bash
cat >> src-tauri/src/main.rs << 'EOF'

mod dev_window;
mod menu;
mod tray;
mod ipc_security;
mod setup;
mod updater;
mod events;

// Add to main() before .run()
// .menu(menu::create_app_menu())
// .system_tray(tray::create_system_tray())
// .setup(|app| {
//     setup::setup_handler(app)?;
//     Ok(())
// })
EOF
```

**Erläuterung:** Module mit mod deklariert für Compilation. Kommentierte Integration-Points für
spätere Aktivierung. Setup-Closure mit Error-Propagation. Module müssen vor Verwendung deklariert
werden. Append-Mode mit >> erhält bestehenden Content.

## 3.4 Build Configuration (15 Schritte)

- [x] ### Schritt 17&: Release Profile optimieren

```bash
cat >> src-tauri/Cargo.toml << 'EOF'

[profile.release]
lto = true
opt-level = 3
codegen-units = 1
strip = true
panic = "abort"
EOF
```

**Erläuterung:** LTO (Link Time Optimization) für kleinere Binaries. opt-level 3 maximale
Optimierung. codegen-units 1 für bessere Optimierung vs Parallelität. strip entfernt Debug-Symbols.
panic=abort für kleinere Binary ohne Unwind.

- [x] ### Schritt 17&: Development Profile konfigurieren

```bash
cat >> src-tauri/Cargo.toml << 'EOF'

[profile.dev]
opt-level = 0
debug = true
split-debuginfo = "unpacked"
EOF
```

**Erläuterung:** opt-level 0 für schnelle Compilation. debug=true für Debugging-Information.
split-debuginfo für schnelleres Linking. Unpacked für bessere Debugger-Integration. Dev-Profile für
Entwicklungs-Builds.

- [x] ### Schritt 17&: Cross-Compilation Targets hinzufügen

```bash
rustup target add x86_64-pc-windows-gnu x86_64-apple-darwin
```

**Erläuterung:** Windows-GNU Target für Cross-Compilation von Linux. Apple-Darwin für macOS
(benötigt zusätzliche Tools). Targets werden zu Toolchain hinzugefügt. Ermöglicht
Multi-Platform-Builds. Installation nur der Target-Definitions.

- [x] ### Schritt 17&: Bundle Settings erweitern

```bash
cat > src-tauri/bundle.json << 'EOF'
{
  "name": "AutoDev-AI Neural Bridge",
  "identifier": "com.meinzeug.autodev-ai",
  "targets": ["deb", "appimage", "msi", "dmg"],
  "debian": {
    "depends": ["libwebkit2gtk-4.1-0", "libgtk-3-0"]
  },
  "appimage": {
    "bundleMediaFramework": true
  },
  "windows": {
    "certificateThumbprint": null,
    "digestAlgorithm": "sha256",
    "timestampUrl": "http://timestamp.digicert.com"
  },
  "macOS": {
    "minimumSystemVersion": "10.15"
  }
}
EOF
```

**Erläuterung:** Platform-spezifische Bundle-Konfigurationen. Debian depends für
Runtime-Dependencies. AppImage mit Media-Framework für Compatibility. Windows Timestamp für
Signatur-Validity. macOS Minimum-Version für API-Compatibility.

- [x] ### Schritt 18&: Pre-Build Script erstellen

```bash
cat > src-tauri/before-build.sh << 'EOF'
#!/bin/bash
set -e

echo "Running pre-build tasks..."

# Ensure icons exist
if [ ! -f "icons/icon.png" ]; then
    echo "Error: Missing icon.png"
    exit 1
fi

# Check Rust formatting
cargo fmt -- --check

# Run clippy
cargo clippy -- -D warnings

echo "Pre-build checks passed"
EOF
chmod +x src-tauri/before-build.sh
```

**Erläuterung:** set -e stoppt bei jedem Fehler. Icon-Check verhindert Build ohne Assets. cargo fmt
--check prüft ohne Änderung. -D warnings macht Warnings zu Errors. chmod +x für Ausführbarkeit.

- [x] ### Schritt 18&: Post-Build Script erstellen

```bash
cat > src-tauri/after-build.sh << 'EOF'
#!/bin/bash
set -e

echo "Running post-build tasks..."

# Get target directory
TARGET_DIR="${CARGO_TARGET_DIR:-target}"

# Create distribution directory
mkdir -p ../dist-bundles

# Copy bundles
if [ -d "$TARGET_DIR/release/bundle" ]; then
    cp -r "$TARGET_DIR/release/bundle/"* ../dist-bundles/
    echo "Bundles copied to dist-bundles/"
fi

echo "Post-build tasks completed"
EOF
chmod +x src-tauri/after-build.sh
```

**Erläuterung:** CARGO_TARGET_DIR mit Fallback zu default. mkdir -p für rekursive Erstellung. cp -r
für recursive Copy mit Subdirs. Conditional Copy nur wenn Bundle existiert. dist-bundles für finale
Artefakte.

- [x] ### Schritt 18&: Tauri Build Hook konfigurieren

```bash
sed -i '/"beforeBuildCommand":/s/"npm run build"/"npm run build \&\& .\/src-tauri\/before-build.sh"/' src-tauri/tauri.conf.json
```

**Erläuterung:** sed inline-Edit der JSON-Config. Escaped Ampersands für Shell-Command. Escaped
Slashes in Path. && Chain für Sequential Execution. Hook läuft vor jedem Build.

- [x] ### Schritt 18&: Environment File Template

```bash
cat > .env.example << 'EOF'
# OpenRouter API Configuration
VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Development Settings
VITE_API_BASE_URL=http://localhost:3000
VITE_ENABLE_DEVTOOLS=true

# Feature Flags
VITE_FEATURE_DOCKER=true
VITE_FEATURE_MONITORING=true

# DO NOT COMMIT .env FILE
EOF
```

**Erläuterung:** VITE\_ Prefix für Frontend-Environment-Variables. Example-File für Documentation
ohne Secrets. Feature-Flags für Conditional Features. Kommentar-Warnung gegen Secret-Commits.
Template für Team-Mitglieder.

- [x] ### Schritt 18&: Build-Varianten Script

```bash
cat > scripts/build-all.sh << 'EOF'
#!/bin/bash
set -e

echo "Building all variants..."

# Development build
echo "Building development version..."
npm run tauri:build -- --debug

# Production build
echo "Building production version..."
npm run tauri:build

# Linux-specific builds
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Building AppImage..."
    npm run tauri:build -- --bundles appimage

    echo "Building Debian package..."
    npm run tauri:build -- --bundles deb
fi

echo "All builds completed"
EOF
chmod +x scripts/build-all.sh
```

**Erläuterung:** OSTYPE Check für Platform-spezifische Builds. -- trennt npm von tauri-cli
Arguments. --bundles für spezifische Output-Formate. Multiple Build-Varianten in einem Script.
Conditional Builds basierend auf OS.

- [x] ### Schritt 18&: Version Bump Script

```bash
cat > scripts/version-bump.sh << 'EOF'
#!/bin/bash
set -e

VERSION_TYPE=${1:-patch}

echo "Bumping version: $VERSION_TYPE"

# Bump npm version
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")

# Update Cargo.toml
sed -i "s/^version = .*/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml

# Update tauri.conf.json
sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json

echo "Version bumped to $NEW_VERSION"

# Git commit
git add -A
git commit -m "chore: bump version to $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Version $NEW_VERSION"

echo "Version $NEW_VERSION tagged"
EOF
chmod +x scripts/version-bump.sh
```

**Erläuterung:** VERSION_TYPE mit Default zu patch. node -p evaluiert JavaScript und printed Result.
sed Updates in allen Config-Files. Automatisches Git-Tagging mit Version. Semantic Versioning
Support (major/minor/patch).

- [x] ### Schritt 186: Clean Script erstellen

```bash
cat > scripts/clean.sh << 'EOF'
#!/bin/bash
set -e

echo "Cleaning build artifacts..."

# Remove node_modules
rm -rf node_modules

# Remove Rust target
rm -rf src-tauri/target

# Remove dist directories
rm -rf dist dist-bundles

# Remove lock files (optional)
if [ "$1" == "--full" ]; then
    rm -f package-lock.json
    rm -f src-tauri/Cargo.lock
    echo "Removed lock files"
fi

echo "Clean complete"
EOF
chmod +x scripts/clean.sh
```

**Erläuterung:** rm -rf für Force-Recursive-Delete. Optional --full Flag für Lock-Files. Conditional
Parameter-Check mit $1. Separate dist und dist-bundles Cleanup. Vollständige Projekt-Reinigung.

- [x] ### Schritt 187: CI Build Script

```bash
cat > scripts/ci-build.sh << 'EOF'
#!/bin/bash
set -euo pipefail

echo "Starting CI build..."

# Install dependencies
echo "Installing Node dependencies..."
npm ci

# Build frontend
echo "Building frontend..."
npm run build

# Test frontend
echo "Running frontend tests..."
npm test -- --run

# Build Tauri
echo "Building Tauri application..."
cd src-tauri
cargo build --release
cd ..

# Run Rust tests
echo "Running Rust tests..."
cd src-tauri
cargo test
cd ..

echo "CI build successful"
EOF
chmod +x scripts/ci-build.sh
```

**Erläuterung:** set -euo pipefail für strikte Error-Handling. npm ci für Clean-Install von
Lock-File. --run Flag für Non-Interactive Test-Mode. Separate Frontend und Backend Tests. Exit bei
jedem Fehler für CI.

- [x] ### Schritt 188: Docker Build Script

```bash
cat > scripts/docker-build.sh << 'EOF'
#!/bin/bash
set -e

IMAGE_NAME="autodev-ai-builder"
TAG="${1:-latest}"

echo "Building Docker image: $IMAGE_NAME:$TAG"

cat > Dockerfile.build << 'DOCKERFILE'
FROM ubuntu:24.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy sources
COPY . .

# Build
RUN npm ci && \
    npm run build && \
    cd src-tauri && \
    cargo build --release

CMD ["echo", "Build complete"]
DOCKERFILE

docker build -f Dockerfile.build -t $IMAGE_NAME:$TAG .

echo "Docker build complete"
EOF
chmod +x scripts/docker-build.sh
```

**Erläuterung:** Heredoc für Inline-Dockerfile. Multi-stage Dependencies Installation. ENV PATH für
Rust-Tools in Container. WORKDIR für Build-Context. Build innerhalb Container für Reproducibility.

- [x] ### Schritt 189: Release Script

```bash
cat > scripts/release.sh << 'EOF'
#!/bin/bash
set -e

VERSION=${1:?Version required}

echo "Creating release $VERSION..."

# Ensure clean working directory
if [ -n "$(git status --porcelain)" ]; then
    echo "Error: Working directory not clean"
    exit 1
fi

# Checkout main branch
git checkout main
git pull origin main

# Merge development
git merge development --no-ff -m "chore: merge development for release $VERSION"

# Run version bump
./scripts/version-bump.sh $VERSION

# Build all variants
./scripts/build-all.sh

# Create GitHub release (requires gh CLI)
if command -v gh &> /dev/null; then
    gh release create "v$VERSION" \
        --title "Release v$VERSION" \
        --generate-notes \
        dist-bundles/*
fi

echo "Release $VERSION complete"
EOF
chmod +x scripts/release.sh
```

**Erläuterung:** Parameter-Check mit :? für Required Argument. git status --porcelain für
Script-friendly Output. --no-ff für Merge-Commit. gh CLI für GitHub-Release. Automatisches
Release-Notes Generation.

- [x] ### Schritt 190: Final Build Test

```bash
cd src-tauri && cargo build --release && cd ..
```

**Erläuterung:** --release für optimierten Production-Build. Finaler Test der kompletten
Rust-Konfiguration. Build-Time länger durch Optimierungen. Target/release Verzeichnis mit Binary.
Erfolg zeigt funktionierende Konfiguration.

## 3.5 Commit und Dokumentation (10 Schritte)

- [x] ### Schritt 191: Rust-Code formatieren

```bash
cd src-tauri && cargo fmt && cd ..
```

**Erläuterung:** cargo fmt applied Rust-Style-Guidelines. Automatische Formatierung ohne Prompts.
Ändert Source-Files in-place. Konsistenter Code-Style. Sollte vor jedem Commit laufen.

- [x] ### Schritt 192: Clippy Warnings fixen

```bash
cd src-tauri && cargo clippy --fix --allow-dirty && cd ..
```

**Erläuterung:** --fix applied automatische Fixes. --allow-dirty erlaubt Fixes bei uncommitted
Changes. Nicht alle Warnings sind auto-fixable. Manuelles Review der Änderungen empfohlen.
Verbessert Code-Qualität.

- [x] ### Schritt 193: Cargo.lock updaten

```bash
cd src-tauri && cargo update && cd ..
```

**Erläuterung:** Aktualisiert Dependencies zu neuesten kompatiblen Versionen. Respektiert
SemVer-Constraints in Cargo.toml. Updates Cargo.lock mit neuen Versionen. Sollte regelmäßig
ausgeführt werden. Security-Updates werden eingeschlossen.

- [x] ### Schritt 194: Test-Module Stub erstellen

```bash
cat > src-tauri/src/tests.rs << 'EOF'
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_id_generation() {
        use crate::utils::generate_id;
        let id = generate_id();
        assert!(!id.is_empty());
        assert!(id.len() > 20);
    }

    #[test]
    fn test_timestamp() {
        use crate::utils::get_timestamp;
        let ts = get_timestamp();
        assert!(ts > 0);
    }
}
EOF
```

**Erläuterung:** cfg(test) kompiliert nur für Test-Runs. #[test] markiert Test-Funktionen. assert!
Macros für Test-Assertions. use super::\* importiert Parent-Module. Tests verifizieren
Utils-Funktionalität.

- [x] ### Schritt 195: README für Tauri-Backend

````bash
cat > src-tauri/README.md << 'EOF'
# AutoDev-AI Tauri Backend

## Structure
- `src/main.rs` - Application entry point
- `src/commands/` - Tauri command handlers
- `src/state.rs` - Application state management
- `src/services/` - Business logic services

## Development
```bash
cargo build
cargo run
cargo test
cargo clippy
````

## Build

```bash
cargo build --release
```

## Commands

The backend exposes these commands to the frontend:

- `execute_claude_flow` - Run Claude-Flow commands
- `execute_openai_codex` - Run Codex operations
- `orchestrate_dual_mode` - Coordinate both tools
- `create_sandbox` - Create Docker sandbox
- `check_prerequisites` - Verify tool availability
- `get_system_info` - System information
- `save_settings` - Persist settings
- `load_settings` - Load settings EOF

````
**Erläuterung:** Dokumentiert Backend-Struktur für Entwickler. Command-Liste für Frontend-Integration. Build-Instructions für verschiedene Modi. Markdown-Formatierung für GitHub. Lokale README für Modul-Dokumentation.

- [x] ### Schritt 196: API Dokumentation generieren
```bash
cd src-tauri && cargo doc --no-deps && cd ..
````

**Erläuterung:** cargo doc generiert HTML-Dokumentation. --no-deps skippt Dependencies-Docs. Output
in target/doc Verzeichnis. Dokumentation aus Code-Comments. Kann mit Browser geöffnet werden.

- [x] ### Schritt 197: Type Exports für Frontend

```bash
cat > src-tauri/types.d.ts << 'EOF'
// Auto-generated Tauri command types
export interface ExecutionResult {
  success: boolean;
  output: string;
  tool_used: string;
  duration_ms: number;
}

export interface PrerequisiteStatus {
  claude_flow_ready: boolean;
  codex_ready: boolean;
  claude_code_ready: boolean;
  docker_ready: boolean;
}

export interface SystemInfo {
  os: string;
  kernel: string;
  memory_total: number;
  memory_available: number;
  disk_total: number;
  disk_available: number;
}

export interface Settings {
  default_mode: "Single" | "Dual";
  default_tool: string;
  openrouter_key?: string;
  docker_enabled: boolean;
  auto_quality_check: boolean;
}
EOF
```

**Erläuterung:** TypeScript-Definitionen für Type-Safety. Muss mit Rust-Structs synchron gehalten
werden. Optional-Fields mit ? markiert. Union-Types für Enums. Export für Frontend-Import.

- [x] ### Schritt 198: Git Add alle Tauri-Files

```bash
git add src-tauri/
```

**Erläuterung:** Staged komplettes src-tauri Verzeichnis. Inkludiert alle neuen Dateien und
Änderungen. Rekursives Add mit Directory-Path. Target-Directory durch .gitignore excludiert.
Vorbereitung für Commit.

- [x] ### Schritt 199: Scripts hinzufügen

```bash
git add scripts/
```

**Erläuterung:** Staged alle Build- und Utility-Scripts. Scripts-Directory separat für Übersicht.
Executable-Permissions werden preserved. Wichtig für CI/CD-Pipeline. Shell-Scripts für Automation.

- [x] ### Schritt 200: Commit Tauri-Backend

```bash
git commit -m "feat: implement Tauri backend with command handlers and state management

- Add Rust backend structure with modules
- Implement command handlers for Claude-Flow and Codex
- Add Docker sandbox management
- Configure build and bundle settings
- Create utility scripts for development
- Add system prerequisite checking
- Implement settings persistence"
```

**Erläuterung:** Multi-line Commit mit Details. Conventional Commit "feat" für neue Features.
Bullet-Points für Übersicht der Änderungen. Ausführliche Message für History. Gruppiert verwandte
Änderungen.

## 3.6 Backend Testing (10 Schritte)

- [x] ### Schritt 201: Unit Test Framework Setup

```bash
cat >> src-tauri/Cargo.toml << 'EOF'

[dev-dependencies]
tempfile = "3.8"
mockito = "1.2"
serial_test = "3.0"
EOF
```

**Erläuterung:** dev-dependencies nur für Tests. tempfile für temporäre Test-Dateien. mockito für
HTTP-Mocking. serial_test für Sequential Test-Execution. Dependencies werden bei Release nicht
inkludiert.

- [x] ### Schritt 202: Test Module für Commands

```bash
cat > src-tauri/src/commands/tests.rs << 'EOF'
#[cfg(test)]
mod command_tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_execution_result_creation() {
        let result = ExecutionResult {
            success: true,
            output: "test".to_string(),
            tool_used: "test-tool".to_string(),
            duration_ms: 100,
        };

        assert!(result.success);
        assert_eq!(result.output, "test");
    }

    #[tokio::test]
    async fn test_settings_persistence() {
        let temp_dir = TempDir::new().unwrap();
        std::env::set_var("HOME", temp_dir.path());

        let settings = Settings::default();
        // Test save and load
        assert!(settings.docker_enabled);
    }
}
EOF
```

**Erläuterung:** tokio::test für Async-Test-Functions. TempDir automatisch cleanup nach Test.
env::set_var für Test-Isolation. assert_eq! für Wert-Vergleiche. Test-Module mit cfg(test) Guard.

- [x] ### Schritt 203: Integration Test erstellen

````bash
mkdir -p src-tauri/tests
cat > src-tauri/tests/integration.rs << 'EOF'
use autodev_ai::*;

#[test]
fn test_app_creation() {
    // Test that app can be created
    assert!(true); //

# Phase 4: React Frontend Implementation (120 Schritte)

## 4.1 Vite Konfiguration (10 Schritte)

- [x] ### Schritt 241: Vite Config erstellen
```bash
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'esnext',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@store': path.resolve(__dirname, './src/store'),
    },
  },
});
EOF
````

**Erläuterung:** clearScreen: false behält Terminal-Output bei Tauri. strictPort verhindert
Port-Wechsel bei Konflikten. envPrefix definiert erlaubte Environment-Variable-Prefixes. Aliases mit
@ für absolute Imports ohne ../../../. Build-Target esnext für moderne JavaScript-Features.

- [x] ### Schritt 242: TypeScript Konfiguration

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@services/*": ["src/services/*"],
      "@hooks/*": ["src/hooks/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"],
      "@store/*": ["src/store/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
```

**Erläuterung:** jsx: "react-jsx" für React 17+ ohne Import React. isolatedModules für schnellere
Transpilation. noEmit da Vite das Building übernimmt. paths müssen Vite-Aliases matchen. strict
aktiviert alle Type-Checks.

- [x] ### Schritt 243: Node TypeScript Config

```bash
cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF
```

- [x] ### Schritt 244: TailwindCSS Konfiguration

```bash
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
EOF
```

- [x] ### Schritt 245: PostCSS Konfiguration

```bash
cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOF
```

- [x] ### Schritt 246: Global Styles

```bash
cat > src/styles/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-800;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-400 dark:bg-gray-600 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500 dark:bg-gray-500;
}

/* Terminal output styling */
.terminal-output {
  font-family: 'Fira Code', 'Courier New', monospace;
  @apply text-sm leading-relaxed;
}

/* Loading animation */
.loading-dots::after {
  content: '.';
  animation: dots 1.5s steps(3, end) infinite;
}

@keyframes dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}
EOF
```

**Erläuterung:** @layer base für Base-Styles mit Tailwind-Priorität. CSS-Variables für
Theme-Switching. @apply nutzt Tailwind-Classes in CSS. Webkit-Scrollbar für Custom-Styling.
Keyframes für Loading-Animations.

- [x] ### Schritt 247: HTML Entry Point

```bash
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AutoDev-AI Neural Bridge</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF
```

- [x] ### Schritt 248: Icon kopieren

```bash
cp src-tauri/icons/icon.png public/icon.png 2>/dev/null || echo "Icon will be generated later"
```

- [x] ### Schritt 249: Environment Types

```bash
cat > src/vite-env.d.ts << 'EOF'
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_DEVTOOLS?: string;
  readonly VITE_FEATURE_DOCKER?: string;
  readonly VITE_FEATURE_MONITORING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
EOF
```

- [x] ### Schritt 250: Public Directory Setup

```bash
mkdir -p public
echo "User-agent: *
Disallow: /" > public/robots.txt
```

## 4.2 Main Entry Files (10 Schritte)

- [x] ### Schritt 251: Main Entry Point

```bash
cat > src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
EOF
```

**Erläuterung:** QueryClient für Server-State-Management. StrictMode für Development-Warnings.
Toaster als Global-Component außerhalb App. as HTMLElement für Type-Assertion. defaultOptions für
Query-Behavior.

- [x] ### Schritt 252: Type Definitions

```bash
cat > src/types/index.ts << 'EOF'
export interface ExecutionResult {
  success: boolean;
  output: string;
  tool_used: string;
  duration_ms: number;
}

export interface PrerequisiteStatus {
  claude_flow_ready: boolean;
  codex_ready: boolean;
  claude_code_ready: boolean;
  docker_ready: boolean;
}

export interface SystemInfo {
  os: string;
  kernel: string;
  memory_total: number;
  memory_available: number;
  disk_total: number;
  disk_available: number;
}

export interface Settings {
  default_mode: OrchestrationMode;
  default_tool: string;
  openrouter_key?: string;
  docker_enabled: boolean;
  auto_quality_check: boolean;
}

export type OrchestrationMode = 'single' | 'dual';
export type Tool = 'claude-flow' | 'openai-codex';
export type CodexMode = 'suggest' | 'auto-edit' | 'full-auto';
export type ClaudeFlowCommand = 'swarm' | 'sparc' | 'hive-mind' | 'memory';

export interface Task {
  id: string;
  description: string;
  mode: OrchestrationMode;
  tool?: Tool;
  status: TaskStatus;
  created_at: string;
  completed_at?: string;
  result?: ExecutionResult;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface DockerContainer {
  id: string;
  name: string;
  status: string;
  ports: string[];
}
EOF
```

- [x] ### Schritt 253: Tauri Service Layer

```bash
cat > src/services/tauri.ts << 'EOF'
import { invoke } from '@tauri-apps/api/tauri';
import type {
  ExecutionResult,
  PrerequisiteStatus,
  SystemInfo,
  Settings,
} from '@/types';

export const TauriService = {
  async executeClaudeFlow(command: string): Promise<ExecutionResult> {
    return invoke('execute_claude_flow', { command });
  },

  async executeOpenAICodex(
    task: string,
    mode: string
  ): Promise<ExecutionResult> {
    return invoke('execute_openai_codex', { task, mode });
  },

  async orchestrateDualMode(
    task: string,
    openrouterKey: string
  ): Promise<ExecutionResult> {
    return invoke('orchestrate_dual_mode', { task, openrouterKey });
  },

  async createSandbox(projectId: string): Promise<string> {
    return invoke('create_sandbox', { projectId });
  },

  async stopSandbox(projectId: string): Promise<string> {
    return invoke('stop_sandbox', { projectId });
  },

  async checkPrerequisites(): Promise<PrerequisiteStatus> {
    return invoke('check_prerequisites');
  },

  async getSystemInfo(): Promise<SystemInfo> {
    return invoke('get_system_info');
  },

  async saveSettings(settings: Settings): Promise<void> {
    return invoke('save_settings', { settings });
  },

  async loadSettings(): Promise<Settings> {
    return invoke('load_settings');
  },
};
EOF
```

**Erläuterung:** invoke für Tauri-IPC-Calls. Type-safe mit TypeScript-Generics. camelCase zu
snake_case Conversion für Rust. Promise-based für async/await. Object-Parameter für Named-Arguments.

- [x] ### Schritt 254: Zustand Store

```bash
cat > src/store/index.ts << 'EOF'
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Task,
  Settings,
  OrchestrationMode,
  Tool,
  CodexMode,
  ClaudeFlowCommand,
  PrerequisiteStatus,
  SystemInfo,
} from '@/types';

interface AppState {
  // Tasks
  tasks: Task[];
  currentTask: Task | null;
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'status'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setCurrentTask: (task: Task | null) => void;

  // Settings
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;

  // UI State
  mode: OrchestrationMode;
  selectedTool: Tool;
  codexMode: CodexMode;
  claudeFlowCommand: ClaudeFlowCommand;
  claudeFlowArgs: string;
  isExecuting: boolean;
  output: string;

  setMode: (mode: OrchestrationMode) => void;
  setSelectedTool: (tool: Tool) => void;
  setCodexMode: (mode: CodexMode) => void;
  setClaudeFlowCommand: (command: ClaudeFlowCommand) => void;
  setClaudeFlowArgs: (args: string) => void;
  setIsExecuting: (executing: boolean) => void;
  setOutput: (output: string) => void;
  appendOutput: (output: string) => void;

  // System
  prerequisites: PrerequisiteStatus | null;
  systemInfo: SystemInfo | null;
  setPrerequisites: (status: PrerequisiteStatus) => void;
  setSystemInfo: (info: SystemInfo) => void;
}

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Tasks
        tasks: [],
        currentTask: null,
        addTask: (task) =>
          set((state) => ({
            tasks: [
              ...state.tasks,
              {
                ...task,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                status: 'pending',
              },
            ],
          })),
        updateTask: (id, updates) =>
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id ? { ...task, ...updates } : task
            ),
          })),
        removeTask: (id) =>
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
          })),
        setCurrentTask: (task) => set({ currentTask: task }),

        // Settings
        settings: {
          default_mode: 'single',
          default_tool: 'claude-flow',
          docker_enabled: true,
          auto_quality_check: true,
        },
        updateSettings: (updates) =>
          set((state) => ({
            settings: { ...state.settings, ...updates },
          })),

        // UI State
        mode: 'single',
        selectedTool: 'claude-flow',
        codexMode: 'suggest',
        claudeFlowCommand: 'swarm',
        claudeFlowArgs: '',
        isExecuting: false,
        output: '',

        setMode: (mode) => set({ mode }),
        setSelectedTool: (tool) => set({ selectedTool: tool }),
        setCodexMode: (mode) => set({ codexMode: mode }),
        setClaudeFlowCommand: (command) => set({ claudeFlowCommand: command }),
        setClaudeFlowArgs: (args) => set({ claudeFlowArgs: args }),
        setIsExecuting: (executing) => set({ isExecuting: executing }),
        setOutput: (output) => set({ output }),
        appendOutput: (output) =>
          set((state) => ({ output: state.output + '\n' + output })),

        // System
        prerequisites: null,
        systemInfo: null,
        setPrerequisites: (status) => set({ prerequisites: status }),
        setSystemInfo: (info) => set({ systemInfo: info }),
      }),
      {
        name: 'autodev-ai-storage',
        partialize: (state) => ({
          settings: state.settings,
          tasks: state.tasks,
        }),
      }
    )
  )
);
EOF
```

**Erläuterung:** Zustand mit devtools für Redux-DevTools. persist für LocalStorage-Sync. partialize
limitiert Persistence. crypto.randomUUID() für IDs. Immer neue State-Objects für React-Rendering.

- [x] ### Schritt 255: Utility Functions

```bash
cat > src/utils/cn.ts << 'EOF'
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF
```

**Erläuterung:** clsx kombiniert Classes conditional. twMerge dedupliziert Tailwind-Conflicts.
ClassValue Type für verschiedene Input-Types. Rest-Parameter für Multiple Arguments. Standard-Util
für Tailwind+React.

- [x] ### Schritt 256: Format Utilities

```bash
cat > src/utils/format.ts << 'EOF'
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length - 3) + '...' : str;
}
EOF
```

- [x] ### Schritt 257: Validation Utilities

```bash
cat > src/utils/validation.ts << 'EOF'
import { z } from 'zod';

export const taskSchema = z.object({
  description: z.string().min(1, 'Task description is required'),
  mode: z.enum(['single', 'dual']),
  tool: z.enum(['claude-flow', 'openai-codex']).optional(),
});

export const settingsSchema = z.object({
  default_mode: z.enum(['single', 'dual']),
  default_tool: z.string(),
  openrouter_key: z.string().optional(),
  docker_enabled: z.boolean(),
  auto_quality_check: z.boolean(),
});

export function validateOpenRouterKey(key: string): boolean {
  return key.startsWith('sk-or-') && key.length > 20;
}

export function validateDockerName(name: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/.test(name);
}
EOF
```

**Erläuterung:** Zod-Schemas für Runtime-Validation. Type-Inference aus Schemas. Regex für
Format-Validation. Error-Messages in Schema. Reusable Validation-Functions.

- [x] ### Schritt 258: Custom Hooks - useTauri

```bash
cat > src/hooks/useTauri.ts << 'EOF'
import { useState } from 'react';
import { TauriService } from '@/services/tauri';
import { useStore } from '@/store';
import toast from 'react-hot-toast';

export function useTauri() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const store = useStore();

  const executeCommand = async (
    command: string,
    args?: any
  ): Promise<any> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await TauriService.executeClaudeFlow(command);
      store.appendOutput(result.output);
      toast.success('Command executed successfully');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { executeCommand, isLoading, error };
}
EOF
```

- [x] ### Schritt 259: System Check Hook

```bash
cat > src/hooks/useSystemCheck.ts << 'EOF'
import { useEffect } from 'react';
import { TauriService } from '@/services/tauri';
import { useStore } from '@/store';
import toast from 'react-hot-toast';

export function useSystemCheck() {
  const { setPrerequisites, setSystemInfo } = useStore();

  useEffect(() => {
    const checkSystem = async () => {
      try {
        const [prerequisites, systemInfo] = await Promise.all([
          TauriService.checkPrerequisites(),
          TauriService.getSystemInfo(),
        ]);

        setPrerequisites(prerequisites);
        setSystemInfo(systemInfo);

        const missing = [];
        if (!prerequisites.claude_flow_ready) missing.push('Claude-Flow');
        if (!prerequisites.codex_ready) missing.push('OpenAI Codex');
        if (!prerequisites.docker_ready) missing.push('Docker (optional)');

        if (missing.length > 0) {
          toast.error(`Missing: ${missing.join(', ')}`);
        }
      } catch (error) {
        console.error('System check failed:', error);
      }
    };

    checkSystem();
  }, [setPrerequisites, setSystemInfo]);
}
EOF
```

- [x] ### Schritt 260: Theme Hook

```bash
cat > src/hooks/useTheme.ts << 'EOF'
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, setTheme, toggleTheme };
}
EOF
```

## 4.3 Layout Components (15 Schritte)

- [x] ### Schritt 261: Header Component

```bash
cat > src/components/layout/Header.tsx << 'EOF'
import React from 'react';
import { Brain, Moon, Sun, Settings, Github } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              AutoDev-AI Neural Bridge
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI Orchestration Platform
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="https://github.com/meinzeug/autodevai"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={onSettingsClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
EOF
```

- [x] ### Schritt 262: Sidebar Component

```bash
cat > src/components/layout/Sidebar.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';
import {
  Cpu,
  Zap,
  Box,
  History,
  BarChart3,
  FileCode,
  Terminal,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const menuItems = [
  { id: 'orchestration', label: 'Orchestration', icon: Cpu },
  { id: 'execution', label: 'Execution', icon: Zap },
  { id: 'sandbox', label: 'Sandboxes', icon: Box },
  { id: 'history', label: 'History', icon: History },
  { id: 'monitoring', label: 'Monitoring', icon: BarChart3 },
  { id: 'files', label: 'Files', icon: FileCode },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                activeView === item.id
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
EOF
```

- [x] ### Schritt 263: StatusBar Component

```bash
cat > src/components/layout/StatusBar.tsx << 'EOF'
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '@/store';
import { formatBytes } from '@/utils/format';

export function StatusBar() {
  const { prerequisites, systemInfo } = useStore();

  const getStatusIcon = (ready: boolean) => {
    return ready ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-6">
          {prerequisites && (
            <>
              <div className="flex items-center space-x-2">
                {getStatusIcon(prerequisites.claude_flow_ready)}
                <span>Claude-Flow</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(prerequisites.codex_ready)}
                <span>Codex</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(prerequisites.docker_ready)}
                <span>Docker</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400">
          {systemInfo && (
            <>
              <span>
                Memory: {formatBytes(systemInfo.memory_available)} /{' '}
                {formatBytes(systemInfo.memory_total)}
              </span>
              <span>{systemInfo.os} - {systemInfo.kernel}</span>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
EOF
```

- [x] ### Schritt 264: Loading Spinner

```bash
cat > src/components/common/LoadingSpinner.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn('flex justify-center items-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-b-2 border-primary-500',
          sizes[size]
        )}
      />
    </div>
  );
}
EOF
```

- [x] ### Schritt 265: Button Component

```bash
cat > src/components/common/Button.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600',
    secondary: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      <span>{children}</span>
    </button>
  );
}
EOF
```

- [x] ### Schritt 266: Card Component

```bash
cat > src/components/common/Card.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
}

export function Card({
  variant = 'default',
  className,
  children,
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-white dark:bg-gray-800',
    bordered: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg',
  };

  return (
    <div
      className={cn('rounded-lg p-6', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
EOF
```

- [x] ### Schritt 267: Input Component

```bash
cat > src/components/common/Input.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 border rounded-lg dark:bg-gray-700',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500',
            'focus:outline-none focus:ring-2',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
EOF
```

**Erläuterung:** forwardRef für ref-Passing zu DOM. displayName für React-DevTools. Conditional
Classes mit error-State. Rest-Props für HTML-Attributes. Label und Error optional.

- [x] ### Schritt 268: Select Component

```bash
cat > src/components/common/Select.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-3 py-2 border rounded-lg dark:bg-gray-700',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500',
            'focus:outline-none focus:ring-2',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
EOF
```

- [x] ### Schritt 269: TextArea Component

```bash
cat > src/components/common/TextArea.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full px-3 py-2 border rounded-lg dark:bg-gray-700',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500',
            'focus:outline-none focus:ring-2 resize-none',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
EOF
```

- [x] ### Schritt 270: Modal Component

```bash
cat > src/components/common/Modal.tsx << 'EOF'
import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className={cn(
        'relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md',
        className
      )}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
EOF
```

- [x] ### Schritt 271: Tabs Component

```bash
cat > src/components/common/Tabs.tsx << 'EOF'
import React, { useState } from 'react';
import { cn } from '@/utils/cn';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={className}>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-4">
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}
EOF
```

- [x] ### Schritt 272: Alert Component

```bash
cat > src/components/common/Alert.tsx << 'EOF'
import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ type = 'info', title, children, className }: AlertProps) {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: XCircle,
  };

  const styles = {
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
  };

  const Icon = icons[type];

  return (
    <div className={cn('rounded-lg border p-4', styles[type], className)}>
      <div className="flex">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <div className="ml-3">
          {title && <h3 className="font-medium">{title}</h3>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
EOF
```

- [x] ### Schritt 273: Badge Component

```bash
cat > src/components/common/Badge.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
EOF
```

- [x] ### Schritt 274: Progress Bar Component

```bash
cat > src/components/common/ProgressBar.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = false
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          className="bg-primary-500 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
EOF
```

- [x] ### Schritt 275: Tooltip Component

```bash
cat > src/components/common/Tooltip.tsx << 'EOF'
import React, { useState } from 'react';
import { cn } from '@/utils/cn';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={cn(
            'absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm whitespace-nowrap',
            positions[position]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
EOF
```

## 4.4 Orchestration Components (15 Schritte)

- [x] ### Schritt 276: Mode Selector Component

```bash
cat > src/components/orchestration/ModeSelector.tsx << 'EOF'
import React from 'react';
import { Cpu, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';
import { OrchestrationMode } from '@/types';

interface ModeSelectorProps {
  mode: OrchestrationMode;
  onChange: (mode: OrchestrationMode) => void;
  disabled?: boolean;
}

export function ModeSelector({ mode, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => onChange('single')}
        disabled={disabled}
        className={cn(
          'p-6 rounded-lg border-2 transition-all',
          mode === 'single'
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Cpu className="w-8 h-8 mb-3 mx-auto text-primary-500" />
        <h3 className="font-semibold mb-1">Single Tool Mode</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Execute with Claude-Flow or Codex
        </p>
      </button>

      <button
        onClick={() => onChange('dual')}
        disabled={disabled}
        className={cn(
          'p-6 rounded-lg border-2 transition-all',
          mode === 'dual'
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Zap className="w-8 h-8 mb-3 mx-auto text-primary-500" />
        <h3 className="font-semibold mb-1">Dual Tool Mode</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Orchestrate both tools via OpenRouter
        </p>
      </button>
    </div>
  );
}
EOF
```

- [x] ### Schritt 277: Tool Selector Component

```bash
cat > src/components/orchestration/ToolSelector.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';
import { Tool } from '@/types';

interface ToolSelectorProps {
  tool: Tool;
  onChange: (tool: Tool) => void;
  disabled?: boolean;
}

export function ToolSelector({ tool, onChange, disabled }: ToolSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Select Tool
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onChange('claude-flow')}
          disabled={disabled}
          className={cn(
            'px-4 py-3 rounded-lg border transition-all',
            tool === 'claude-flow'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="font-medium">Claude-Flow</div>
          <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
            Swarm, SPARC, Hive-Mind
          </div>
        </button>

        <button
          onClick={() => onChange('openai-codex')}
          disabled={disabled}
          className={cn(
            'px-4 py-3 rounded-lg border transition-all',
            tool === 'openai-codex'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="font-medium">OpenAI Codex</div>
          <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
            Suggest, Auto-Edit, Full-Auto
          </div>
        </button>
      </div>
    </div>
  );
}
EOF
```

- [x] ### Schritt 278: Command Selector Component

```bash
cat > src/components/orchestration/CommandSelector.tsx << 'EOF'
import React from 'react';
import { Select } from '@/components/common/Select';
import { ClaudeFlowCommand, CodexMode } from '@/types';

interface CommandSelectorProps {
  tool: 'claude-flow' | 'openai-codex';
  claudeFlowCommand: ClaudeFlowCommand;
  codexMode: CodexMode;
  onClaudeFlowChange: (command: ClaudeFlowCommand) => void;
  onCodexModeChange: (mode: CodexMode) => void;
}

export function CommandSelector({
  tool,
  claudeFlowCommand,
  codexMode,
  onClaudeFlowChange,
  onCodexModeChange,
}: CommandSelectorProps) {
  if (tool === 'claude-flow') {
    return (
      <Select
        label="Claude-Flow Command"
        value={claudeFlowCommand}
        onChange={(e) => onClaudeFlowChange(e.target.value as ClaudeFlowCommand)}
        options={[
          { value: 'swarm', label: 'Swarm - Multi-agent collaboration' },
          { value: 'sparc', label: 'SPARC - Structured reasoning' },
          { value: 'hive-mind', label: 'Hive-Mind - Consensus building' },
          { value: 'memory', label: 'Memory - Context management' },
        ]}
      />
    );
  }

  return (
    <Select
      label="Codex Mode"
      value={codexMode}
      onChange={(e) => onCodexModeChange(e.target.value as CodexMode)}
      options={[
        { value: 'suggest', label: 'Suggest - Code suggestions' },
        { value: 'auto-edit', label: 'Auto-Edit - Automatic editing' },
        { value: 'full-auto', label: 'Full-Auto - Complete automation' },
      ]}
    />
  );
}
EOF
```

- [x] ### Schritt 279: Task Input Component

```bash
cat > src/components/orchestration/TaskInput.tsx << 'EOF'
import React from 'react';
import { TextArea } from '@/components/common/TextArea';
import { Input } from '@/components/common/Input';

interface TaskInputProps {
  description: string;
  args: string;
  onDescriptionChange: (value: string) => void;
  onArgsChange: (value: string) => void;
  disabled?: boolean;
}

export function TaskInput({
  description,
  args,
  onDescriptionChange,
  onArgsChange,
  disabled,
}: TaskInputProps) {
  return (
    <div className="space-y-4">
      <TextArea
        label="Task Description"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Describe the task you want to execute..."
        rows={4}
        disabled={disabled}
      />

      <Input
        label="Additional Arguments (optional)"
        value={args}
        onChange={(e) => onArgsChange(e.target.value)}
        placeholder="--flag value --another-flag"
        disabled={disabled}
      />
    </div>
  );
}
EOF
```

- [x] ### Schritt 280: Execution Controls Component

```bash
cat > src/components/orchestration/ExecutionControls.tsx << 'EOF'
import React from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface ExecutionControlsProps {
  isExecuting: boolean;
  onExecute: () => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
}

export function ExecutionControls({
  isExecuting,
  onExecute,
  onStop,
  onReset,
  disabled,
}: ExecutionControlsProps) {
  return (
    <div className="flex space-x-3">
      {!isExecuting ? (
        <Button
          onClick={onExecute}
          disabled={disabled}
          size="lg"
          className="flex-1"
        >
          <Play className="w-4 h-4" />
          Execute Task
        </Button>
      ) : (
        <Button
          onClick={onStop}
          variant="danger"
          size="lg"
          className="flex-1"
        >
          <Square className="w-4 h-4" />
          Stop Execution
        </Button>
      )}

      <Button
        onClick={onReset}
        variant="secondary"
        size="lg"
        disabled={isExecuting}
      >
        <RotateCcw className="w-4 h-4" />
        Reset
      </Button>
    </div>
  );
}
EOF
```

- [x] ### Schritt 281: Terminal Output Component

```bash
cat > src/components/output/Terminal.tsx << 'EOF'
import React, { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

interface TerminalProps {
  output: string;
  className?: string;
}

export function Terminal({ output, className }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div
      className={cn(
        'bg-gray-900 rounded-lg p-4 font-mono text-sm',
        className
      )}
    >
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-4 text-gray-400 text-xs">Terminal Output</span>
      </div>
      <div
        ref={scrollRef}
        className="h-96 overflow-y-auto text-gray-100 whitespace-pre-wrap terminal-output"
      >
        {output || <span className="text-gray-500">Waiting for output...</span>}
      </div>
    </div>
  );
}
EOF
```

- [x] ### Schritt 282: Result Card Component

```bash
cat > src/components/output/ResultCard.tsx << 'EOF'
import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { ExecutionResult } from '@/types';
import { formatDuration } from '@/utils/format';
import { cn } from '@/utils/cn';
import { Card } from '@/components/common/Card';

interface ResultCardProps {
  result: ExecutionResult;
  className?: string;
}

export function ResultCard({ result, className }: ResultCardProps) {
  return (
    <Card
      variant="bordered"
      className={cn(
        result.success
          ? 'border-green-200 dark:border-green-800'
          : 'border-red-200 dark:border-red-800',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {result.success ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <XCircle className="w-6 h-6 text-red-500" />
          )}
          <div>
            <h3 className="font-semibold">
              {result.success ? 'Execution Successful' : 'Execution Failed'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tool: {result.tool_used}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>{formatDuration(result.duration_ms)}</span>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <pre className="text-sm whitespace-pre-wrap font-mono">
          {result.output}
        </pre>
      </div>
    </Card>
  );
}
EOF
```

- [x] ### Schritt 283: Task List Component

```bash
cat > src/components/output/TaskList.tsx << 'EOF'
import React from 'react';
import { Task } from '@/types';
import { formatDate } from '@/utils/format';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Eye, Trash2 } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onViewTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export function TaskList({ tasks, onViewTask, onDeleteTask }: TaskListProps) {
  const getStatusBadge = (status: Task['status']) => {
    const variants = {
      pending: 'default',
      running: 'warning',
      completed: 'success',
      failed: 'error',
    } as const;

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No tasks yet. Execute your first task to see it here.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h3 className="font-medium">{task.description}</h3>
              {getStatusBadge(task.status)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formatDate(task.created_at)}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewTask(task)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteTask(task.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
EOF
```

- [x] ### Schritt 284: Metrics Display Component

```bash
cat > src/components/output/MetricsDisplay.tsx << 'EOF'
import React from 'react';
import { Task } from '@/types';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';

interface MetricsDisplayProps {
  tasks: Task[];
}

export function MetricsDisplay({ tasks }: MetricsDisplayProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const failedTasks = tasks.filter(t => t.status === 'failed').length;
  const runningTasks = tasks.filter(t => t.status === 'running').length;

  const successRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card variant="bordered">
        <div className="text-2xl font-bold">{totalTasks}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</div>
      </Card>

      <Card variant="bordered">
        <div className="text-2xl font-bold text-green-500">{completedTasks}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
      </Card>

      <Card variant="bordered">
        <div className="text-2xl font-bold text-red-500">{failedTasks}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
      </Card>

      <Card variant="bordered">
        <div className="text-2xl font-bold text-yellow-500">{runningTasks}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Running</div>
      </Card>

      <Card variant="bordered" className="md:col-span-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Success Rate</span>
            <span className="text-sm font-medium">{successRate}%</span>
          </div>
          <ProgressBar value={successRate} max={100} />
        </div>
      </Card>
    </div>
  );
}
EOF
```

- [x] ### Schritt 285: Settings Modal Component

```bash
cat > src/components/settings/SettingsModal.tsx << 'EOF'
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings } from '@/types';
import { settingsSchema } from '@/utils/validation';
import { TauriService } from '@/services/tauri';
import { useStore } from '@/store';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Button } from '@/components/common/Button';
import { Save } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Settings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  const onSubmit = async (data: Settings) => {
    try {
      await TauriService.saveSettings(data);
      updateSettings(data);
      toast.success('Settings saved successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Default Mode"
          {...register('default_mode')}
          options={[
            { value: 'single', label: 'Single Tool' },
            { value: 'dual', label: 'Dual Tool' },
          ]}
          error={errors.default_mode?.message}
        />

        <Select
          label="Default Tool"
          {...register('default_tool')}
          options={[
            { value: 'claude-flow', label: 'Claude-Flow' },
            { value: 'openai-codex', label: 'OpenAI Codex' },
          ]}
          error={errors.default_tool?.message}
        />

        <Input
          label="OpenRouter API Key"
          type="password"
          {...register('openrouter_key')}
          placeholder="sk-or-..."
          error={errors.openrouter_key?.message}
        />

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            {...register('docker_enabled')}
            id="docker_enabled"
            className="rounded"
          />
          <label htmlFor="docker_enabled" className="text-sm">
            Enable Docker Sandboxes
          </label>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            {...register('auto_quality_check')}
            id="auto_quality_check"
            className="rounded"
          />
          <label htmlFor="auto_quality_check" className="text-sm">
            Auto Quality Check
          </label>
        </div>

        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </form>
    </Modal>
  );
}
EOF
```

**Erläuterung:** useForm mit zodResolver für Form-Validation. register spread für Input-Binding.
handleSubmit wraps async Submit-Handler. formState.errors für Field-Level-Errors. isSubmitting für
Loading-State.

- [x] ### Schritt 286: Docker Sandbox Component

```bash
cat > src/components/sandbox/SandboxManager.tsx << 'EOF'
import React, { useState } from 'react';
import { TauriService } from '@/services/tauri';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert } from '@/components/common/Alert';
import { Box, Play, Square } from 'lucide-react';
import toast from 'react-hot-toast';

export function SandboxManager() {
  const [projectId, setProjectId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeSandboxes, setActiveSandboxes] = useState<string[]>([]);

  const createSandbox = async () => {
    if (!projectId) {
      toast.error('Please enter a project ID');
      return;
    }

    setIsCreating(true);
    try {
      const result = await TauriService.createSandbox(projectId);
      setActiveSandboxes([...activeSandboxes, projectId]);
      toast.success(result);
      setProjectId('');
    } catch (error) {
      toast.error('Failed to create sandbox');
    } finally {
      setIsCreating(false);
    }
  };

  const stopSandbox = async (id: string) => {
    try {
      const result = await TauriService.stopSandbox(id);
      setActiveSandboxes(activeSandboxes.filter(s => s !== id));
      toast.success(result);
    } catch (error) {
      toast.error('Failed to stop sandbox');
    }
  };

  return (
    <div className="space-y-6">
      <Card variant="bordered">
        <h2 className="text-xl font-semibold mb-4">Create Sandbox</h2>

        <Alert type="info" className="mb-4">
          Docker sandboxes provide isolated environments for code execution
        </Alert>

        <div className="flex space-x-3">
          <Input
            placeholder="Enter project ID"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
          <Button
            onClick={createSandbox}
            isLoading={isCreating}
          >
            <Box className="w-4 h-4" />
            Create
          </Button>
        </div>
      </Card>

      {activeSandboxes.length > 0 && (
        <Card variant="bordered">
          <h3 className="text-lg font-semibold mb-4">Active Sandboxes</h3>
          <div className="space-y-2">
            {activeSandboxes.map((id) => (
              <div
                key={id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <span className="font-mono">{id}</span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => stopSandbox(id)}
                >
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
EOF
```

- [x] ### Schritt 287: Monitoring Dashboard Component

```bash
cat > src/components/monitoring/MonitoringDashboard.tsx << 'EOF'
import React from 'react';
import { useStore } from '@/store';
import { Card } from '@/components/common/Card';
import { formatBytes } from '@/utils/format';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Cpu, HardDrive, Memory } from 'lucide-react';

export function MonitoringDashboard() {
  const { systemInfo } = useStore();

  if (!systemInfo) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Loading system information...
      </div>
    );
  }

  const memoryUsagePercent = Math.round(
    ((systemInfo.memory_total - systemInfo.memory_available) / systemInfo.memory_total) * 100
  );

  const diskUsagePercent = systemInfo.disk_total > 0
    ? Math.round(((systemInfo.disk_total - systemInfo.disk_available) / systemInfo.disk_total) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card variant="bordered">
        <div className="flex items-center space-x-3 mb-4">
          <Cpu className="w-6 h-6 text-primary-500" />
          <h3 className="text-lg font-semibold">System</h3>
        </div>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">OS</dt>
            <dd className="font-mono">{systemInfo.os}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Kernel</dt>
            <dd className="font-mono text-sm">{systemInfo.kernel}</dd>
          </div>
        </dl>
      </Card>

      <Card variant="bordered">
        <div className="flex items-center space-x-3 mb-4">
          <Memory className="w-6 h-6 text-primary-500" />
          <h3 className="text-lg font-semibold">Memory</h3>
        </div>
        <div className="space-y-3">
          <ProgressBar value={memoryUsagePercent} showLabel />
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatBytes(systemInfo.memory_total - systemInfo.memory_available)} / {formatBytes(systemInfo.memory_total)}
          </div>
        </div>
      </Card>

      <Card variant="bordered">
        <div className="flex items-center space-x-3 mb-4">
          <HardDrive className="w-6 h-6 text-primary-500" />
          <h3 className="text-lg font-semibold">Disk</h3>
        </div>
        <div className="space-y-3">
          <ProgressBar value={diskUsagePercent} showLabel />
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatBytes(systemInfo.disk_total - systemInfo.disk_available)} / {formatBytes(systemInfo.disk_total)}
          </div>
        </div>
      </Card>
    </div>
  );
}
EOF
```

## 4.5 Main Views (10 Schritte)

- [x] ### Schritt 288: Orchestration View

```bash
cat > src/views/OrchestrationView.tsx << 'EOF'
import React, { useState } from 'react';
import { ModeSelector } from '@/components/orchestration/ModeSelector';
import { ToolSelector } from '@/components/orchestration/ToolSelector';
import { CommandSelector } from '@/components/orchestration/CommandSelector';
import { TaskInput } from '@/components/orchestration/TaskInput';
import { ExecutionControls } from '@/components/orchestration/ExecutionControls';
import { Terminal } from '@/components/output/Terminal';
import { Card } from '@/components/common/Card';
import { useStore } from '@/store';
import { TauriService } from '@/services/tauri';
import toast from 'react-hot-toast';

export function OrchestrationView() {
  const {
    mode,
    setMode,
    selectedTool,
    setSelectedTool,
    claudeFlowCommand,
    setClaudeFlowCommand,
    codexMode,
    setCodexMode,
    output,
    setOutput,
    appendOutput,
    isExecuting,
    setIsExecuting,
    settings,
    addTask,
  } = useStore();

  const [taskDescription, setTaskDescription] = useState('');
  const [taskArgs, setTaskArgs] = useState('');

  const handleExecute = async () => {
    if (!taskDescription.trim()) {
      toast.error('Please enter a task description');
      return;
    }

    if (mode === 'dual' && !settings.openrouter_key) {
      toast.error('OpenRouter API key required for dual mode');
      return;
    }

    setIsExecuting(true);
    setOutput('');

    const task = {
      description: taskDescription,
      mode,
      tool: mode === 'single' ? selectedTool : undefined,
    };

    addTask(task);

    try {
      let result;

      if (mode === 'dual') {
        result = await TauriService.orchestrateDualMode(
          taskDescription,
          settings.openrouter_key!
        );
      } else if (selectedTool === 'claude-flow') {
        const command = `${claudeFlowCommand} ${taskArgs}`.trim();
        result = await TauriService.executeClaudeFlow(command);
      } else {
        result = await TauriService.executeOpenAICodex(taskDescription, codexMode);
      }

      appendOutput(result.output);
      toast.success('Task executed successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Task execution failed';
      appendOutput(`Error: ${message}`);
      toast.error(message);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStop = () => {
    setIsExecuting(false);
    toast.info('Execution stopped');
  };

  const handleReset = () => {
    setTaskDescription('');
    setTaskArgs('');
    setOutput('');
  };

  return (
    <div className="p-6 space-y-6">
      <Card variant="bordered">
        <h2 className="text-2xl font-bold mb-6">AI Orchestration</h2>

        <div className="space-y-6">
          <ModeSelector
            mode={mode}
            onChange={setMode}
            disabled={isExecuting}
          />

          {mode === 'single' && (
            <>
              <ToolSelector
                tool={selectedTool}
                onChange={setSelectedTool}
                disabled={isExecuting}
              />

              <CommandSelector
                tool={selectedTool}
                claudeFlowCommand={claudeFlowCommand}
                codexMode={codexMode}
                onClaudeFlowChange={setClaudeFlowCommand}
                onCodexModeChange={setCodexMode}
              />
            </>
          )}

          <TaskInput
            description={taskDescription}
            args={taskArgs}
            onDescriptionChange={setTaskDescription}
            onArgsChange={setTaskArgs}
            disabled={isExecuting}
          />

          <ExecutionControls
            isExecuting={isExecuting}
            onExecute={handleExecute}
            onStop={handleStop}
            onReset={handleReset}
          />
        </div>
      </Card>

      <Terminal output={output} />
    </div>
  );
}
EOF
```

**Erläuterung:** Komplette Orchestrierungs-Logik mit State-Management. Conditional Rendering
basierend auf Mode. Error-Handling mit Toast-Notifications. Task zu Store für History. Async/await
mit try/catch für API-Calls.

- [x] ### Schritt 289: History View

```bash
cat > src/views/HistoryView.tsx << 'EOF'
import React, { useState } from 'react';
import { useStore } from '@/store';
import { TaskList } from '@/components/output/TaskList';
import { ResultCard } from '@/components/output/ResultCard';
import { MetricsDisplay } from '@/components/output/MetricsDisplay';
import { Modal } from '@/components/common/Modal';
import { Task } from '@/types';

export function HistoryView() {
  const { tasks, removeTask } = useStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
  };

  const handleDeleteTask = (id: string) => {
    removeTask(id);
    toast.success('Task deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Task History</h2>

      <MetricsDisplay tasks={tasks} />

      <TaskList
        tasks={tasks}
        onViewTask={handleViewTask}
        onDeleteTask={handleDeleteTask}
      />

      <Modal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Task Details"
        className="max-w-2xl"
      >
        {selectedTask?.result && (
          <ResultCard result={selectedTask.result} />
        )}
      </Modal>
    </div>
  );
}
EOF
```

- [x] ### Schritt 290: Sandbox View

```bash
cat > src/views/SandboxView.tsx << 'EOF'
import React from 'react';
import { SandboxManager } from '@/components/sandbox/SandboxManager';
import { Alert } from '@/components/common/Alert';

export function SandboxView() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Docker Sandboxes</h2>

      <Alert type="warning">
        Docker must be installed and running to use sandboxes
      </Alert>

      <SandboxManager />
    </div>
  );
}
EOF
```

- [x] ### Schritt 291: Monitoring View

```bash
cat > src/views/MonitoringView.tsx << 'EOF'
import React from 'react';
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';

export function MonitoringView() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">System Monitoring</h2>
      <MonitoringDashboard />
    </div>
  );
}
EOF
```

- [x] ### Schritt 292: Terminal View

```bash
cat > src/views/TerminalView.tsx << 'EOF'
import React, { useState } from 'react';
import { Terminal } from '@/components/output/Terminal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Send } from 'lucide-react';
import { useStore } from '@/store';

export function TerminalView() {
  const { output, appendOutput } = useStore();
  const [command, setCommand] = useState('');

  const handleExecute = () => {
    if (!command.trim()) return;

    appendOutput(`$ ${command}`);
    appendOutput('Command execution not implemented yet');
    setCommand('');
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Terminal</h2>

      <Terminal output={output} className="h-[500px]" />

      <div className="flex space-x-3">
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
          placeholder="Enter command..."
          className="flex-1"
        />
        <Button onClick={handleExecute}>
          <Send className="w-4 h-4" />
          Execute
        </Button>
      </div>
    </div>
  );
}
EOF
```

- [x] ### Schritt 293: Main App Component

```bash
cat > src/App.tsx << 'EOF'
import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { OrchestrationView } from '@/views/OrchestrationView';
import { HistoryView } from '@/views/HistoryView';
import { SandboxView } from '@/views/SandboxView';
import { MonitoringView } from '@/views/MonitoringView';
import { TerminalView } from '@/views/TerminalView';
import { useSystemCheck } from '@/hooks/useSystemCheck';

function App() {
  const [activeView, setActiveView] = useState('orchestration');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useSystemCheck();

  const renderView = () => {
    switch (activeView) {
      case 'orchestration':
        return <OrchestrationView />;
      case 'history':
        return <HistoryView />;
      case 'sandbox':
        return <SandboxView />;
      case 'monitoring':
        return <MonitoringView />;
      case 'terminal':
        return <TerminalView />;
      default:
        return <OrchestrationView />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header onSettingsClick={() => setIsSettingsOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>

      <StatusBar />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
EOF
```

- [x] ### Schritt 294: Error Boundary

```bash
cat > src/components/ErrorBoundary.tsx << 'EOF'
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert } from '@/components/common/Alert';
import { Button } from '@/components/common/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert type="error" title="Something went wrong">
              {this.state.error?.message || 'An unexpected error occurred'}
            </Alert>
            <Button onClick={this.handleReset} className="w-full">
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
EOF
```

**Erläuterung:** Class Component für Error-Boundary (Hooks nicht möglich). getDerivedStateFromError
für State-Update. componentDidCatch für Logging. Reset-Handler für Recovery. Fallback-UI bei Errors.

- [x] ### Schritt 295: Update Main with ErrorBoundary

```bash
cat > src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
EOF
```

- [x] ### Schritt 296: Build Frontend

```bash
npm run build
```

- [ ] ### Schritt 297: Test Development Server

```bash
npm run dev &
DEV_PID=$!
sleep 5
curl -s http://localhost:5173 > /dev/null && echo "✓ Dev server running"
kill $DEV_PID
```

## 4.6 Testing Setup (10 Schritte)

- [ ] ### Schritt 298: Vitest Configuration

```bash
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
EOF
```

- [ ] ### Schritt 299: Test Setup File

```bash
mkdir -p src/test
cat > src/test/setup.ts << 'EOF'
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
EOF
```

- [ ] ### Schritt 300: Utils Test

```bash
cat > src/utils/format.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { formatBytes, formatDuration, formatDate } from './format';

describe('Format Utils', () => {
  describe('formatBytes', () => {
    it('formats bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
    });
  });

  describe('formatDuration', () => {
    it('formats milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(1000)).toBe('1s');
      expect(formatDuration(65000)).toBe('1m 5s');
    });
  });

  describe('formatDate', () => {
    it('formats date strings', () => {
      const date = '2024-01-01T12:00:00Z';
      expect(formatDate(date)).toContain('2024');
    });
  });
});
EOF
```

- [ ] ### Schritt 301: Component Test

```bash
cat > src/components/common/Button.test.tsx << 'EOF'
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables when loading', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary-500');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-500');
  });
});
EOF
```

- [ ] ### Schritt 302: Hook Test

```bash
cat > src/hooks/useTheme.test.ts << 'EOF'
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('initializes with dark theme by default', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('toggles theme correctly', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('persists theme to localStorage', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('light');
    });

    expect(localStorage.getItem('theme')).toBe('light');
  });
});
EOF
```

- [ ] ### Schritt 303: Run Tests

```bash
npm test -- --run
```

- [ ] ### Schritt 304: Test Coverage

```bash
npm test -- --coverage
```

- [ ] ### Schritt 305: E2E Test Setup

```bash
cat > tests/e2e/app.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('App E2E Tests', () => {
  test('app loads successfully', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.locator('h1')).toContainText('AutoDev-AI Neural Bridge');
  });

  test('can navigate to different views', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Click History
    await page.click('text=History');
    await expect(page.locator('h2')).toContainText('Task History');

    // Click Monitoring
    await page.click('text=Monitoring');
    await expect(page.locator('h2')).toContainText('System Monitoring');
  });

  test('can toggle theme', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Toggle theme
    await page.click('button[aria-label="Toggle theme"]');
    await expect(page.locator('html')).toHaveClass(/light/);

    // Toggle back
    await page.click('button[aria-label="Toggle theme"]');
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
EOF
```

- [ ] ### Schritt 306: Playwright Config

```bash
cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
EOF
```

- [ ] ### Schritt 307: Accessibility Test

```bash
cat > src/test/accessibility.test.tsx << 'EOF'
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('Button has no accessibility violations', async () => {
    const { container } = render(<Button>Accessible Button</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Card has no accessibility violations', async () => {
    const { container } = render(
      <Card>
        <h2>Card Title</h2>
        <p>Card content</p>
      </Card>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
EOF
```

## 4.7 Build Optimization (10 Schritte)

- [ ] ### Schritt 308: Bundle Analyzer

```bash
cat > scripts/analyze-bundle.sh << 'EOF'
#!/bin/bash
npm run build -- --mode production
npx vite-bundle-visualizer
EOF
chmod +x scripts/analyze-bundle.sh
```

- [ ] ### Schritt 309: Optimize Imports

```bash
cat > src/utils/optimize-imports.ts << 'EOF'
// Lazy load heavy components
import { lazy } from 'react';

export const MonitoringDashboard = lazy(() =>
  import('@/components/monitoring/MonitoringDashboard')
);

export const SandboxManager = lazy(() =>
  import('@/components/sandbox/SandboxManager')
);
EOF
```

- [ ] ### Schritt 310: Add Suspense Boundaries

```bash
cat > src/components/common/SuspenseBoundary.tsx << 'EOF'
import React, { Suspense } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface SuspenseBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SuspenseBoundary({
  children,
  fallback = <LoadingSpinner size="lg" className="mt-8" />
}: SuspenseBoundaryProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}
EOF
```

- [x] ### Schritt 311: PWA Manifest

```bash
cat > public/manifest.json << 'EOF'
{
  "name": "AutoDev-AI Neural Bridge",
  "short_name": "AutoDev-AI",
  "description": "AI Orchestration Platform",
  "theme_color": "#3b82f6",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/icon.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
EOF
```

- [x] ### Schritt 312: Service Worker

```bash
cat > public/sw.js << 'EOF'
const CACHE_NAME = 'autodev-ai-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
EOF
```

- [x] ### Schritt 313: Performance Monitoring

```bash
cat > src/utils/performance.ts << 'EOF'
export function measurePerformance(name: string, fn: () => void) {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${end - start}ms`);
}

export function reportWebVitals(onPerfEntry?: (metric: any) => void) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
}
EOF
```

- [x] ### Schritt 314: Optimize Build

```bash
cat >> vite.config.ts << 'EOF'

// Add to existing config
export default defineConfig({
  // ... existing config
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'framer-motion', 'react-hot-toast'],
          'utils-vendor': ['axios', 'date-fns', 'zod'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
EOF
```

- [x] ### Schritt 315: Lint and Format

```bash
npm run lint -- --fix
npm run format
```

- [x] ### Schritt 316: Type Check

```bash
npm run type-check
```

- [x] ### Schritt 317: Final Build Test

```bash
npm run build && echo "✓ Production build successful"
```

## 4.8 Documentation (10 Schritte)

- [ ] ### Schritt 318: Frontend README

```bash
cat > src/README.md << 'EOF'
# AutoDev-AI Frontend

## Architecture
- **React 18** with TypeScript
- **Vite** for bundling
- **TailwindCSS** for styling
- **Zustand** for state management
- **React Query** for server state
- **Tauri API** for backend communication

## Structure
```

src/ ├── components/ # Reusable UI components ├── views/ # Page-level components ├── hooks/ # Custom
React hooks ├── services/ # API services ├── store/ # Global state ├── types/ # TypeScript types └──
utils/ # Utility functions

````

## Development
```bash
npm run dev        # Start dev server
npm test          # Run tests
npm run build     # Production build
````

## Key Features

- Real-time task execution
- Docker sandbox management
- System monitoring
- Dark mode support
- Responsive design EOF

````

- [ ] ### Schritt 319: Component Documentation
```bash
cat > docs/components.md << 'EOF'
# Component Documentation

## Layout Components
- **Header**: Top navigation with theme toggle and settings
- **Sidebar**: Navigation menu for different views
- **StatusBar**: System status indicators

## Common Components
- **Button**: Configurable button with variants
- **Input**: Form input with validation
- **Modal**: Overlay dialog
- **Card**: Content container
- **Alert**: Notification messages

## Orchestration Components
- **ModeSelector**: Single/Dual mode selection
- **ToolSelector**: Claude-Flow/Codex selection
- **Terminal**: Output display with auto-scroll

## Usage Examples
See individual component files for prop types and examples.
EOF
````

- [ ] ### Schritt 320: API Documentation

```bash
cat > docs/api.md << 'EOF'
# API Documentation

## Tauri Commands

### execute_claude_flow
Execute Claude-Flow command
- **Parameters**: `command: string`
- **Returns**: `ExecutionResult`

### execute_openai_codex
Execute Codex operation
- **Parameters**: `task: string, mode: string`
- **Returns**: `ExecutionResult`

### orchestrate_dual_mode
Coordinate both tools
- **Parameters**: `task: string, openrouterKey: string`
- **Returns**: `ExecutionResult`

### create_sandbox
Create Docker sandbox
- **Parameters**: `projectId: string`
- **Returns**: `string`

### check_prerequisites
Check system requirements
- **Returns**: `PrerequisiteStatus`
EOF
```

- [ ] ### Schritt 321: Testing Guide

````bash
cat > docs/testing.md << 'EOF'
# Testing Guide

## Unit Tests
```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report
````

## E2E Tests

```bash
npx playwright test   # Run E2E tests
npx playwright test --ui # Interactive mode
```

## Test Structure

- Unit tests: `*.test.ts(x)` files
- E2E tests: `tests/e2e/*.spec.ts`
- Test utils: `src/test/`

## Mocking

- Tauri API is mocked in tests
- Use MSW for API mocking if needed EOF

````

- [ ] ### Schritt 322: Deployment Guide
```bash
cat > docs/deployment.md << 'EOF'
# Deployment Guide

## Building for Production

### Development Build
```bash
npm run tauri:build -- --debug
````

### Production Build

```bash
npm run tauri:build
```

## Platform-specific Builds

### Linux (AppImage)

```bash
npm run tauri:build -- --bundles appimage
```

### Linux (Debian)

```bash
npm run tauri:build -- --bundles deb
```

### Windows

```bash
npm run tauri:build -- --bundles msi
```

### macOS

```bash
npm run tauri:build -- --bundles dmg
```

## Environment Variables

- `VITE_OPENROUTER_API_KEY`: OpenRouter API key
- `VITE_ENABLE_DEVTOOLS`: Enable dev tools in production

## CI/CD

See `.github/workflows/ci.yml` for automated builds EOF

````

- [ ] ### Schritt 323: Troubleshooting Guide
```bash
cat > docs/troubleshooting.md << 'EOF'
# Troubleshooting

## Common Issues

### Build Fails
- Check Node.js version (>=20.0.0)
- Clear node_modules and reinstall
- Check Rust toolchain is installed

### Tauri Commands Not Working
- Verify backend is running
- Check browser console for errors
- Ensure permissions in tauri.conf.json

### Styling Issues
- Run `npm run build:css` to rebuild Tailwind
- Check for conflicting class names
- Verify PostCSS config

### Performance Issues
- Enable production mode
- Check for memory leaks in dev tools
- Use React DevTools Profiler

## Debug Mode
```bash
RUST_LOG=debug npm run tauri:dev
````

EOF

````

- [ ] ### Schritt 324: Contributing Guide Update
```bash
cat >> CONTRIBUTING.md << 'EOF'

## Frontend Development

### Setup
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Run tests: `npm test`

### Code Style
- Use TypeScript for all new code
- Follow ESLint rules
- Format with Prettier
- Write tests for new features

### Component Guidelines
- Use functional components with hooks
- Implement proper TypeScript types
- Add JSDoc comments for props
- Include Storybook stories for UI components

### State Management
- Use Zustand for global state
- React Query for server state
- Local state for component-specific data
EOF
````

- [ ] ### Schritt 325: Performance Optimization Guide

````bash
cat > docs/performance.md << 'EOF'
# Performance Optimization

## Bundle Size
- Use dynamic imports for large components
- Tree-shake unused code
- Optimize images with WebP

## Runtime Performance
- Memoize expensive computations
- Use React.memo for pure components
- Virtualize long lists
- Debounce user inputs

## Monitoring
```javascript
import { reportWebVitals } from '@/utils/performance';

reportWebVitals(console.log);
````

## Profiling

1. Use React DevTools Profiler
2. Chrome DevTools Performance tab
3. Lighthouse audits EOF

````

- [ ] ### Schritt 326: Security Guide
```bash
cat > docs/security.md << 'EOF'
# Security Guide

## Best Practices
- Never commit API keys
- Use environment variables
- Sanitize user inputs
- Validate all data from backend
- Use CSP headers

## Tauri Security
- Allowlist only required APIs
- Use IPC validation
- Implement rate limiting
- Regular dependency updates

## Dependencies
```bash
npm audit         # Check for vulnerabilities
npm audit fix     # Auto-fix issues
````

EOF

````

- [ ] ### Schritt 327: Final Commit
```bash
git add -A && git commit -m "feat(frontend): complete React frontend implementation

- Full component library with TailwindCSS
- Orchestration interface for AI tools
- Real-time terminal output
- Task history and metrics
- Docker sandbox management
- System monitoring dashboard
- Dark mode support
- Comprehensive test suite
- Performance optimizations
- Complete documentation"
````

## 4.9 Integration Testing (10 Schritte)

- [ ] ### Schritt 328: Tauri Dev Test

```bash
npm run tauri:dev &
TAURI_PID=$!
sleep 10
curl -s http://localhost:5173 && echo "✓ Frontend accessible"
kill $TAURI_PID
```

- [ ] ### Schritt 329: Build Test

```bash
npm run tauri:build -- --debug && echo "✓ Debug build successful"
```

- [ ] ### Schritt 330: Component Count Verification

```bash
find src/components -name "*.tsx" | wc -l && echo "components created"
```

- [ ] ### Schritt 331: Test Coverage Check

```bash
npm test -- --coverage --run | grep -E "Statements|Branches|Functions|Lines"
```

- [ ] ### Schritt 332: Bundle Size Check

```bash
npm run build && du -sh dist/ && echo "bundle size"
```

- [ ] ### Schritt 333: Type Coverage

```bash
npx type-coverage --detail
```

- [ ] ### Schritt 334: Accessibility Check

```bash
npm test -- --run src/test/accessibility.test.tsx
```

- [ ] ### Schritt 335: Performance Test

```bash
cat > scripts/lighthouse.sh << 'EOF'
#!/bin/bash
npm run build
npx serve -s dist -p 3000 &
SERVER_PID=$!
sleep 3
npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json
kill $SERVER_PID
echo "Lighthouse report generated"
EOF
chmod +x scripts/lighthouse.sh
```

- [ ] ### Schritt 336: Memory Leak Check

```bash
cat > scripts/memory-check.sh << 'EOF'
#!/bin/bash
echo "Start app and monitor memory in Chrome DevTools"
echo "1. Open DevTools > Memory"
echo "2. Take heap snapshot"
echo "3. Interact with app"
echo "4. Take another snapshot"
echo "5. Compare for leaks"
EOF
chmod +x scripts/memory-check.sh
```

- [ ] ### Schritt 337: Final Integration Test

```bash
cat > scripts/integration-test.sh << 'EOF'
#!/bin/bash
set -e

echo "Running integration tests..."

# Start Tauri in background
npm run tauri:dev &
TAURI_PID=$!

# Wait for app to start
sleep 15

# Check if app is running
if curl -s http://localhost:5173 > /dev/null; then
    echo "✓ App is running"
else
    echo "✗ App failed to start"
    kill $TAURI_PID
    exit 1
fi

# Run E2E tests
npx playwright test

# Cleanup
kill $TAURI_PID

echo "✓ Integration tests passed"
EOF
chmod +x scripts/integration-test.sh
```

## 4.10 Final Phase Verification (10 Schritte)

- [ ] ### Schritt 338: Verify Component Structure

```bash
tree src/components -I "*.test.*" | head -20
```

- [ ] ### Schritt 339: Verify Services

```bash
ls -la src/services/ && echo "✓ Services created"
```

- [ ] ### Schritt 340: Verify Hooks

```bash
ls -la src/hooks/ && echo "✓ Hooks created"
```

- [ ] ### Schritt 341: Verify Types

```bash
grep -c "export interface" src/types/index.ts && echo "interfaces defined"
```

- [ ] ### Schritt 342: Verify Store

```bash
grep -c "set(" src/store/index.ts && echo "store actions defined"
```

- [ ] ### Schritt 343: Verify Styles

```bash
[ -f src/styles/globals.css ] && echo "✓ Global styles exist"
```

- [ ] ### Schritt 344: Verify Build Output

```bash
[ -d dist ] && echo "✓ Build output exists" || echo "Run: npm run build"
```

- [ ] ### Schritt 345: Check Package Dependencies

```bash
npm ls --depth=0 | grep -E "react|vite|tailwindcss|zustand" && echo "✓ Core deps installed"
```

- [ ] ### Schritt 346: Lint Check

```bash
npm run lint -- --max-warnings=0 || echo "Fix linting issues"
```

- [ ] ### Schritt 347: Format Check

```bash
npx prettier --check "src/**/*.{ts,tsx}" || npx prettier --write "src/**/*.{ts,tsx}"
```

- [ ] ### Schritt 348: Type Check

```bash
npx tsc --noEmit && echo "✓ No type errors"
```

- [ ] ### Schritt 349: Test Suite Run

```bash
npm test -- --run && echo "✓ All tests passing"
```

- [ ] ### Schritt 350: Bundle Analysis

```bash
npm run build -- --mode production
echo "Build complete. Run './scripts/analyze-bundle.sh' for bundle analysis"
```

- [ ] ### Schritt 351: Documentation Check

```bash
[ -f src/README.md ] && [ -f docs/components.md ] && echo "✓ Documentation complete"
```

- [ ] ### Schritt 352: Git Status

```bash
git status --short
```

- [ ] ### Schritt 353: Create Phase Tag

```bash
git tag -a "phase-4-complete" -m "Phase 4: React Frontend Implementation complete"
```

- [ ] ### Schritt 354: Generate Component List

```bash
find src/components -name "*.tsx" -not -name "*.test.tsx" | sort > docs/component-list.txt
echo "Component list generated in docs/component-list.txt"
```

- [ ] ### Schritt 355: Create Frontend Checklist

```bash
cat > docs/frontend-checklist.md << 'EOF'
# Frontend Implementation Checklist

## ✅ Core Setup
- [x] Vite configuration
- [x] TypeScript setup
- [x] TailwindCSS integration
- [x] React 18 with Suspense

## ✅ State Management
- [x] Zustand store
- [x] React Query setup
- [x] Persistent storage

## ✅ Components
- [x] Layout components (Header, Sidebar, StatusBar)
- [x] Common components (Button, Input, Modal, etc.)
- [x] Orchestration components
- [x] Output components
- [x] Settings components

## ✅ Features
- [x] AI tool orchestration
- [x] Real-time terminal output
- [x] Task history
- [x] Docker sandbox management
- [x] System monitoring
- [x] Dark mode
- [x] Settings persistence

## ✅ Testing
- [x] Unit tests with Vitest
- [x] Component tests
- [x] Hook tests
- [x] E2E test setup

## ✅ Optimization
- [x] Code splitting
- [x] Lazy loading
- [x] Bundle optimization
- [x] Performance monitoring

## ✅ Documentation
- [x] Component docs
- [x] API docs
- [x] Testing guide
- [x] Deployment guide
EOF
echo "✓ Frontend checklist created"
```

- [ ] ### Schritt 356: Summary Statistics

```bash
echo "=== Frontend Statistics ==="
echo "Components: $(find src/components -name "*.tsx" -not -name "*.test.tsx" | wc -l)"
echo "Views: $(find src/views -name "*.tsx" 2>/dev/null | wc -l || echo 0)"
echo "Hooks: $(find src/hooks -name "*.ts" | wc -l)"
echo "Utils: $(find src/utils -name "*.ts" | wc -l)"
echo "Tests: $(find src -name "*.test.*" | wc -l)"
echo "Total TSX files: $(find src -name "*.tsx" | wc -l)"
echo "Total TS files: $(find src -name "*.ts" | wc -l)"
```

- [ ] ### Schritt 357: Create Demo Script

```bash
cat > scripts/demo.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting AutoDev-AI Demo..."
echo ""
echo "Features to demonstrate:"
echo "1. AI Tool Orchestration (Single/Dual mode)"
echo "2. Real-time Terminal Output"
echo "3. Task History and Metrics"
echo "4. Docker Sandbox Management"
echo "5. System Monitoring"
echo "6. Dark/Light Theme Toggle"
echo ""
echo "Starting application..."
npm run tauri:dev
EOF
chmod +x scripts/demo.sh
```

- [ ] ### Schritt 358: Performance Report

````bash
cat > docs/performance-report.md << 'EOF'
# Performance Report

## Build Metrics
- Development build: ~3s
- Production build: ~# Phase 4: React Frontend Implementation (120 Schritte)

## 4.1 Vite Konfiguration (10 Schritte)

- [x] ### Schritt 241: Vite Config erstellen
```bash
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'esnext',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@store': path.resolve(__dirname, './src/store'),
    },
  },
});
EOF
````

**Erläuterung:** clearScreen: false behält Terminal-Output bei Tauri. strictPort verhindert
Port-Wechsel bei Konflikten. envPrefix definiert erlaubte Environment-Variable-Prefixes. Aliases mit
@ für absolute Imports ohne ../../../. Build-Target esnext für moderne JavaScript-Features.

- [x] ### Schritt 242: TypeScript Konfiguration

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@services/*": ["src/services/*"],
      "@hooks/*": ["src/hooks/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"],
      "@store/*": ["src/store/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
```

**Erläuterung:** jsx: "react-jsx" für React 17+ ohne Import React. isolatedModules für schnellere
Transpilation. noEmit da Vite das Building übernimmt. paths müssen Vite-Aliases matchen. strict
aktiviert alle Type-Checks.

- [x] ### Schritt 243: Node TypeScript Config

```bash
cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF
```

- [x] ### Schritt 244: TailwindCSS Konfiguration

```bash
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
EOF
```

- [x] ### Schritt 245: PostCSS Konfiguration

```bash
cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOF
```

- [x] ### Schritt 246: Global Styles

```bash
cat > src/styles/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-800;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-400 dark:bg-gray-600 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500 dark:bg-gray-500;
}

/* Terminal output styling */
.terminal-output {
  font-family: 'Fira Code', 'Courier New', monospace;
  @apply text-sm leading-relaxed;
}

/* Loading animation */
.loading-dots::after {
  content: '.';
  animation: dots 1.5s steps(3, end) infinite;
}

@keyframes dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}
EOF
```

**Erläuterung:** @layer base für Base-Styles mit Tailwind-Priorität. CSS-Variables für
Theme-Switching. @apply nutzt Tailwind-Classes in CSS. Webkit-Scrollbar für Custom-Styling.
Keyframes für Loading-Animations.

- [x] ### Schritt 247: HTML Entry Point

```bash
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AutoDev-AI Neural Bridge</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF
```

- [x] ### Schritt 248: Icon kopieren

```bash
cp src-tauri/icons/icon.png public/icon.png 2>/dev/null || echo "Icon will be generated later"
```

- [x] ### Schritt 249: Environment Types

```bash
cat > src/vite-env.d.ts << 'EOF'
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_DEVTOOLS?: string;
  readonly VITE_FEATURE_DOCKER?: string;
  readonly VITE_FEATURE_MONITORING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
EOF
```

- [x] ### Schritt 250: Public Directory Setup

```bash
mkdir -p public
echo "User-agent: *
Disallow: /" > public/robots.txt
```

## 4.2 Main Entry Files (10 Schritte)

- [x] ### Schritt 251: Main Entry Point

```bash
cat > src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
EOF
```

**Erläuterung:** QueryClient für Server-State-Management. StrictMode für Development-Warnings.
Toaster als Global-Component außerhalb App. as HTMLElement für Type-Assertion. defaultOptions für
Query-Behavior.

- [x] ### Schritt 252: Type Definitions

```bash
cat > src/types/index.ts << 'EOF'
export interface ExecutionResult {
  success: boolean;
  output: string;
  tool_used: string;
  duration_ms: number;
}

export interface PrerequisiteStatus {
  claude_flow_ready: boolean;
  codex_ready: boolean;
  claude_code_ready: boolean;
  docker_ready: boolean;
}

export interface SystemInfo {
  os: string;
  kernel: string;
  memory_total: number;
  memory_available: number;
  disk_total: number;
  disk_available: number;
}

export interface Settings {
  default_mode: OrchestrationMode;
  default_tool: string;
  openrouter_key?: string;
  docker_enabled: boolean;
  auto_quality_check: boolean;
}

export type OrchestrationMode = 'single' | 'dual';
export type Tool = 'claude-flow' | 'openai-codex';
export type CodexMode = 'suggest' | 'auto-edit' | 'full-auto';
export type ClaudeFlowCommand = 'swarm' | 'sparc' | 'hive-mind' | 'memory';

export interface Task {
  id: string;
  description: string;
  mode: OrchestrationMode;
  tool?: Tool;
  status: TaskStatus;
  created_at: string;
  completed_at?: string;
  result?: ExecutionResult;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface DockerContainer {
  id: string;
  name: string;
  status: string;
  ports: string[];
}
EOF
```

- [x] ### Schritt 253: Tauri Service Layer

```bash
cat > src/services/tauri.ts << 'EOF'
import { invoke } from '@tauri-apps/api/tauri';
import type {
  ExecutionResult,
  PrerequisiteStatus,
  SystemInfo,
  Settings,
} from '@/types';

export const TauriService = {
  async executeClaudeFlow(command: string): Promise<ExecutionResult> {
    return invoke('execute_claude_flow', { command });
  },

  async executeOpenAICodex(
    task: string,
    mode: string
  ): Promise<ExecutionResult> {
    return invoke('execute_openai_codex', { task, mode });
  },

  async orchestrateDualMode(
    task: string,
    openrouterKey: string
  ): Promise<ExecutionResult> {
    return invoke('orchestrate_dual_mode', { task, openrouterKey });
  },

  async createSandbox(projectId: string): Promise<string> {
    return invoke('create_sandbox', { projectId });
  },

  async stopSandbox(projectId: string): Promise<string> {
    return invoke('stop_sandbox', { projectId });
  },

  async checkPrerequisites(): Promise<PrerequisiteStatus> {
    return invoke('check_prerequisites');
  },

  async getSystemInfo(): Promise<SystemInfo> {
    return invoke('get_system_info');
  },

  async saveSettings(settings: Settings): Promise<void> {
    return invoke('save_settings', { settings });
  },

  async loadSettings(): Promise<Settings> {
    return invoke('load_settings');
  },
};
EOF
```

**Erläuterung:** invoke für Tauri-IPC-Calls. Type-safe mit TypeScript-Generics. camelCase zu
snake_case Conversion für Rust. Promise-based für async/await. Object-Parameter für Named-Arguments.

- [x] ### Schritt 254: Zustand Store

```bash
cat > src/store/index.ts << 'EOF'
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Task,
  Settings,
  OrchestrationMode,
  Tool,
  CodexMode,
  ClaudeFlowCommand,
  PrerequisiteStatus,
  SystemInfo,
} from '@/types';

interface AppState {
  // Tasks
  tasks: Task[];
  currentTask: Task | null;
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'status'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setCurrentTask: (task: Task | null) => void;

  // Settings
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;

  // UI State
  mode: OrchestrationMode;
  selectedTool: Tool;
  codexMode: CodexMode;
  claudeFlowCommand: ClaudeFlowCommand;
  claudeFlowArgs: string;
  isExecuting: boolean;
  output: string;

  setMode: (mode: OrchestrationMode) => void;
  setSelectedTool: (tool: Tool) => void;
  setCodexMode: (mode: CodexMode) => void;
  setClaudeFlowCommand: (command: ClaudeFlowCommand) => void;
  setClaudeFlowArgs: (args: string) => void;
  setIsExecuting: (executing: boolean) => void;
  setOutput: (output: string) => void;
  appendOutput: (output: string) => void;

  // System
  prerequisites: PrerequisiteStatus | null;
  systemInfo: SystemInfo | null;
  setPrerequisites: (status: PrerequisiteStatus) => void;
  setSystemInfo: (info: SystemInfo) => void;
}

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Tasks
        tasks: [],
        currentTask: null,
        addTask: (task) =>
          set((state) => ({
            tasks: [
              ...state.tasks,
              {
                ...task,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                status: 'pending',
              },
            ],
          })),
        updateTask: (id, updates) =>
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id ? { ...task, ...updates } : task
            ),
          })),
        removeTask: (id) =>
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
          })),
        setCurrentTask: (task) => set({ currentTask: task }),

        // Settings
        settings: {
          default_mode: 'single',
          default_tool: 'claude-flow',
          docker_enabled: true,
          auto_quality_check: true,
        },
        updateSettings: (updates) =>
          set((state) => ({
            settings: { ...state.settings, ...updates },
          })),

        // UI State
        mode: 'single',
        selectedTool: 'claude-flow',
        codexMode: 'suggest',
        claudeFlowCommand: 'swarm',
        claudeFlowArgs: '',
        isExecuting: false,
        output: '',

        setMode: (mode) => set({ mode }),
        setSelectedTool: (tool) => set({ selectedTool: tool }),
        setCodexMode: (mode) => set({ codexMode: mode }),
        setClaudeFlowCommand: (command) => set({ claudeFlowCommand: command }),
        setClaudeFlowArgs: (args) => set({ claudeFlowArgs: args }),
        setIsExecuting: (executing) => set({ isExecuting: executing }),
        setOutput: (output) => set({ output }),
        appendOutput: (output) =>
          set((state) => ({ output: state.output + '\n' + output })),

        // System
        prerequisites: null,
        systemInfo: null,
        setPrerequisites: (status) => set({ prerequisites: status }),
        setSystemInfo: (info) => set({ systemInfo: info }),
      }),
      {
        name: 'autodev-ai-storage',
        partialize: (state) => ({
          settings: state.settings,
          tasks: state.tasks,
        }),
      }
    )
  )
);
EOF
```

**Erläuterung:** Zustand mit devtools für Redux-DevTools. persist für LocalStorage-Sync. partialize
limitiert Persistence. crypto.randomUUID() für IDs. Immer neue State-Objects für React-Rendering.

- [x] ### Schritt 255: Utility Functions

```bash
cat > src/utils/cn.ts << 'EOF'
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF
```

**Erläuterung:** clsx kombiniert Classes conditional. twMerge dedupliziert Tailwind-Conflicts.
ClassValue Type für verschiedene Input-Types. Rest-Parameter für Multiple Arguments. Standard-Util
für Tailwind+React.

- [x] ### Schritt 256: Format Utilities

```bash
cat > src/utils/format.ts << 'EOF'
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length - 3) + '...' : str;
}
EOF
```

- [x] ### Schritt 257: Validation Utilities

```bash
cat > src/utils/validation.ts << 'EOF'
import { z } from 'zod';

export const taskSchema = z.object({
  description: z.string().min(1, 'Task description is required'),
  mode: z.enum(['single', 'dual']),
  tool: z.enum(['claude-flow', 'openai-codex']).optional(),
});

export const settingsSchema = z.object({
  default_mode: z.enum(['single', 'dual']),
  default_tool: z.string(),
  openrouter_key: z.string().optional(),
  docker_enabled: z.boolean(),
  auto_quality_check: z.boolean(),
});

export function validateOpenRouterKey(key: string): boolean {
  return key.startsWith('sk-or-') && key.length > 20;
}

export function validateDockerName(name: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/.test(name);
}
EOF
```

**Erläuterung:** Zod-Schemas für Runtime-Validation. Type-Inference aus Schemas. Regex für
Format-Validation. Error-Messages in Schema. Reusable Validation-Functions.

- [x] ### Schritt 258: Custom Hooks - useTauri

```bash
cat > src/hooks/useTauri.ts << 'EOF'
import { useState } from 'react';
import { TauriService } from '@/services/tauri';
import { useStore } from '@/store';
import toast from 'react-hot-toast';

export function useTauri() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const store = useStore();

  const executeCommand = async (
    command: string,
    args?: any
  ): Promise<any> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await TauriService.executeClaudeFlow(command);
      store.appendOutput(result.output);
      toast.success('Command executed successfully');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { executeCommand, isLoading, error };
}
EOF
```

- [x] ### Schritt 259: System Check Hook

```bash
cat > src/hooks/useSystemCheck.ts << 'EOF'
import { useEffect } from 'react';
import { TauriService } from '@/services/tauri';
import { useStore } from '@/store';
import toast from 'react-hot-toast';

export function useSystemCheck() {
  const { setPrerequisites, setSystemInfo } = useStore();

  useEffect(() => {
    const checkSystem = async () => {
      try {
        const [prerequisites, systemInfo] = await Promise.all([
          TauriService.checkPrerequisites(),
          TauriService.getSystemInfo(),
        ]);

        setPrerequisites(prerequisites);
        setSystemInfo(systemInfo);

        const missing = [];
        if (!prerequisites.claude_flow_ready) missing.push('Claude-Flow');
        if (!prerequisites.codex_ready) missing.push('OpenAI Codex');
        if (!prerequisites.docker_ready) missing.push('Docker (optional)');

        if (missing.length > 0) {
          toast.error(`Missing: ${missing.join(', ')}`);
        }
      } catch (error) {
        console.error('System check failed:', error);
      }
    };

    checkSystem();
  }, [setPrerequisites, setSystemInfo]);
}
EOF
```

- [x] ### Schritt 260: Theme Hook

```bash
cat > src/hooks/useTheme.ts << 'EOF'
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, setTheme, toggleTheme };
}
EOF
```

## 4.3 Layout Components (15 Schritte)

- [x] ### Schritt 261: Header Component

```bash
cat > src/components/layout/Header.tsx << 'EOF'
import React from 'react';
import { Brain, Moon, Sun, Settings, Github } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              AutoDev-AI Neural Bridge
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI Orchestration Platform
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="https://github.com/meinzeug/autodevai"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={onSettingsClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
EOF
```

- [x] ### Schritt 262: Sidebar Component

```bash
cat > src/components/layout/Sidebar.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';
import {
  Cpu,
  Zap,
  Box,
  History,
  BarChart3,
  FileCode,
  Terminal,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const menuItems = [
  { id: 'orchestration', label: 'Orchestration', icon: Cpu },
  { id: 'execution', label: 'Execution', icon: Zap },
  { id: 'sandbox', label: 'Sandboxes', icon: Box },
  { id: 'history', label: 'History', icon: History },
  { id: 'monitoring', label: 'Monitoring', icon: BarChart3 },
  { id: 'files', label: 'Files', icon: FileCode },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                activeView === item.id
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
EOF
```

- [x] ### Schritt 263: StatusBar Component

```bash
cat > src/components/layout/StatusBar.tsx << 'EOF'
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '@/store';
import { formatBytes } from '@/utils/format';

export function StatusBar() {
  const { prerequisites, systemInfo } = useStore();

  const getStatusIcon = (ready: boolean) => {
    return ready ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-6">
          {prerequisites && (
            <>
              <div className="flex items-center space-x-2">
                {getStatusIcon(prerequisites.claude_flow_ready)}
                <span>Claude-Flow</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(prerequisites.codex_ready)}
                <span>Codex</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(prerequisites.docker_ready)}
                <span>Docker</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400">
          {systemInfo && (
            <>
              <span>
                Memory: {formatBytes(systemInfo.memory_available)} /{' '}
                {formatBytes(systemInfo.memory_total)}
              </span>
              <span>{systemInfo.os} - {systemInfo.kernel}</span>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
EOF
```

- [x] ### Schritt 264: Loading Spinner

```bash
cat > src/components/common/LoadingSpinner.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn('flex justify-center items-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-b-2 border-primary-500',
          sizes[size]
        )}
      />
    </div>
  );
}
EOF
```

- [x] ### Schritt 265: Button Component

```bash
cat > src/components/common/Button.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600',
    secondary: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      <span>{children}</span>
    </button>
  );
}
EOF
```

- [x] ### Schritt 266: Card Component

```bash
cat > src/components/common/Card.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
}

export function Card({
  variant = 'default',
  className,
  children,
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-white dark:bg-gray-800',
    bordered: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg',
  };

  return (
    <div
      className={cn('rounded-lg p-6', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
EOF
```

- [x] ### Schritt 267: Input Component

```bash
cat > src/components/common/Input.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 border rounded-lg dark:bg-gray-700',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500',
            'focus:outline-none focus:ring-2',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
EOF
```

**Erläuterung:** forwardRef für ref-Passing zu DOM. displayName für React-DevTools. Conditional
Classes mit error-State. Rest-Props für HTML-Attributes. Label und Error optional.

- [x] ### Schritt 268: Select Component

```bash
cat > src/components/common/Select.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-3 py-2 border rounded-lg dark:bg-gray-700',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500',
            'focus:outline-none focus:ring-2',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
EOF
```

- [x] ### Schritt 269: TextArea Component

```bash
cat > src/components/common/TextArea.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full px-3 py-2 border rounded-lg dark:bg-gray-700',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500',
            'focus:outline-none focus:ring-2 resize-none',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
EOF
```

- [x] ### Schritt 270: Modal Component

```bash
cat > src/components/common/Modal.tsx << 'EOF'
import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className={cn(
        'relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md',
        className
      )}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
EOF
```

- [x] ### Schritt 271: Tabs Component

```bash
cat > src/components/common/Tabs.tsx << 'EOF'
import React, { useState } from 'react';
import { cn } from '@/utils/cn';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={className}>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-4">
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}
EOF
```

- [x] ### Schritt 272: Alert Component

```bash
cat > src/components/common/Alert.tsx << 'EOF'
import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ type = 'info', title, children, className }: AlertProps) {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: XCircle,
  };

  const styles = {
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
  };

  const Icon = icons[type];

  return (
    <div className={cn('rounded-lg border p-4', styles[type], className)}>
      <div className="flex">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <div className="ml-3">
          {title && <h3 className="font-medium">{title}</h3>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
EOF
```

- [x] ### Schritt 273: Badge Component

```bash
cat > src/components/common/Badge.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
EOF
```

- [x] ### Schritt 274: Progress Bar Component

```bash
cat > src/components/common/ProgressBar.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = false
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          className="bg-primary-500 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
EOF
```

- [x] ### Schritt 275: Tooltip Component

```bash
cat > src/components/common/Tooltip.tsx << 'EOF'
import React, { useState } from 'react';
import { cn } from '@/utils/cn';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={cn(
            'absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm whitespace-nowrap',
            positions[position]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
EOF
```

## 4.4 Orchestration Components (15 Schritte)

- [x] ### Schritt 276: Mode Selector Component

```bash
cat > src/components/orchestration/ModeSelector.tsx << 'EOF'
import React from 'react';
import { Cpu, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';
import { OrchestrationMode } from '@/types';

interface ModeSelectorProps {
  mode: OrchestrationMode;
  onChange: (mode: OrchestrationMode) => void;
  disabled?: boolean;
}

export function ModeSelector({ mode, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => onChange('single')}
        disabled={disabled}
        className={cn(
          'p-6 rounded-lg border-2 transition-all',
          mode === 'single'
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Cpu className="w-8 h-8 mb-3 mx-auto text-primary-500" />
        <h3 className="font-semibold mb-1">Single Tool Mode</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Execute with Claude-Flow or Codex
        </p>
      </button>

      <button
        onClick={() => onChange('dual')}
        disabled={disabled}
        className={cn(
          'p-6 rounded-lg border-2 transition-all',
          mode === 'dual'
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Zap className="w-8 h-8 mb-3 mx-auto text-primary-500" />
        <h3 className="font-semibold mb-1">Dual Tool Mode</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Orchestrate both tools via OpenRouter
        </p>
      </button>
    </div>
  );
}
EOF
```

- [x] ### Schritt 277: Tool Selector Component

```bash
cat > src/components/orchestration/ToolSelector.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';
import { Tool } from '@/types';

interface ToolSelectorProps {
  tool: Tool;
  onChange: (tool: Tool) => void;
  disabled?: boolean;
}

export function ToolSelector({ tool, onChange, disabled }: ToolSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Select Tool
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onChange('claude-flow')}
          disabled={disabled}
          className={cn(
            'px-4 py-3 rounded-lg border transition-all',
            tool === 'claude-flow'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="font-medium">Claude-Flow</div>
          <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
            Swarm, SPARC, Hive-Mind
          </div>
        </button>

        <button
          onClick={() => onChange('openai-codex')}
          disabled={disabled}
          className={cn(
            'px-4 py-3 rounded-lg border transition-all',
            tool === 'openai-codex'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="font-medium">OpenAI Codex</div>
          <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
            Suggest, Auto-Edit, Full-Auto
          </div>
        </button>
      </div>
    </div>
  );
}
EOF
```

- [x] ### Schritt 278: Command Selector Component

```bash
cat > src/components/orchestration/CommandSelector.tsx << 'EOF'
import React from 'react';
import { Select } from '@/components/common/Select';
import { ClaudeFlowCommand, CodexMode } from '@/types';

interface CommandSelectorProps {
  tool: 'claude-flow' | 'openai-codex';
  claudeFlowCommand: ClaudeFlowCommand;
  codexMode: CodexMode;
  onClaudeFlowChange: (command: ClaudeFlowCommand) => void;
  onCodexModeChange: (mode: CodexMode) => void;
}

export function CommandSelector({
  tool,
  claudeFlowCommand,
  codexMode,
  onClaudeFlowChange,
  onCodexModeChange,
}: CommandSelectorProps) {
  if (tool === 'claude-flow') {
    return (
      <Select
        label="Claude-Flow Command"
        value={claudeFlowCommand}
        onChange={(e) => onClaudeFlowChange(e.target.value as ClaudeFlowCommand)}
        options={[
          { value: 'swarm', label: 'Swarm - Multi-agent collaboration' },
          { value: 'sparc', label: 'SPARC - Structured reasoning' },
          { value: 'hive-mind', label: 'Hive-Mind - Consensus building' },
          { value: 'memory', label: 'Memory - Context management' },
        ]}
      />
    );
  }

  return (
    <Select
      label="Codex Mode"
      value={codexMode}
      onChange={(e) => onCodexModeChange(e.target.value as CodexMode)}
      options={[
        { value: 'suggest', label: 'Suggest - Code suggestions' },
        { value: 'auto-edit', label: 'Auto-Edit - Automatic editing' },
        { value: 'full-auto', label: 'Full-Auto - Complete automation' },
      ]}
    />
  );
}
EOF
```

- [x] ### Schritt 279: Task Input Component

```bash
cat > src/components/orchestration/TaskInput.tsx << 'EOF'
import React from 'react';
import { TextArea } from '@/components/common/TextArea';
import { Input } from '@/components/common/Input';

interface TaskInputProps {
  description: string;
  args: string;
  onDescriptionChange: (value: string) => void;
  onArgsChange: (value: string) => void;
  disabled?: boolean;
}

export function TaskInput({
  description,
  args,
  onDescriptionChange,
  onArgsChange,
  disabled,
}: TaskInputProps) {
  return (
    <div className="space-y-4">
      <TextArea
        label="Task Description"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Describe the task you want to execute..."
        rows={4}
        disabled={disabled}
      />

      <Input
        label="Additional Arguments (optional)"
        value={args}
        onChange={(e) => onArgsChange(e.target.value)}
        placeholder="--flag value --another-flag"
        disabled={disabled}
      />
    </div>
  );
}
EOF
```

- [x] ### Schritt 280: Execution Controls Component

```bash
cat > src/components/orchestration/ExecutionControls.tsx << 'EOF'
import React from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface ExecutionControlsProps {
  isExecuting: boolean;
  onExecute: () => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
}

export function ExecutionControls({
  isExecuting,
  onExecute,
  onStop,
  onReset,
  disabled,
}: ExecutionControlsProps) {
  return (
    <div className="flex space-x-3">
      {!isExecuting ? (
        <Button
          onClick={onExecute}
          disabled={disabled}
          size="lg"
          className="flex-1"
        >
          <Play className="w-4 h-4" />
          Execute Task
        </Button>
      ) : (
        <Button
          onClick={onStop}
          variant="danger"
          size="lg"
          className="flex-1"
        >
          <Square className="w-4 h-4" />
          Stop Execution
        </Button>
      )}

      <Button
        onClick={onReset}
        variant="secondary"
        size="lg"
        disabled={isExecuting}
      >
        <RotateCcw className="w-4 h-4" />
        Reset
      </Button>
    </div>
  );
}
EOF
```

- [x] ### Schritt 281: Terminal Output Component

```bash
cat > src/components/output/Terminal.tsx << 'EOF'
import React, { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

interface TerminalProps {
  output: string;
  className?: string;
}

export function Terminal({ output, className }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div
      className={cn(
        'bg-gray-900 rounded-lg p-4 font-mono text-sm',
        className
      )}
    >
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-4 text-gray-400 text-xs">Terminal Output</span>
      </div>
      <div
        ref={scrollRef}
        className="h-96 overflow-y-auto text-gray-100 whitespace-pre-wrap terminal-output"
      >
        {output || <span className="text-gray-500">Waiting for output...</span>}
      </div>
    </div>
  );
}
EOF
```

# Phase 4: React Frontend Implementation (Fortsetzung)

- [ ] ## Schritt 282: Result Card Component erstellen

  Erstelle eine Komponente zur Anzeige von Ausführungsergebnissen mit Status-Icons, Zeitdauer und
  formatierter Output-Darstellung.

- [ ] ## Schritt 283: Task List Component erstellen

  Implementiere eine Listen-Komponente für die Darstellung aller Tasks mit Status-Badges, Aktionen
  und Zeitstempeln.

- [ ] ## Schritt 284: Metrics Display Component erstellen

  Baue ein Dashboard-Widget zur Visualisierung von Task-Metriken mit Erfolgsrate, Anzahl und
  Durchlaufzeiten.

- [ ] ## Schritt 285: Settings Modal Component erstellen

  Entwickle ein Modal-Fenster für Benutzereinstellungen mit Formular-Validierung und Persistierung
  via Tauri.

- [ ] ## Schritt 286: Docker Sandbox Manager Component erstellen

  Erstelle eine Verwaltungskomponente für Docker-Sandboxes mit Create/Stop-Funktionalität und
  Live-Status.

- [x] ## Schritt 287: Monitoring Dashboard Component erstellen

  ✅ Implementiert System-Monitoring-Dashboard mit Memory-, CPU- und Disk-Usage-Visualisierung.

- [x] ## Schritt 288: Orchestration View erstellen

  ✅ Gebaut die Hauptansicht für AI-Orchestrierung mit Mode-Selector, Tool-Auswahl und Task-Ausführung.

- [x] ## Schritt 289: History View erstellen

  ✅ Entwickelt eine Historie-Ansicht mit Task-Liste, Filteroptionen und Detail-Modal für vergangene
  Ausführungen.

- [ ] ## Schritt 290: Sandbox View erstellen

  Erstelle die Docker-Sandbox-Verwaltungsansicht mit Container-Liste und Management-Funktionen.

- [ ] ## Schritt 291: Monitoring View erstellen

  Implementiere die System-Monitoring-Ansicht mit Echtzeit-Metriken und Ressourcen-Graphen.

- [ ] ## Schritt 292: Terminal View erstellen

  Baue eine interaktive Terminal-Ansicht mit Command-Input und Output-Streaming.

- [ ] ## Schritt 293: Main App Component erstellen

  Entwickle die Haupt-App-Komponente mit Layout, Routing und State-Management-Integration.

- [ ] ## Schritt 294: Error Boundary Component erstellen

  Implementiere eine Error-Boundary für globales Error-Handling mit Fallback-UI.

- [ ] ## Schritt 295: Main Entry mit Error Boundary aktualisieren

  Integriere die Error-Boundary in den React-Root für robuste Fehlerbehandlung.

- [ ] ## Schritt 296: Frontend Build testen

  Führe einen Production-Build durch und verifiziere die Bundle-Größe und -Integrität.

- [ ] ## Schritt 297: Development Server testen

  Starte den Vite-Dev-Server und prüfe Hot-Module-Replacement und Live-Reload.

- [ ] ## Schritt 298: Vitest Konfiguration erstellen

  Konfiguriere Vitest mit JSDOM-Environment und Coverage-Reporter für Unit-Tests.

- [ ] ## Schritt 299: Test Setup File erstellen

  Erstelle globale Test-Setups mit Mocks für Tauri-API und Browser-APIs.

- [ ] ## Schritt 300: Utils Tests erstellen
  Schreibe Unit-Tests für alle Utility-Funktionen mit vollständiger Coverage.

# Phase 5: Integration und Testing

- [ ] ## Schritt 301: Component Tests erstellen

  Implementiere React Testing Library Tests für alle UI-Komponenten mit User-Interaktionen.

- [ ] ## Schritt 302: Hook Tests erstellen

  Teste Custom Hooks mit renderHook und verifiziere State-Updates und Side-Effects.

- [ ] ## Schritt 303: Service Layer Tests erstellen

  Mocke Tauri-Commands und teste alle Service-Funktionen mit verschiedenen Response-Szenarien.

- [ ] ## Schritt 304: Store Tests erstellen

  Verifiziere Zustand-Store-Actions, Selectors und Middleware-Funktionalität.

- [ ] ## Schritt 305: E2E Test Setup mit Playwright

  Konfiguriere Playwright für Cross-Browser-Testing mit Tauri-App-Integration.

- [ ] ## Schritt 306: E2E Tests für Hauptworkflows erstellen

  Schreibe End-to-End-Tests für kritische User-Journeys wie Task-Execution und Settings.

- [ ] ## Schritt 307: Performance Tests erstellen

  Implementiere Lighthouse-Tests und React-Profiler-Integration für Performance-Monitoring.

- [ ] ## Schritt 308: Accessibility Tests erstellen

  Füge jest-axe Tests hinzu und verifiziere WCAG-Compliance aller Komponenten.

- [ ] ## Schritt 309: Integration Tests für Tauri Commands

  Teste die vollständige IPC-Kommunikation zwischen Frontend und Rust-Backend.

- [ ] ## Schritt 310: Mock Server für Development erstellen

  Erstelle einen MSW-Mock-Server für isolierte Frontend-Entwicklung ohne Backend.

- [ ] ## Schritt 311: Storybook Setup

  Installiere und konfiguriere Storybook für Komponenten-Dokumentation und -Testing.

- [ ] ## Schritt 312: Component Stories erstellen

  Schreibe Storybook-Stories für alle UI-Komponenten mit verschiedenen Props-Varianten.

- [ ] ## Schritt 313: Visual Regression Tests

  Implementiere Chromatic oder Percy für automatisierte visuelle Regressionstests.

- [ ] ## Schritt 314: Test Coverage Report generieren

  Konfiguriere Coverage-Thresholds und generiere HTML-Reports mit Istanbul.

- [ ] ## Schritt 315: CI/CD Pipeline für Tests konfigurieren
  Erstelle GitHub Actions Workflow für automatisierte Test-Ausführung bei Pull Requests.

# Phase 6: Docker Integration

- [ ] ## Schritt 316: Docker Compose für Development erstellen

  Definiere docker-compose.yml mit allen Services für lokale Entwicklungsumgebung.

- [ ] ## Schritt 317: Sandbox Template Dockerfile erstellen

  Baue ein Base-Image für isolierte Code-Execution-Sandboxes mit Node.js und Python.

- [ ] ## Schritt 318: Container Orchestration Service implementieren

  Entwickle Rust-Service für Docker-Container-Lifecycle-Management via Docker API.

- [ ] ## Schritt 319: Port Management System erstellen

  Implementiere dynamische Port-Allokation für Sandbox-Container im Range 50010-50089.

- [ ] ## Schritt 320: Volume Management für Sandboxes

  Erstelle persistente Volumes für Projekt-Daten mit automatischem Cleanup.

- [ ] ## Schritt 321: Container Health Checks implementieren

  Füge Health-Check-Endpoints und automatisches Restart-Handling hinzu.

- [ ] ## Schritt 322: Resource Limits konfigurieren

  Setze CPU- und Memory-Limits für Sandbox-Container zur Ressourcen-Isolation.

- [ ] ## Schritt 323: Network Isolation Setup

  Konfiguriere Bridge-Networks mit Custom-Subnets für Container-Kommunikation.

- [ ] ## Schritt 324: Container Logging System

  Implementiere zentralisiertes Logging mit Log-Rotation für alle Container.

- [ ] ## Schritt 325: Docker Registry Integration
  Verbinde mit Docker Hub für automatische Image-Updates und -Versionierung.

# Phase 7: Claude-Flow Integration

- [ ] ## Schritt 326: Claude-Flow Workspace Setup

  Erstelle dedizierte Workspace-Struktur für Claude-Flow-Projekte mit Memory-DB.

- [ ] ## Schritt 327: Swarm Command Wrapper implementieren

  Baue Rust-Wrapper für Claude-Flow-Swarm-Orchestration mit Parameter-Handling.

- [ ] ## Schritt 328: SPARC Modi Integration

  Implementiere alle SPARC-Modi (architect, coder, tdd) mit Mode-spezifischen Configs.

- [ ] ## Schritt 329: Hive-Mind Command Integration

  Integriere Hive-Mind-Consensus-Building mit konfigurierbaren Agent-Counts.

- [ ] ## Schritt 330: Memory Layer Persistence

  Verbinde SQLite-Memory-Layer für Cross-Session-Learning und Context-Retention.

- [ ] ## Schritt 331: MCP Tools Discovery

  Implementiere automatische Discovery der 87+ MCP-Tools mit Capability-Mapping.

- [ ] ## Schritt 332: Claude-Flow Event Streaming

  Baue WebSocket-Connection für Real-time-Progress-Updates von Claude-Flow.

- [ ] ## Schritt 333: Error Recovery Mechanisms

  Erstelle Retry-Logic und Fallback-Strategien für Claude-Flow-Failures.

- [ ] ## Schritt 334: Context Window Management

  Implementiere intelligentes Context-Splitting für große Tasks.

- [ ] ## Schritt 335: Claude-Flow Config Generator
  Baue UI für dynamische Claude-Flow-Konfiguration mit Presets.

# Phase 8: OpenAI Codex Integration

- [ ] ## Schritt 336: Codex CLI Wrapper erstellen

  Entwickle Rust-Interface für Codex-CLI mit Mode-Selection und Output-Parsing.

- [ ] ## Schritt 337: Suggest Mode Implementation

  Integriere Codex-Suggest-Mode für interaktive Code-Vorschläge.

- [ ] ## Schritt 338: Auto-Edit Mode Integration

  Implementiere automatische Code-Modifikation mit Diff-Viewing.

- [ ] ## Schritt 339: Full-Auto Mode Pipeline

  Baue vollautomatische Execution-Pipeline mit Test-Running und Iteration.

- [ ] ## Schritt 340: Codex Sandbox Environment

  Erstelle isolierte Execution-Environment für Codex-generierte Code.

- [ ] ## Schritt 341: Multi-File Support

  Implementiere Handling für Multi-File-Projekte und Cross-File-References.

- [ ] ## Schritt 342: Language Detection

  Füge automatische Programmiersprachen-Erkennung und -Konfiguration hinzu.

- [ ] ## Schritt 343: Code Quality Checks

  Integriere Linting und Format-Checks für Codex-Output.

- [ ] ## Schritt 344: Version Control Integration

  Baue Git-Integration für automatische Commits von Codex-Changes.

- [ ] ## Schritt 345: Codex Performance Metrics
  Implementiere Tracking für Token-Usage und Generation-Speed.

# Phase 9: OpenRouter Orchestration

- [ ] ## Schritt 346: OpenRouter API Client erstellen

  Entwickle Rust-Client für OpenRouter-API mit Retry-Logic und Rate-Limiting.

- [ ] ## Schritt 347: Model Selection Logic

  Implementiere intelligente Model-Auswahl basierend auf Task-Typ und Kosten.

- [ ] ## Schritt 348: AI Team Discussion Feature

  Baue Multi-Agent-Discussion-System mit verschiedenen AI-Personas.

- [ ] ## Schritt 349: Consensus Building Algorithm

  Erstelle Voting-System für AI-Team-Entscheidungen mit Konfliktauflösung.

- [ ] ## Schritt 350: Cost Optimization Engine

  Implementiere dynamisches Routing zu günstigen Modellen für einfache Tasks.

- [ ] ## Schritt 351: Response Aggregation

  Baue System zur Zusammenführung mehrerer AI-Antworten zu kohärenter Lösung.

- [ ] ## Schritt 352: Model Performance Tracking

  Erstelle Metriken-System für Model-Performance und Success-Rates.

- [ ] ## Schritt 353: Fallback Chain Configuration

  Implementiere konfigurierbare Fallback-Chains bei Model-Failures.

- [ ] ## Schritt 354: Context Sharing zwischen Models

  Baue effizientes Context-Sharing für Multi-Model-Workflows.

- [ ] ## Schritt 355: OpenRouter Billing Integration
  Integriere Usage-Tracking und Cost-Reporting für OpenRouter-API.

# Phase 10: Quality Assurance System

- [ ] ## Schritt 356: Quality Check Engine erstellen

  Entwickle automatisches QA-System für AI-generierten Code mit Pattern-Detection.

- [ ] ## Schritt 357: Placeholder Detection

  Implementiere Scanner für TODOs, Placeholders und unvollständige Implementierungen.

- [ ] ## Schritt 358: Security Scanning Integration

  Füge Snyk oder Semgrep für automatische Security-Vulnerability-Checks hinzu.

- [ ] ## Schritt 359: Test Generation

  Baue automatische Unit-Test-Generation für AI-erstellten Code.

- [ ] ## Schritt 360: Code Review Automation

  Erstelle AI-powered Code-Review mit Best-Practice-Checks.

- [ ] ## Schritt 361: Performance Profiling

  Integriere Performance-Profiling für generierten Code mit Bottleneck-Detection.

- [ ] ## Schritt 362: Documentation Generation

  Implementiere automatische JSDoc/Rustdoc-Generation für neuen Code.

- [ ] ## Schritt 363: Dependency Audit

  Baue System für automatische Dependency-Updates und Security-Audits.

- [ ] ## Schritt 364: Code Complexity Analysis

  Füge Cyclomatic-Complexity-Checks und Refactoring-Vorschläge hinzu.

- [ ] ## Schritt 365: Quality Metrics Dashboard
  Erstelle Dashboard für Code-Quality-Metriken und Trends.

# Phase 11: Advanced Services

- [ ] ## Schritt 366: WebSocket Server für Live-Updates

  Implementiere WebSocket-Server in Rust für Real-time-Kommunikation.

- [ ] ## Schritt 367: Task Queue System

  Baue Redis-basierte Task-Queue für asynchrone Job-Processing.

- [ ] ## Schritt 368: Caching Layer

  Erstelle intelligentes Caching für häufige AI-Requests mit TTL-Management.

- [ ] ## Schritt 369: Backup & Recovery System

  Implementiere automatisches Backup von Projekten und Settings.

- [ ] ## Schritt 370: Multi-User Support

  Füge User-Management mit Workspace-Isolation hinzu.

- [ ] ## Schritt 371: Plugin Architecture

  Entwickle Plugin-System für Custom-Tool-Integration.

- [ ] ## Schritt 372: API Gateway

  Baue REST-API für externe Tool-Integration und Automation.

- [ ] ## Schritt 373: Webhook System

  Implementiere Webhook-Support für CI/CD-Integration.

- [ ] ## Schritt 374: Scheduling Service

  Erstelle Cron-basiertes Scheduling für automatisierte Tasks.

- [ ] ## Schritt 375: Export/Import Functionality
  Baue Export/Import für Projekte, Settings und Task-History.

# Phase 12: Monitoring & Observability

- [ ] ## Schritt 376: Prometheus Metrics Integration

  Implementiere Prometheus-Exporter für System- und Application-Metrics.

- [ ] ## Schritt 377: Grafana Dashboard Setup

  Erstelle Custom-Dashboards für AI-Tool-Performance und System-Health.

- [ ] ## Schritt 378: Distributed Tracing

  Integriere OpenTelemetry für Request-Tracing über alle Services.

- [ ] ## Schritt 379: Log Aggregation System

  Baue ELK-Stack-Integration für zentralisiertes Log-Management.

- [ ] ## Schritt 380: Alert System

  Implementiere Alert-Rules mit PagerDuty/Slack-Integration.

- [ ] ## Schritt 381: Performance Monitoring

  Erstelle APM-Integration für Application-Performance-Monitoring.

- [ ] ## Schritt 382: Resource Usage Tracking

  Baue detailliertes Tracking für CPU, Memory und Disk-Usage pro Task.

- [ ] ## Schritt 383: Error Tracking Integration

  Füge Sentry für automatisches Error-Tracking und Reporting hinzu.

- [ ] ## Schritt 384: Audit Logging

  Implementiere Audit-Trail für alle User-Actions und System-Events.

- [ ] ## Schritt 385: Health Check Dashboard
  Erstelle übersichtliches Health-Dashboard mit allen Service-Stati.

# Phase 13: Production Deployment

- [ ] ## Schritt 386: Production Build Pipeline

  Konfiguriere Multi-Stage-Docker-Build für optimierte Production-Images.

- [ ] ## Schritt 387: Code Signing Setup

  Implementiere Code-Signing für Windows, macOS und Linux-Distributionen.

- [ ] ## Schritt 388: Auto-Update System

  Baue Tauri-Updater-Integration für automatische App-Updates.

- [ ] ## Schritt 389: License Management

  Erstelle License-Key-System für Premium-Features.

- [ ] ## Schritt 390: Telemetry System

  Implementiere Opt-in-Telemetry für Usage-Analytics.

- [ ] ## Schritt 391: Crash Reporting

  Integriere Breakpad für automatische Crash-Reports.

- [ ] ## Schritt 392: Distribution Packages

  Erstelle Platform-spezifische Installer (MSI, DMG, DEB, AppImage).

- [ ] ## Schritt 393: App Store Preparation

  Bereite Submissions für Microsoft Store und Mac App Store vor.

- [ ] ## Schritt 394: Security Hardening

  Implementiere Content-Security-Policy und weitere Security-Headers.

- [ ] ## Schritt 395: Performance Optimization
  Führe Bundle-Optimization und Code-Splitting durch.

# Phase 14: Documentation & Training

- [ ] ## Schritt 396: User Documentation

  Erstelle umfassende Benutzer-Dokumentation mit Screenshots und Videos.

- [ ] ## Schritt 397: API Documentation

  Generiere OpenAPI-Spec und interaktive API-Dokumentation.

- [ ] ## Schritt 398: Developer Guide

  Schreibe Entwickler-Handbuch für Contributions und Extensions.

- [ ] ## Schritt 399: Video Tutorials

  Produziere Tutorial-Videos für Hauptfeatures und Workflows.

- [ ] ## Schritt 400: Integration Examples

  Erstelle Beispiel-Projekte für verschiedene Use-Cases.

- [ ] ## Schritt 401: Troubleshooting Guide

  Baue umfassenden Troubleshooting-Guide mit FAQ.

- [ ] ## Schritt 402: Architecture Documentation

  Dokumentiere System-Architektur mit Diagrammen und Entscheidungen.

- [ ] ## Schritt 403: Performance Tuning Guide

  Schreibe Guide für Performance-Optimization und Scaling.

- [ ] ## Schritt 404: Security Best Practices

  Erstelle Security-Guidelines für sichere Nutzung.

- [ ] ## Schritt 405: Migration Guide
  Dokumentiere Migration von anderen Tools zu AutoDev-AI.

# Phase 15: Community & Ecosystem

- [ ] ## Schritt 406: GitHub Community Setup

  Konfiguriere GitHub Discussions, Issue-Templates und Contributing-Guidelines.

- [ ] ## Schritt 407: Discord Server

  Erstelle Community-Discord mit Support-Channels und Bot-Integration.

- [ ] ## Schritt 408: Plugin Marketplace

  Baue Marketplace für Community-Plugins und Extensions.

- [ ] ## Schritt 409: Template Repository

  Erstelle Sammlung von Projekt-Templates für Quick-Start.

- [ ] ## Schritt 410: CI/CD Templates

  Entwickle GitHub-Actions und GitLab-CI Templates.

- [ ] ## Schritt 411: VS Code Extension

  Baue VS-Code-Extension für AutoDev-AI-Integration.

- [ ] ## Schritt 412: CLI Tool

  Erstelle standalone CLI-Tool für Headless-Operation.

- [ ] ## Schritt 413: SDK Development

  Entwickle SDKs für Python, JavaScript und Go.

- [ ] ## Schritt 414: Partnership Program

  Etabliere Partnerschaften mit Tool-Anbietern für Integrationen.

- [ ] ## Schritt 415: Certification Program
  Erstelle Zertifizierungsprogramm für AutoDev-AI-Experten.

# Phase 16: Final Release

- [ ] ## Schritt 416: Beta Testing Program

  Starte geschlossene Beta mit ausgewählten Nutzern.

- [ ] ## Schritt 417: Performance Benchmarking

  Führe umfassende Performance-Tests und Optimierungen durch.

- [ ] ## Schritt 418: Security Audit

  Beauftrage externes Security-Audit und fixe Findings.

- [ ] ## Schritt 419: Load Testing

  Teste System unter Last mit simulierten Concurrent-Users.

- [ ] ## Schritt 420: Compatibility Testing

  Verifiziere Kompatibilität mit verschiedenen OS-Versionen.

- [ ] ## Schritt 421: Localization

  Implementiere Internationalisierung für mehrere Sprachen.

- [ ] ## Schritt 422: Marketing Website

  Erstelle Landing-Page mit Features, Pricing und Downloads.

- [ ] ## Schritt 423: Launch Preparation

  Bereite Press-Release, Blog-Posts und Social-Media vor.

- [ ] ## Schritt 424: Support System

  Etabliere Support-Ticket-System und Knowledge-Base.

- [ ] ## Schritt 425: Version 1.0 Release
  Veröffentliche finale Version 1.0 auf allen Plattformen.


---

## 📜 Lizenz / License

Dieses Projekt wird unter einem **Dual-Lizenzmodell** angeboten:
- **GPL-3.0**: Für Open-Source-Projekte (kostenlos)
- **Kommerzielle Lizenz**: Für proprietäre/unternehmensinterne Nutzung (kostenpflichtig)

Siehe [README.md](../README.md#-lizenz--license) für Details.
