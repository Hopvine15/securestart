use crate::auth::AuthenticatedUser;

pub async fn auth_test(user: AuthenticatedUser) -> String {
    format!("Authenticated as {}", user.sub)
}
