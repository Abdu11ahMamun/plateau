package fr.plateau.backend.employee.domain;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.common.UnprocessableEntityException;
import fr.plateau.backend.employee.data.Contract;
import fr.plateau.backend.employee.data.ContractRepository;
import jakarta.persistence.EntityManager;

@Service
public class ContractService {

    private static final Set<String> ALLOWED_CONTRACT_TYPES =
            Set.of("CDI", "CDD", "EXTRA");

    private final ContractRepository contractRepository;
    private final EntityManager entityManager;

    public ContractService(
            ContractRepository contractRepository,
            EntityManager entityManager
    ) {
        this.contractRepository = contractRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public Contract createContract(
            Long userId,
            Long tenantId,
            String type,
            Integer weeklyMinutes,
            Integer hourlyWageCents,
            LocalDate startDate,
            LocalDate endDate
    ) {
        validateUserExists(userId, tenantId);
        validateContract(type, weeklyMinutes, hourlyWageCents, startDate);

        closeCurrentContract(userId, tenantId, startDate);

        Contract contract = new Contract(
                userId,
                tenantId,
                type,
                weeklyMinutes,
                hourlyWageCents,
                startDate,
                endDate
        );

        return contractRepository.save(contract);
    }

    @Transactional(readOnly = true)
    public Optional<Contract> getCurrentContract(
            Long userId,
            Long tenantId
    ) {
        LocalDate today = LocalDate.now();

        return contractRepository.findByUserIdAndTenantId(userId, tenantId)
                .stream()
                .filter(contract ->
                        contract.getEndDate() == null
                                || !contract.getEndDate().isBefore(today)
                )
                .max(Comparator.comparing(
                        Contract::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ));
    }

    @Transactional(readOnly = true)
    public List<Contract> getContractHistory(
            Long userId,
            Long tenantId
    ) {
        return contractRepository.findByUserIdAndTenantId(userId, tenantId)
                .stream()
                .sorted(Comparator.comparing(
                        Contract::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ).reversed())
                .toList();
    }

    private void validateUserExists(Long userId, Long tenantId) {
        if (userId == null || tenantId == null) {
            throw new NotFoundException("User not found");
        }

        Long userCount = entityManager.createQuery(
                        """
                        SELECT COUNT(employee)
                        FROM Employee employee
                        WHERE employee.id = :userId
                          AND employee.tenantId = :tenantId
                        """,
                        Long.class
                )
                .setParameter("userId", userId)
                .setParameter("tenantId", tenantId)
                .getSingleResult();

        if (userCount == 0) {
            throw new NotFoundException(
                    "User not found for tenant: userId=" + userId
                            + ", tenantId=" + tenantId
            );
        }
    }

    private void validateContract(
            String type,
            Integer weeklyMinutes,
            Integer hourlyWageCents,
            LocalDate startDate
    ) {
        if (type == null || !ALLOWED_CONTRACT_TYPES.contains(type)) {
            throw new UnprocessableEntityException(
                    "Contract type must be CDI, CDD, or EXTRA"
            );
        }

        if (weeklyMinutes == null
                || weeklyMinutes < 1
                || weeklyMinutes > 3600) {
            throw new UnprocessableEntityException(
                    "Weekly minutes must be between 1 and 3600"
            );
        }

        if (hourlyWageCents == null || hourlyWageCents <= 0) {
            throw new UnprocessableEntityException(
                    "Hourly wage cents must be greater than 0"
            );
        }

        if (startDate == null) {
            throw new UnprocessableEntityException(
                    "Contract start date is required"
            );
        }
    }

    private void closeCurrentContract(
            Long userId,
            Long tenantId,
            LocalDate newContractStartDate
    ) {
        contractRepository.findByUserIdAndTenantId(userId, tenantId)
                .stream()
                .filter(contract -> contract.getEndDate() == null)
                .max(Comparator.comparing(
                        Contract::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ))
                .ifPresent(contract -> entityManager.createQuery(
                                """
                                UPDATE Contract contract
                                SET contract.endDate = :endDate
                                WHERE contract.id = :contractId
                                  AND contract.tenantId = :tenantId
                                """
                        )
                        .setParameter(
                                "endDate",
                                newContractStartDate.minusDays(1)
                        )
                        .setParameter("contractId", contract.getId())
                        .setParameter("tenantId", tenantId)
                        .executeUpdate());
    }
}