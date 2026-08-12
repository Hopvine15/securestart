// Auth0 JWT verification
use axum::{
    extract::FromRequestParts,
    http::{StatusCode, header::AUTHORIZATION, request::Parts},
};

use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode, decode_header, jwk::JwkSet};
use serde::Deserialize;

#[derive(Debug)]
pub struct AuthenticatedUser {
    pub sub: String,
    pub email: String,
}

#[derive(Debug, Deserialize)]
struct Claims {
    sub: String,
    #[serde(rename = "https://securestart.app/email")]
    email: String,
    #[allow(dead_code)]
    exp: usize,
}

impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|header| header.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "Missing Authorization header"))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or((StatusCode::UNAUTHORIZED, "Invalid Authorization header"))?;

        match verify_token(token).await {
            Ok(user) => Ok(user),
            Err(error) => {
                eprintln!("JWT verification failed: {error}");
                Err((StatusCode::UNAUTHORIZED, "Invalid token"))
            }
        }
    }
}

async fn verify_token(token: &str) -> Result<AuthenticatedUser, Box<dyn std::error::Error>> {
    #[cfg(test)]
    if token == "valid-test-token" {
        return Ok(AuthenticatedUser {
            sub: "auth0|test-user".to_string(),
            email: "test@example.com".to_string(),
        });
    }

    let domain = std::env::var("AUTH0_DOMAIN")?;
    let audience = std::env::var("AUTH0_AUDIENCE")?;

    let issuer = format!("https://{domain}/");
    let jwks_url = format!("{issuer}.well-known/jwks.json");

    // Decode the JWT header to get the key ID (kid)
    let header = decode_header(token)?;

    let kid = header.kid.ok_or("Missing kid in token header")?;

    // Fetch Auth0's published public signing keys
    let jwks = reqwest::get(&jwks_url).await?.json::<JwkSet>().await?;

    // Find the public key matching this JWT's kid
    let jwk = jwks.find(&kid).ok_or("Matching key not found in JWKS")?;

    // Let jsonwebtoken interpret the JWK correctly
    let decoding_key = DecodingKey::from_jwk(jwk)?;

    let mut validation = Validation::new(Algorithm::RS256);

    validation.set_audience(&[audience.as_str()]);
    validation.set_issuer(&[issuer.as_str()]);
    validation.set_required_spec_claims(&["exp", "iss", "aud"]);

    let token_data = decode::<Claims>(token, &decoding_key, &validation)?;

    Ok(AuthenticatedUser {
        sub: token_data.claims.sub,
        email: token_data.claims.email,
    })
}
