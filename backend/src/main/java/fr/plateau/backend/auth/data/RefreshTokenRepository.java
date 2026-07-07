package fr.plateau.backend.auth.data;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    List<RefreshToken> findByUsedFalseAndExpiresAtAfter(Instant now);
}
