package fr.plateau.backend.auth.api;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.auth.domain.OtpService;
import fr.plateau.backend.employee.data.Employee;
import fr.plateau.backend.employee.domain.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final OtpService otpService;

    public AuthController(OtpService otpService) {
        this.otpService = otpService;
    }

    @PostMapping("/otp/request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void requestOtp(@Valid @RequestBody OtpRequest request) {
        otpService.requestOtp(request.identifier());
    }

    @PostMapping("/otp/verify")
    public AuthResponse verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        OtpService.TokenPair tokenPair = otpService.verifyOtp(request.identifier(), request.code());
        return toResponse(tokenPair);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return toResponse(otpService.refresh(request.refreshToken()));
    }

    private static AuthResponse toResponse(OtpService.TokenPair tokenPair) {
        Employee user = tokenPair.user();
        return new AuthResponse(
                tokenPair.token(),
                tokenPair.refreshToken(),
                new AuthResponse.UserSummary(user.getId(), user.getName(), user.getRole()));
    }

    public record OtpRequest(@NotBlank String identifier) {
    }

    public record OtpVerifyRequest(@NotBlank String identifier, @NotBlank String code) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record AuthResponse(String token, String refreshToken, UserSummary user) {
        public record UserSummary(Long id, String name, Role role) {
        }
    }
}
