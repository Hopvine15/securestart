# securestart

## Environment Variables

Each folder ships a git-tracked `.env.example` template. Copy it and fill in real values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Real `.env` files are git-ignored; only the `.example` templates are committed.

**backend/.env.example**

```dotenv

AUTH0_DOMAIN=         # Auth0 tenant domain
AUTH0_AUDIENCE=       # Auth0 API identifier (audience) the token must match
MONGODB_URI=          # MongoDB Atlas connection string
PORT=                 # port the Axum API listens on
CORS_ORIGIN=          # the deployed frontend URL, for CORS
```

**frontend/.env.example**

```dotenv

VITE_AUTH0_DOMAIN=    # Auth0 tenant domain
VITE_AUTH0_CLIENT_ID= # Auth0 SPA application client ID
VITE_AUTH0_AUDIENCE=  # Auth0 API identifier (audience)
VITE_API_URL=         # base URL of the backend API
```

<!-- TODO: finalise variable names when it is fully implemented -->