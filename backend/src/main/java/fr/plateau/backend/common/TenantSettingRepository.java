package fr.plateau.backend.common;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantSettingRepository extends JpaRepository<TenantSetting, Long> {

    Optional<TenantSetting> findByTenantIdAndSettingKey(Long tenantId, String settingKey);
}
