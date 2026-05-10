# CONCEPT — Projekt-Tracker

Fachliches Konzept der App. Quelle der Anforderungen: `mvp-brainstorming.md` + Klärungs-Antworten des Users in den Plan-Phasen.

## Vision

Eine Mobile-App (iOS, Android, optional Web) für den User (Foto-/Designer-Freelancer), die:
1. Aktive Projekte auf einer übersichtlichen Startseite anzeigt
2. Per Tap/Swipe **Zeit-Tracking** startet/stoppt
3. Jede getrackte Zeitspanne einer **Aufgabe** zuordnet
4. Pro Projekt **Stundensatz** ODER **Festpreis** rechnet
5. Monatliche **Excel-Reports** pro Kunde generiert

Architektur ist Multi-Tenant-fähig vorbereitet (siehe `SAAS_READINESS.md`), läuft im MVP aber Single-User.

## Domain-Glossar

| Begriff | Beschreibung |
|---|---|
| **User** | Single-User im MVP. Owner aller Daten. JWT enthält `userId`. |
| **Kunde** | Auftraggeber. Hat eindeutige Kundennummer (siehe Algorithmus unten). |
| **Auftragsart** | Lookup-Wert (Hochzeitsfoto, Porträt, Business, Design, …). Hat einstellige Ziffer für die Kundennummern-Bildung. |
| **Projekt** | Zentrale Trackingeinheit. Gehört zu genau einem Kunden, hat Pricing (Stundensatz oder Festpreis), Farbe, Status (aktiv/abgeschlossen). |
| **Aufgabe** | Wiederverwendbarer Tätigkeits-Eintrag (z.B. „Bildbearbeitung", „Konzeption"). Globale Liste pro User. m:n zu Projekten. |
| **Stichwort/Tag** | Schlagwort an Aufgabe (z.B. „Website", „Gutschein"). m:n zu Aufgaben. |
| **Zeiteintrag** | Eine Zeitspanne (Start/Ende) gebunden an Projekt + Aufgabe. Friert den geltenden Stundensatz ein. |
| **Timer** | Aktueller laufender Zustand pro Projekt (Start-Zeitstempel). Nur ein Timer global aktiv (Empfehlung — siehe Open Question 1). |

## User Stories (MVP)

| ID | Als … | will ich … | damit … |
|---|---|---|---|
| US-1 | User | aktive Projekte als farbige Kacheln auf der Startseite sehen | ich schnell den Überblick habe |
| US-2 | User | per Tap/Swipe einen Timer für ein Projekt starten | ich Zeit ohne Umweg erfassen kann |
| US-3 | User | per Tap/Swipe den Timer stoppen und dabei eine Aufgabe wählen | die Zeit korrekt verbucht wird |
| US-4 | User | über `+`-Icon ein neues Projekt anlegen (Titel, Auftraggeber, Beschreibung, Farbe, Pricing, Aufgaben) | ohne Menü-Umweg starten kann |
| US-5 | User | einen neuen Kunden mit auto-generierter Kundennummer anlegen | das Nummern-Schema konsistent bleibt |
| US-6 | User | im Projekt-Detail Gesamtzeit + Gesamtkosten sehen | den Projekt-Stand kenne |
| US-7 | User | bei Festpreis-Projekten den „relativen Stundensatz" sehen (Festpreis ÷ getrackte Stunden) | meine Kalkulation prüfen kann |
| US-8 | User | einen Excel-Export für einen Zeitraum (Default: aktueller Monat) erzeugen | Rechnungen / Reports liefern kann |
| US-9 | User | eine globale Aufgabenliste pflegen (anlegen, mit Stichworten taggen) | Aufgaben über Projekte hinweg wiederverwenden kann |
| US-10 | User | die App per PIN/Biometrie sperren | Geräte-Diebstahl meine Daten nicht offenlegt |
| US-11 | User | offline tracken können | Funklöcher und Flugmodus den Workflow nicht blockieren |

## UI-Flows (ASCII-Wireframes)

### Startseite
```
┌──────────────────────────────────────┐
│  Projekt-Tracker            [⚙][👤] │
├──────────────────────────────────────┤
│  Aktiv: ▶ "Hochzeit Müller" 01:23:45 │
├──────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐          │
│  │ Hochzeit │  │ Webdesign│          │
│  │ Müller   │  │ Schmidt  │          │
│  │ 🟦 ▶     │  │ 🟩 ▶     │          │
│  └──────────┘  └──────────┘          │
│  ┌──────────┐  ┌──────────┐          │
│  │ Porträt  │  │ Logo     │          │
│  │ Becker   │  │ Huber    │          │
│  │ 🟧 ▶     │  │ 🟪 ▶     │          │
│  └──────────┘  └──────────┘          │
│                                      │
│                              [ + ]   │
└──────────────────────────────────────┘
```

### Stop-Modal (Aufgabenauswahl)
```
┌──────────────────────────────────────┐
│  Timer stoppen — 01:23:45            │
│  Projekt: "Hochzeit Müller"          │
├──────────────────────────────────────┤
│  Welche Aufgabe?                     │
│                                      │
│  ◉  Bildbearbeitung                  │
│  ○  Shooting                         │
│  ○  Kundengespräch                   │
│  ○  + neue Aufgabe                   │
│                                      │
│         [Abbrechen]  [Speichern]     │
└──────────────────────────────────────┘
```

### Neues Projekt
```
┌──────────────────────────────────────┐
│  ← Neues Projekt                     │
├──────────────────────────────────────┤
│  Titel:        [____________________]│
│  Kunde:        [Müller         ▼ +]  │
│  Beschreibung: [____________________]│
│                [____________________]│
│  Farbe:        🟦 🟩 🟧 🟪 🟥 🟨      │
│                                      │
│  Pricing:                            │
│   ◉ Stundensatz  [80,00] €/h         │
│   ○ Festpreis    [____] €            │
│                                      │
│  Aufgabe (mind. 1):  [Auswählen ▼ +] │
│                                      │
│              [Abbrechen]  [Anlegen]  │
└──────────────────────────────────────┘
```

## Kundennummern-Algorithmus

Schema laut `mvp-brainstorming.md`: **5-stellig**, Format `YY` + `A` + `LL`

- `YY` = Anlagejahr 2-stellig (z.B. `26` für 2026)
- `A`  = Auftragsart-Ziffer 1-stellig (Hochzeitsfoto=1, Porträtfoto=2, Businessfoto=3, Design=4, …)
- `LL` = Laufende Nummer 2-stellig **pro User + Auftragsart + Jahr** (`01`–`99`)

**Beispiel**: 1. Hochzeitsfoto-Kunde 2026 → `26101`; 42. Hochzeitsfoto-Kunde 2026 → `26142`

**Edge-Case (siehe Open Questions)**: Was passiert ab dem 100. Kunden pro Jahr/Art? Vorschlag: erweitern auf 6 Stellen (`LLL`) — Schema soll von Anfang an so dimensioniert werden, dass das ohne Bruch geht.

**Implementierung**: Server berechnet die Nummer beim Anlegen (transaktional), nicht der Client — vermeidet Sync-Konflikte. Im Offline-Modus wird der Kunde lokal mit Provisorium-ID angelegt und bei Sync vom Server final genummert.

## Excel-Export — Spezifikation

**Trigger**: Button in Settings/Reports.

**Vorabfrage** (Modal):
- Zeitraum: `Monat/Jahr` ODER `von Monat/Jahr bis Monat/Jahr` — Default: aktueller Monat
- Optional: Filter auf einzelnen Kunden

**Inhalt** (eine Tabelle, eine Zeile pro Kunde × Aufgabe):

| Spalte | Stundensatz-Projekt | Festpreis-Projekt |
|---|---|---|
| Kundennummer | ✅ | ✅ |
| Name | ✅ | ✅ |
| Straße / PLZ / Ort | ✅ | ✅ |
| Aufgabe → Stichworte | ✅ | ✅ (Info) |
| Zeit kumuliert pro Aufgabe | ✅ | ⚠️ (siehe Open Question 3) |
| Stundensatz | ✅ | — |
| Betrag | Zeit × Stundensatz | Festpreis (einmalig pro Projekt) |

**Format**: `.xlsx` via ExcelJS, serverseitig generiert, als Download an den Client.

## Pricing-Logik

Pro Projekt: **entweder** Stundensatz **oder** Festpreis (XOR).

- **Stundensatz** wird pro Zeiteintrag eingefroren (Tarif-Historie). Wenn der User später den Satz eines Projekts ändert, gilt das nur für **neue** Zeiteinträge — alte bleiben mit ihrem Original-Satz verbucht.
- **Festpreis** ist einmal definiert. Im Detail-View wird der „relative Stundensatz" angezeigt: `Festpreis ÷ Σ getrackte Stunden`. Falls Σ = 0 → „—".

## Geklärte Entscheidungen (vorher Open Questions, geklärt am 2026-05-10)

Alle 7 ehemaligen Open Questions sind beantwortet. Details in `DECISIONS.md` (ADR-008 bis ADR-014).

1. **Timer**: nur EIN laufender Timer global. Beim Start eines neuen Projekts wird ein laufender automatisch gestoppt → Modal fordert Aufgabenwahl für das alte Projekt → dann startet das neue. (ADR-009)
2. **Aufgabenliste**: GLOBAL pro User, m:n zu Projekten. Aufgaben werden einmal definiert und projektübergreifend wiederverwendet. (ADR-011)
3. **Festpreis-Export**: Festpreis als rechnungsrelevante Position **plus** Zeit-Info-Spalte (ohne Geldbetrag) zur eigenen Kalkulations-Kontrolle. (ADR-013)
4. **Kundennummern**: JETZT 5-stellig (2-stellige lfd. Nr., wie Brainstorming → `26142`). Schema-Spalte ist `varchar(8)`, sodass beim späteren Multi-User-Rollout auf 6-stellig (`261042`) bruchfrei umgestellt werden kann. (ADR-010)
5. **Aufgaben-Pflicht**: optional beim Anlegen, Pflicht erst beim ersten Stop (Stop-Modal fragt eh nach Aufgabe). (ADR-012)
6. **Manuelle Zeit-Korrektur**: Ja, im MVP. UI zum Editieren/Löschen einzelner Zeiteinträge. (ADR-014)
7. **Tarif-Historie**: Snapshot pro Zeiteintrag — der zum Zeitpunkt der Erfassung geltende Stundensatz wird in `time_entries.rate_snapshot_cents` eingefroren. (ADR-008)

## Was nicht im MVP ist

- Multi-User / Team-Funktionen
- Apple/Google IAP / Subscriptions
- Email-/Passwort-Auth
- Rechnungs-PDF-Generation (nur Excel-Export)
- Push-Notifications
- Erinnerungen / Pomodoro
- Statistiken / Charts
