package fr.plateau.backend.auth.domain;

public interface OtpSender {

    void send(String identifier, String code);
}
