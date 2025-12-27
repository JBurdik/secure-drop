# SecureDrop

## Popis projektu

SecureDrop je moderna webova aplikace pro jednoduche a bezpecne sdileni souboru. Umoznuje vytvorit "prostor" (Space), nahrat do nej soubory a sdilet je s kymkoliv pomoci jedineho odkazu.

### Hlavni funkce

- **Jednoduche sdileni** - Jeden odkaz pro cely prostor se soubory
- **Automaticka expirace** - Soubory se automaticky smazou po zvolene dobe (1 hodina az 7 dni)
- **Drag & Drop** - Nahravani souboru pretazenim do prostoru
- **Interaktivni canvas** - Soubory lze presunovat po platne a usporadat podle potreby
- **Nahledy souboru** - Podpora nahledu obrazku, videi a dalsich typu souboru
- **Tmaty/Svetly rezim** - Prepinani mezi tmavym a svetlym motivem
- **Nastaveni opravneni** - Moznost povolit nebo zakazat nahravani souboru navstevnikum

### Technologie

**Frontend:**
- React 19 + TypeScript
- Vite
- TailwindCSS v4
- shadcn/ui komponenty
- @dnd-kit pro drag & drop funkcionalitu

**Backend:**
- Convex (self-hosted) - realtime databaze a serverless funkce
- Automaticke CRON ulohy pro cisteni expirovaných prostoru

**Deployment:**
- Docker + Docker Compose
- Dokploy pro orchestraci na VPS

### Architektura

Aplikace vyuziva Convex jako backend-as-a-service, ktery poskytuje:
- Realtime synchronizaci dat mezi klienty
- Serverless funkce pro business logiku
- Integrovane uloziste pro soubory
- Automaticke typy z databazoveho schematu

Data jsou ulozena lokalne v localStorage pro sledovani vlastnich prostoru (max 3 aktivni prostory na uzivatele).
