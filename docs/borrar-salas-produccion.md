# Borrar salas en producción

Cómo listar y borrar salas del despliegue real (Neon y Cloudflare R2) con el script `npm run rooms`, desde tu equipo. Las claves se pasan como variables de la orden: no se guardan en ningún archivo ni quedan en el historial de bash.

Requisitos: el repositorio clonado con las dependencias del backend instaladas (`npm install` en `backend/`), la cadena de conexión de Neon y los datos del token de R2 (están en los paneles de cada servicio; ver «Servicios en uso» en el README).

## 1. Cargar las claves en la sesión

Cada `read -rs` espera a que pegues un valor y pulses Enter, sin mostrarlo en pantalla:

```bash
cd backend
read -rs DB;  echo ok   # cadena de Neon (sirve la directa o la pooled)
read -rs EP;  echo ok   # endpoint de R2: https://<id de cuenta>.r2.cloudflarestorage.com
read -rs AK;  echo ok   # Access Key ID de R2
read -rs SK;  echo ok   # Secret Access Key de R2
prod() { DATABASE_URL="$DB" S3_ENDPOINT="$EP" S3_REGION=auto \
  S3_ACCESS_KEY_ID="$AK" S3_SECRET_ACCESS_KEY="$SK" S3_BUCKET=amigo-invisible \
  npm run rooms -- "$@"; }
```

Cambia `S3_BUCKET` si el bucket de R2 tiene otro nombre.

Las variables de la orden tienen prioridad sobre `backend/.env`, así que el script va a producción y no al PostgreSQL local de Docker.

## 2. Listar las salas

```bash
prod list
```

Muestra, por sala, el id, la fecha, el estado, el número de participantes y el nombre. Comprueba que salen las salas de producción y no las de desarrollo.

## 3. Borrar una sala

```bash
prod delete <id de la sala>
```

- Pide escribir el nombre de la sala para confirmar (con `--yes` no pregunta).
- Primero borra los archivos de la sala en R2 (todo lo que hay bajo `rooms/<id>/`) y después la sala, que arrastra en cascada participantes, parejas, listas de deseos, tokens y asignaciones.
- Si falla el borrado de archivos, la sala queda intacta y se puede repetir.
- **No se puede deshacer y no hay copias de seguridad.**

Al borrar salas se libera hueco para crear otras nuevas (el límite lo marca `MAX_ROOMS` en Render).

## 4. Borrar las claves de la sesión

```bash
unset DB EP AK SK; unset -f prod
```

Cerrar la terminal también las elimina.
