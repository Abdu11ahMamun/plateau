package fr.plateau.backend.common;

import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Long getCurrentUserId() {
        return principal().userId();
    }

    public static String getCurrentRole() {
        return principal().role();
    }

    public static Long getCurrentTenantId() {
        return principal().tenantId();
    }

    private static JwtAuthFilter.AuthenticatedUser principal() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof JwtAuthFilter.AuthenticatedUser authenticatedUser) {
            return authenticatedUser;
        }
        throw new UnauthorizedException("No authenticated user in context");
    }
}
