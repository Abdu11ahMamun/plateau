package fr.plateau.backend.tenant.data;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "tenants")
public class Tenant {

    @Id
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    protected Tenant() {
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }
}
