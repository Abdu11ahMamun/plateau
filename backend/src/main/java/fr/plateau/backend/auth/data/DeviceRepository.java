package fr.plateau.backend.auth.data;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.plateau.backend.auth.domain.DeviceStatus;

public interface DeviceRepository extends JpaRepository<Device, Long> {

    Optional<Device> findByInstallId(String installId);

    List<Device> findByUserIdAndStatus(Long userId, DeviceStatus status);

    List<Device> findByUserId(Long userId);
}
