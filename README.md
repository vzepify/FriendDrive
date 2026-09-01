# FriendDrive

A Google Drive-style friends-only cloud drive frontend designed for GitHub Pages.

## Current build

The included frontend provides:
- Drive-style UI
- folders
- local file metadata
- drag/drop upload UI
- search
- recent/starred/trash views
- rename/star/delete/restore
- dark mode
- responsive layout

This first build deliberately does **not** put private files in GitHub. GitHub Pages is static hosting.

## Production backend

Connect the frontend to an authentication/database/object-storage backend before using it with real files.

A practical free/hobby setup is:
- GitHub Pages: frontend
- Supabase Auth + Postgres: accounts, folders, permissions, metadata
- Cloudflare R2: object storage for larger files

Do not put Supabase service-role keys, R2 secret keys, or other private credentials in this repository or browser JavaScript.

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Upload this project.
3. Go to Settings → Pages.
4. Choose GitHub Actions or deploy from the repository.
5. Open the generated Pages URL.

## Important

This project is an independent implementation and is not affiliated with LucidLink or Google.
