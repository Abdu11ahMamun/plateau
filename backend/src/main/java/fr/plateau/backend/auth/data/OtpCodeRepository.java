package fr.plateau.backend.auth.data;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {

    Optional<OtpCode> findFirstByIdentifierOrderByCreatedAtDesc(String identifier);

    void deleteByIdentifier(String identifier);
}
