# Simpaskor Nginx Error Page

Folder ini berisi halaman pengganti untuk error Nginx bawaan seperti:

- `502 Bad Gateway`
- `503 Service Unavailable`
- `504 Gateway Timeout`

Halaman ini dipakai saat webhook deploy, build Docker, atau restart container membuat upstream frontend/backend belum siap.

## File

- `error-pages/system-update.html`  
  Halaman statis self-contained dengan desain "sistem sedang diperbarui", health check ke `/api/health`, dan countdown refresh otomatis setelah server siap.

- `snippets/simpaskor-error-pages.conf`  
  Snippet Nginx untuk mengarahkan error `500/502/503/504` ke halaman update.

## Setup di VPS

`deploy.sh` akan otomatis menyalin:

```bash
nginx/error-pages/system-update.html -> /var/www/simpaskor/system-update.html
nginx/snippets/simpaskor-error-pages.conf -> /etc/nginx/snippets/simpaskor-error-pages.conf
```

Tambahkan include berikut di dalam `server { ... }` Nginx production untuk domain Simpaskor:

```nginx
include /etc/nginx/snippets/simpaskor-error-pages.conf;
```

Contoh posisi:

```nginx
server {
    server_name simpaskor.id www.simpaskor.id;

    include /etc/nginx/snippets/simpaskor-error-pages.conf;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Setelah include ditambahkan:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Setelah itu, saat upstream mati sementara, user akan melihat halaman update, bukan halaman default `502 Bad Gateway`.
