# spielerminus

Teamorganisation ohne Abo-Schranken: Termine, Zu- und Absagen, Erinnerungen mit Antwort-Buttons, Abwesenheiten. Next.js auf Cloudflare Workers mit D1. Konzept: [docs/KONZEPT.md](docs/KONZEPT.md).

## Lokal starten

```bash
pnpm install
pnpm db:migrate:local
pnpm db:seed          # Testverein „VC Deshalb“ (nur lokal)
pnpm dev
```

Anmelden mit einer Seed-Adresse, z. B. `lena.becker@vc-deshalb.test` (Besitzerin, Trainerin) oder `emma.richter@vc-deshalb.test` (Spielerin). Der Login-Code erscheint lokal in der Konsole, E-Mails werden in der Entwicklung nicht verschickt.

`.dev.vars` braucht `NEXTJS_ENV=development`, `APP_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` und `VAPID_SUBJECT`.

## Prüfen

```bash
pnpm typecheck && pnpm lint
pnpm test             # Vitest mit echter D1 (Miniflare)
pnpm preview          # Produktions-Build im Workers-Runtime
```

Den Cron lokal auslösen: `pnpm preview` starten und `curl "http://localhost:8787/cdn-cgi/handler/scheduled"` aufrufen.

## Struktur

- `app/` Seiten, Server Actions, Route Handler (`/api/...`)
- `lib/services/` Domänenlogik mit Rechteprüfung (von Web, Cron, später API/MCP genutzt)
- `lib/jobs/` Cron: Fristende, Erinnerungen, Serien verlängern
- `lib/db/schema.ts` Drizzle-Schema, Migrationen in `drizzle/`
- `worker.ts` Worker-Einstieg (Next.js + `scheduled`)
- `scripts/seed.ts` Testdaten, `tests/` Vitest
