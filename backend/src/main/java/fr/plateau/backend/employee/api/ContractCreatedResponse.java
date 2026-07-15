package fr.plateau.backend.employee.api;

import java.util.List;

import fr.plateau.backend.employee.data.Contract;

public record ContractCreatedResponse(Contract contract, List<String> warnings) {
}
