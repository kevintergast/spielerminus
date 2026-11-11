# Testdaten: VC Deshalb

Fiktiver Volleyballverein für lokale Entwicklung, Preview-Umgebungen und automatisierte Tests. Jede Person deckt mindestens einen Fall ab. Der Seed (`pnpm db:seed`) wird aus dieser Liste gebaut und läuft **nie in Produktion**.

**Sicherheit der Kontaktdaten:**
- E-Mail-Adressen liegen unter `vc-deshalb.test`. Die Top-Level-Domain `.test` ist reserviert und nicht zustellbar; lokal werden Login-Codes in der Konsole ausgegeben.
- Telefonnummern stammen aus dem Berliner Block `+49 30 23125 xxx`, der nach unserem Kenntnisstand von der Bundesnetzagentur für fiktive Nutzung freigehalten wird. Das prüfen wir vor dem ersten Einsatz noch einmal.
- Unabhängig davon lässt der Code außerhalb der Produktion Anrufe nur an Nummern aus `SMAO_CALL_ALLOWLIST` zu.

## Verein und Teams

| Objekt | Werte |
|---|---|
| Verein | VC Deshalb e. V., Heimhalle: Sporthalle am Deich, Deichstraße 1 |
| Team 1 | **VC Deshalb 1. Damen** (Erwachsene), Training Di + Do 19:30–21:30, Spiele samstags |
| Team 2 | **VC Deshalb U16** (Jugendteam, Eltern-Modus), Training Mi 17:00–18:30 |
| km-Satz | 30 ct/km, gültig ab Saisonbeginn; zuvor 25 ct/km (Historie) |
| Erstattung | Empfänger `kasse@vc-deshalb.test`, monatlich, erstattungsfähig: Spiel, Turnier, Hin- und Rückfahrt, Spende erlaubt |
| Strafenkatalog | Zu spät zum Training 2 €, unentschuldigt gefehlt 10 €, Absage nach Frist 5 €, keine Rückmeldung 5 €, telefonisch nachgefasst 2 €, Kiste Wasser (Sachstrafe) |
| Strafenregeln | `unexcused_absence` auto, `late_decline` auto, `no_response` Vorschlag, `phone_followup` auto |
| smao | Assistent für 1. Damen aktiviert, für U16 nicht |

## Personen: VC Deshalb 1. Damen

Alle Personen mit Account haben die Pflichtangaben Vorname, Nachname, E-Mail und Telefon.

| # | Name | E-Mail | Telefon | Rolle / Position | Testfälle |
|---|---|---|---|---|---|
| 1 | Lena Becker | lena.becker@vc-deshalb.test | +49 30 23125 001 | **Besitzerin**, Admin, Trainerin | Team anlegen, Onboarding Trainer, Besitz übertragen, „Nutzung & Kosten“ sehen |
| 2 | Tobias Wagner | tobias.wagner@vc-deshalb.test | +49 30 23125 002 | Co-Trainer (auch Trainer U16) | Mitglied in zwei Teams, Anwesenheit eintragen, unentschuldigt markieren |
| 3 | Sabine Krüger | sabine.krueger@vc-deshalb.test | +49 30 23125 003 | Kassenwartin (spielt nicht) | Strafen vergeben und **streichen**, Vorschläge freigeben, km-Satz ändern, Fahrten übermitteln |
| 4 | Mia Schulz | mia.schulz@vc-deshalb.test | +49 30 23125 004 | Zuspiel, Kapitänin | antwortet immer sofort, Android mit installierter App und Push |
| 5 | Hannah Hoffmann | hannah.hoffmann@vc-deshalb.test | +49 30 23125 005 | Außenangriff | iPhone **ohne** Homescreen-Installation → nur E-Mail-Erinnerungen; Homescreen-Anleitung iOS Safari |
| 6 | Lea Fischer | lea.fischer@vc-deshalb.test | +49 30 23125 006 | Außenangriff | **fährt am häufigsten** (Rangliste Platz 1), 4 freie Plätze, nutzt die km-Berechnung |
| 7 | Sophie Weber | sophie.weber@vc-deshalb.test | +49 30 23125 007 | Mittelblock | Fahrerin mit **eigener km-Angabe und Notiz** (Umweg), **spendet** die Erstattung |
| 8 | Emma Richter | emma.richter@vc-deshalb.test | +49 30 23125 008 | Mittelblock | keine Rückmeldung → **smao-Anruf** (Einwilligung ja) → sagt ab, „krank“ → Strafe `phone_followup` |
| 9 | Laura Klein | laura.klein@vc-deshalb.test | +49 30 23125 009 | Diagonal | **keine Anruf-Einwilligung** → kein Anruf; Frist läuft ab → `no_response` als Vorschlag |
| 10 | Anna Wolf | anna.wolf@vc-deshalb.test | +49 30 23125 010 | Libera | **Abwesenheit** (2 Wochen Urlaub) → automatisch abgesagt, keine Erinnerungen, kein Anruf |
| 11 | Julia Schröder | julia.schroeder@vc-deshalb.test | +49 30 23125 011 | Außenangriff | **Absage nach Frist** → Strafe `late_decline`, wird später von der Kassenwartin gestrichen |
| 12 | Marie Neumann | marie.neumann@vc-deshalb.test | +49 30 23125 012 | Zuspiel | hat kein Auto, **sucht Mitfahrt**, wird Lea zugeordnet |
| 13 | Paula Braun | paula.braun@vc-deshalb.test | +49 30 23125 013 | Diagonal | smao-Anruf **nicht erreicht/Mailbox**, zweiter Versuch, dann `keine Rückmeldung` |
| 14 | Jana Hartmann | jana.hartmann@vc-deshalb.test | +49 30 23125 014 | Mittelblock | **unentschuldigt gefehlt** → 10 €, offener Saldo, zahlt per GiroCode; trägt eine **Fahrt selbst ein** |
| 15 | Nina Zimmermann | nina.zimmermann@vc-deshalb.test | +49 30 23125 015 | Libera | **inaktiv** (langzeitverletzt), bekommt keine Einladungen |
| 16 | Clara Schwarz | – (kein Account) | – | **Gastspielerin** | nur für ein Turnier eingeladen, vom Trainer gepflegt |
| 17 | Eva Lorenz | eva.lorenz@vc-deshalb.test | +49 30 23125 017 | Außenangriff, **neu** | tritt über den WhatsApp-Link bei (In-App-Browser → „Im Browser öffnen“), erste Zusage, Homescreen-Anleitung Android |

## Personen: VC Deshalb U16 (Eltern-Modus)

| # | Name | E-Mail | Telefon | Rolle | Testfälle |
|---|---|---|---|---|---|
| 18 | Lina Becker (14) | – (Kind ohne Account) | – | Spielerin | wird von **zwei getrennt lebenden Elternteilen** vertreten |
| 19 | Thomas Becker | thomas.becker@vc-deshalb.test | +49 30 23125 019 | Stellvertreter von Lina | sagt für Lina zu; Anruf-Einwilligung ja → wird statt des Kindes angerufen |
| 20 | Petra Lange | petra.lange@vc-deshalb.test | +49 30 23125 020 | Stellvertreterin von Lina | zweiter Login für dasselbe Kind, sieht dieselben Termine |
| 21 | Ella Schmitt (15) | – (Kind ohne Account) | – | Spielerin | Elternteil fährt mehrere Kinder |
| 22 | Michael Schmitt | michael.schmitt@vc-deshalb.test | +49 30 23125 022 | Stellvertreter von Ella | **Fahrer** bei Auswärtsspielen der U16, Popup nach dem Spieltag, Erstattung |
| 23 | Ida Krause (15) | ida.krause@vc-deshalb.test | +49 30 23125 023 | Spielerin mit eigenem Account | Minderjährige mit eigenem Login **und** Stellvertreterin |
| 24 | Katrin Krause | katrin.krause@vc-deshalb.test | +49 30 23125 024 | Stellvertreterin von Ida | Einwilligung für Minderjährige |

Tobias Wagner (#2) ist zusätzlich Trainer der U16.

## Termine (relativ zum Seed-Datum)

| Termin | Team | Zweck im Test |
|---|---|---|
| Trainingsserie Di + Do | 1. Damen | Serien, Erinnerungsstufen, Standardantwort pro Serie |
| Training in 2 Tagen, Frist morgen 12:00 | 1. Damen | offene Rückmeldungen, Anrufstufe (Emma, Laura, Paula) |
| Auswärtsspiel beim TV Irgendwo in 5 Tagen, Treffpunkt Halle | 1. Damen | Fahrgemeinschaften: Lea bietet 4 Plätze, Marie sucht, zu wenig Plätze-Hinweis |
| Heimspiel vor 3 Tagen (vorbei) | 1. Damen | Anwesenheit, unentschuldigt (Jana), Absage nach Frist (Julia) |
| Auswärtsspiel vor 1 Tag (vorbei) | 1. Damen | **Fahrten-Popup** für Lea (Berechnung) und Sophie (eigene km, Spende) |
| Turnier in 10 Tagen, Teilnehmerlimit 10 | 1. Damen | Limit, Warteliste, Gastspielerin Clara |
| Auswärtsspiel vor 2 Tagen (vorbei) | U16 | Fahrten-Popup für Michael Schmitt |
| Training Mi | U16 | Zusage durch Stellvertreter, getrennt lebende Eltern |

## Plattform und CRM

| Name | E-Mail | Zweck |
|---|---|---|
| CRM-Admin | crm-admin@spielerminus.test | Zugang zum Mini-CRM |

Der CRM-Seed enthält neben dem VC Deshalb noch zwei weitere fiktive Vereine mit unterschiedlicher Nutzung (aktiv, kaum genutzt), damit Listen, Filter und die Kostenansicht sinnvoll testbar sind.
