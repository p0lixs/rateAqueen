# Rate a Queen

Aplicación web móvil para crear rankings privados. La organizadora prepara las reinas y las participantes, comparte un enlace personal con cada una y la clasificación aparece automáticamente cuando se reciben todos los votos.

## Privacidad del voto

La identidad y la papeleta se guardan en tablas distintas. Una invitación registra únicamente si ya se usó. La papeleta contiene el evento y el orden de las reinas, pero ningún identificador de invitación, nombre, apodo o fecha. El panel de organización nunca expone papeletas individuales.

## Configuración local

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Abre **SQL Editor** y ejecuta [`supabase/schema.sql`](supabase/schema.sql).
3. Copia `.env.example` a `.env.local` y completa:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

La `service role key` es secreta: solo debe configurarse en el servidor, nunca utilizarse en una variable que empiece por `NEXT_PUBLIC_`.

4. Instala y ejecuta:

```bash
npm install
npm run dev
```

## Publicación online

Importa el repositorio en [Vercel](https://vercel.com/), configura las mismas tres variables de entorno y despliega. En `NEXT_PUBLIC_APP_URL` usa el dominio definitivo, por ejemplo `https://mi-rate-a-queen.vercel.app`.

## Reglas del ranking

Con `N` reinas, la primera recibe `N` puntos, la segunda `N-1` y la última 1. La clasificación usa la media de puntos. Los empates se resuelven por número de primeros puestos y, si persisten, alfabéticamente.
