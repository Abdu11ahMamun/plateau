package fr.plateau.backend.common;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TenantSettingsService {

    public static final String DEFAULT_BREAK_MINUTES_KEY = "default_break_minutes";

    private final TenantSettingRepository tenantSettingRepository;

    public TenantSettingsService(TenantSettingRepository tenantSettingRepository) {
        this.tenantSettingRepository = tenantSettingRepository;
    }

    @Transactional(readOnly = true)
    public String getSetting(Long tenantId, String key, String defaultValue) {
        return tenantSettingRepository.findByTenantIdAndSettingKey(tenantId, key)
                .map(TenantSetting::getSettingValue)
                .orElse(defaultValue);
    }

    @Transactional(readOnly = true)
    public int getIntSetting(Long tenantId, String key, int defaultValue) {
        return tenantSettingRepository.findByTenantIdAndSettingKey(tenantId, key)
                .map(setting -> Integer.parseInt(setting.getSettingValue()))
                .orElse(defaultValue);
    }

    @Transactional
    public void setSetting(Long tenantId, String key, String value) {
        tenantSettingRepository.findByTenantIdAndSettingKey(tenantId, key)
                .ifPresentOrElse(
                        setting -> setting.setSettingValue(value),
                        () -> tenantSettingRepository.save(new TenantSetting(tenantId, key, value))
                );
    }
}
