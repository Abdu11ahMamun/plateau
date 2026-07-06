package fr.plateau.backend.auth.domain;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Component
@ConditionalOnProperty(name = "plateau.otp.delivery", havingValue = "email")
public class EmailOtpSender implements OtpSender {

    private final JavaMailSender mailSender;
    private final String from;

    public EmailOtpSender(JavaMailSender mailSender, @Value("${spring.mail.username}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    @Override
    public void send(String identifier, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(identifier);
            helper.setFrom(from);
            helper.setSubject("Votre code Plateau : " + code);
            helper.setText("Votre code de connexion est : <strong>" + code
                    + "</strong><br/>Ce code expire dans 10 minutes.", true);
            mailSender.send(message);
        } catch (MessagingException ex) {
            throw new IllegalStateException("Failed to send OTP email", ex);
        }
    }
}
