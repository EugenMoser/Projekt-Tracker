# Projekt Projekttracker

## Startoberfläche

- Alle aktiven Projekte am Überblick 
- Projekte als Kacheln mit den Infos von Ttitel, Auftraggeber
- Projekte können direkt von der Startoberfläche gleich gestartet gestoppt (Wischen, Button oder ähnliches)
- neues Projekt kann direkt von der Startseite hinzugefügt werden (+ icon)



## neues PROJEKT anlegen

Inputfelder
- Titel
- Auftraggeber (aus einer Kundenliste auszuwählen oder neuen Kunde anlegen) 
- Beschreibung
- Farbe (der Kacheln auf der Startseite)
- Stundensatz oder Festpreis eingabe
- Aufgabe auswählen (required)



## Projekt editieren (wenn Projekt angelegt ist)

- Aufgaben hinzufügen oder aus einer Aufgabenliste auswählen 

## Projekt Details
- Gesamtzeit (was wurde für das Projekt an Zeit investiert)
- Projekt Gesamtkosten für den Kunden (Festpreis oder Stundensatz)
- relativer Stundensatz anzeigen bei Festpreis ( Festpreis / getrackte Stunden)




## Kunde anlegen (Datenbank)
- Kundennummer laut vorgegebenes Schema automatisch eingetragen ( 
		5 Stellig, 
		Anlagejahr z.B. 26, 
		Hochzeitsfotografie = 1
		Porträtfotographie = 2
		Businessfotografie = 3
		Design = 4
		Fortlaufende Nr. 2 stellig z.B. 42
		
		so könnte es aussehen: 26142 und wir automatisch durch die eingegeben Daten erstellt
- Auftragsart z.B. Hochzeitsfotografie = 1 zum Auswählen im Dropdown
- Name
- Straße
- PLZ
- Ort

## Aufgaben anlegen

- Stichworte auswählen oder neu anlegen (Website, Gutschein, Fotografie etc)
- Aufgabenbeschreibung (Textfeld)
- 


##Auftragsart anlegen
- Titel = Zahl
 z.B. Hochzeitsfotografie  =  1

##Stichworte anlegen
- Titel (Website, Gutschein, Fotografie etc)


## Export hauptsächlich Excel
folgende Daten:
-Leistungszeitraum muss vor jedem Export durch eine Abfrage erfragt werden (Monat/Jahr oder von Monat/Jahr bis Monat/Jahr; als default der aktuelle Monat/Jahr eingetragen sein)
-Kundennummer
- Name
- Straße
-PLZ
-Ort
- Aufgaben -> Stichworte
- Zeit kumuliert pro Aufgabe nur bei Stundensatz





# Funktion
- Bei Stop eines Projekts soll die Zeit die getrackt worden ist einer Aufgabe zugeordnet werden
