package fr.plateau.backend.auth.domain;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.plateau.backend.auth.data.OtpCode;
import fr.plateau.backend.auth.data.OtpCodeRepository;
import fr.plateau.backend.common.ConflictException;
import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.common.TooManyRequestsException;
import fr.plateau.backend.common.UnauthorizedException;
import fr.plateau.backend.employee.data.Employee;
import fr.plateau.backend.employee.data.EmployeeRepository;

@Service
public class OtpService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmployeeRepository employeeRepository;
    private final OtpCodeRepository otpCodeRepository;
    private final OtpSender otpSender;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final long otpExpiryMinutes;

    public OtpService(
            EmployeeRepository employeeRepository,
            OtpCodeRepository otpCodeRepository,
            OtpSender otpSender,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            @Value("${plateau.otp.expiry-minutes}") long otpExpiryMinutes) {
        this.employeeRepository = employeeRepository;
        this.otpCodeRepository = otpCodeRepository;
        this.otpSender = otpSender;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.otpExpiryMinutes = otpExpiryMinutes;
    }

    @Transactional
    public void requestOtp(String identifier) {
        findUser(identifier);

        otpCodeRepository.findFirstByIdentifierOrderByCreatedAtDesc(identifier)
                .filter(otp -> otp.getLockedUntil() != null && otp.getLockedUntil().isAfter(Instant.now()))
                .ifPresent(otp -> {
                    throw new TooManyRequestsException("Trop de tentatives, réessayez plus tard");
                });

        String code = generateCode();
        String codeHash = passwordEncoder.encode(code);

        otpCodeRepository.deleteByIdentifier(identifier);
        otpCodeRepository.save(new OtpCode(identifier, codeHash, Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES)));

        otpSender.send(identifier, code);
    }

    @Transactional(noRollbackFor = { UnauthorizedException.class, TooManyRequestsException.class })
    public TokenPair verifyOtp(String identifier, String code) {
        OtpCode otp = otpCodeRepository.findFirstByIdentifierOrderByCreatedAtDesc(identifier)
                .orElseThrow(() -> new NotFoundException("Aucun code trouvé pour cet identifiant"));

        if (otp.getExpiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedException("Code expiré");
        }

        otp.setAttempts((byte) (otp.getAttempts() + 1));
        if (otp.getAttempts() >= 5) {
            otp.setLockedUntil(Instant.now().plus(30, ChronoUnit.MINUTES));
            otpCodeRepository.save(otp);
            throw new TooManyRequestsException("Trop de tentatives");
        }
        otpCodeRepository.save(otp);

        if (!passwordEncoder.matches(code, otp.getCodeHash())) {
            throw new UnauthorizedException("Code incorrect");
        }

        otpCodeRepository.delete(otp);

        Employee user = findUser(identifier);
        String token = jwtService.generateToken(user.getId(), user.getTenantId(), user.getRole());
        String refreshToken = jwtService.generateRefreshToken(user.getId());
        return new TokenPair(token, refreshToken, user);
    }

    /// Redeems a refresh token for a fresh access + refresh token pair.
    @Transactional
    public TokenPair refresh(String rawRefreshToken) {
        Long userId = jwtService.redeemRefreshToken(rawRefreshToken);
        Employee user = employeeRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("Utilisateur introuvable"));
        String token = jwtService.generateToken(user.getId(), user.getTenantId(), user.getRole());
        String refreshToken = jwtService.generateRefreshToken(user.getId());
        return new TokenPair(token, refreshToken, user);
    }

    private Employee findUser(String identifier) {
        // No JWT exists yet at this point in the login flow, so there's no
        // tenantId to scope by. email/phone are only unique PER TENANT
        // (uq_tenant_email, uq_tenant_phone) — the same identifier could
        // legitimately belong to accounts in two different tenants. Rather
        // than silently picking one (which would risk logging someone into
        // the wrong tenant), require exactly one match or fail loudly.
        List<Employee> matches = employeeRepository.findByEmail(identifier);
        if (matches.isEmpty()) {
            matches = employeeRepository.findByPhone(identifier);
        }

        if (matches.isEmpty()) {
            throw new NotFoundException("Utilisateur introuvable");
        }
        if (matches.size() > 1) {
            throw new ConflictException(
                    "This identifier is used in more than one organization — contact support"
            );
        }

        return matches.get(0);
    }

    private String generateCode() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    public record TokenPair(String token, String refreshToken, Employee user) {
    }
}
