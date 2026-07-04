# Rate a Queen

Aplicación web móvil para crear rankings. Las salas privadas funcionan mediante invitaciones individuales y permiten votar sin cuenta. Las salas públicas aparecen en el buscador, tienen un enlace global y requieren registro para unirse, votar y consultar resultados. La organizadora prepara las reinas (con foto opcional), puede añadir participantes mientras la sala está abierta y decide cuándo cerrar para publicar la clasificación.

La interfaz detecta el idioma principal del dispositivo: usa español para variantes `es-*` e inglés para cualquier otro idioma.

## Privacidad del voto

La identidad y la papeleta se guardan en tablas distintas. Una invitación registra únicamente si ya se usó. La papeleta contiene el evento y el orden de las reinas, pero ningún identificador de invitación, nombre, apodo o fecha. El panel de organización nunca expone papeletas individuales.

## Configuración local

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Abre **SQL Editor** y ejecuta [`supabase/schema.sql`](supabase/schema.sql).
3. Copia `.env.example` a `.env.local` y completa:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_CLAVE_PUBLICA
SUPABASE_SECRET_KEY=sb_secret_TU_CLAVE_SECRETA
```

La `publishable key` puede usarse en el navegador. La `secret key` es secreta: solo debe configurarse en el servidor, nunca utilizarse en una variable que empiece por `NEXT_PUBLIC_`.

### Si ya instalaste la primera versión

No vuelvas a ejecutar el esquema completo. Abre **SQL Editor** y ejecuta solamente [`supabase/migrations/002_accounts.sql`](supabase/migrations/002_accounts.sql). Después, en **Authentication → URL Configuration**, configura la URL del sitio (`http://localhost:3000` en local y el dominio de Vercel al publicar) y añade ambas a las URLs de redirección.

Después de la migración de cuentas, ejecuta también [`supabase/migrations/003_one_vote_per_account.sql`](supabase/migrations/003_one_vote_per_account.sql) para impedir que una misma cuenta vote con dos invitaciones de la misma sala.

Finalmente, ejecuta [`supabase/migrations/004_manual_close.sql`](supabase/migrations/004_manual_close.sql) para activar el cierre manual de las votaciones.

Para añadir salas públicas, ejecuta [`supabase/migrations/005_public_rooms.sql`](supabase/migrations/005_public_rooms.sql) después de la migración 004.

Para activar las pestañas de estado y los avisos de resultados nuevos, ejecuta [`supabase/migrations/006_result_notifications.sql`](supabase/migrations/006_result_notifications.sql) después de la migración 005.

4. Instala y ejecuta:

```bash
npm install
npm run dev
```

## Publicación online

Importa el repositorio en [Vercel](https://vercel.com/), configura las mismas tres variables de entorno y despliega.

## Reglas del ranking

Con `N` reinas, la primera recibe `N` puntos, la segunda `N-1` y la última 1. La clasificación usa la media de puntos. Los empates se resuelven por número de primeros puestos y, si persisten, alfabéticamente.
