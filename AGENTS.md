# Project rules

- Landing plan prices and staff limits must come from `src/lib/plans.ts`, the same catalog used by subscription screens, to avoid divergent commercial information.
- Public marketing must not promise uptime percentages, delivery times, messaging automation or multi-unit management without verified implementation and evidence.
- Agenda views share a permission-scoped timeline data hook and pure interval helpers; keep layout separate from existing booking mutations so visual changes cannot bypass scheduling validation.
- Store agenda presentation preferences per shop and user on the current device, with guarded storage access; presentation settings must not mutate business data.- Operation mode (individual vs reception) lives on barbershops.operation_mode; comanda-closing permission goes through src/lib/operationMode.ts so UI paths share one rule.
