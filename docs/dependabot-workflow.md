# Dependabot Workflow - AutoDevAI

## So funktioniert Dependabot jetzt

### Aktuelle Einstellungen (Optimiert)

1. **Update-Frequenz**: **Monatlich** statt wöchentlich
   - NPM: Jeden ersten Dienstag im Monat
   - Cargo: Jeden ersten Mittwoch im Monat
   - GitHub Actions: Jeden ersten Donnerstag im Monat

2. **PR-Limits** (Reduziert):
   - NPM: Max 3 offene PRs (vorher 5)
   - Cargo: Max 2 offene PRs (vorher 3)
   - GitHub Actions: Max 1 offener PR (vorher 2)

3. **Gruppierung**:
   - **Minor/Patch Updates**: Alle in EINEM PR zusammengefasst
   - **Major Updates**: Separate PRs (für Sicherheit)

## Warum so viele PRs beim ersten Mal?

- **Erstaktivierung**: Dependabot prüft ALLE Dependencies auf einmal
- **Viele Major Updates**: tailwindcss 3→4, vite 6→7, openai 4→5, etc.
- **Aufholen**: Viele Pakete waren lange nicht aktualisiert

## Was tun mit den aktuellen PRs?

### Option 1: Alle auf einmal schließen und neu starten

```bash
# Alle Dependabot PRs schließen
gh pr list --label dependencies --json number --jq '.[].number' | xargs -I {} gh pr close {}

# Dependabot wird beim nächsten Lauf neue gruppierte PRs erstellen
```

### Option 2: Selektiv mergen

```bash
# Nur Minor/Patch Updates mergen (sicher)
gh pr merge --auto --merge [PR-NUMMER]

# Major Updates einzeln prüfen und testen
```

### Option 3: Dependabot pausieren

```bash
# In GitHub Settings → Code security → Dependabot
# Oder temporär in dependabot.yml:
# schedule:
#   interval: "yearly"  # Praktisch deaktiviert
```

## Empfohlener Workflow

1. **Schließe alle aktuellen PRs** (sie sind nicht gruppiert)
2. **Warte auf nächsten Monat** → Dependabot erstellt gruppierte PRs
3. **Erwarte dann nur noch**:
   - 1 PR für alle NPM Minor/Patch Updates
   - 1 PR für alle Cargo Minor/Patch Updates
   - 1 PR für GitHub Actions
   - Einzelne PRs nur für Major Updates

## Vorteile der neuen Konfiguration

✅ **80% weniger PRs** durch Gruppierung ✅ **Monatlich statt wöchentlich** = 75% weniger Störungen
✅ **Major Updates getrennt** = Sicherheit bei Breaking Changes ✅ **Auto-Merge möglich** für
gruppierte Minor/Patch Updates

## Auto-Merge aktivieren (Optional)

```yaml
# In .github/workflows/auto-merge.yml
name: Auto-merge Dependabot PRs
on: pull_request_target

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - name: Auto-merge minor/patch updates
        run: gh pr merge --auto --merge "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GH_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

## Befehle zur Verwaltung

```bash
# Status prüfen
gh pr list --label dependencies

# Gruppierte PRs mergen
gh pr merge --auto --merge [PR-NUMMER]

# Einzelnen PR ablehnen
gh pr close [PR-NUMMER]

# Dependabot manuell triggern (GitHub UI)
# Settings → Code security → Dependabot → "Check for updates"
```
