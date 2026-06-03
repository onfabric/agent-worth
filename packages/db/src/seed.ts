import { syntheticModelPrices } from "@agent-worth/shared";

export const seedEmployees = [
  {
    id: "emp_synthetic_ada",
    displayName: "Ada Lovelace",
    email: "ada@example.invalid",
    team: "Platform"
  },
  {
    id: "emp_synthetic_grace",
    displayName: "Grace Hopper",
    email: "grace@example.invalid",
    team: "Infrastructure"
  }
];

export const seedDaemonClients = [
  {
    id: "client_synthetic_laptop",
    employeeId: "emp_synthetic_ada",
    apiTokenHash: "synthetic-token-hash-ada",
    hostnameHash: "synthetic-hostname-hash-ada"
  },
  {
    id: "client_synthetic_workstation",
    employeeId: "emp_synthetic_grace",
    apiTokenHash: "synthetic-token-hash-grace",
    hostnameHash: "synthetic-hostname-hash-grace"
  }
];

export const seedModelPrices = syntheticModelPrices.map((price) => ({
  ...price,
  isSynthetic: true
}));

