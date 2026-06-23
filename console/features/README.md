# Feature modules

Self-contained feature slices, per docs/ARCHITECTURE.md §7 and docs/CONTRIBUTING.md §8.
Each is filled in by its roadmap phase:

| Folder        | Feature                         | Roadmap phase |
| ------------- | ------------------------------- | ------------- |
| `graph/`      | React Flow live run graph        | Phase 1       |
| `templates/`  | Template catalog + SchemaForm    | Phase 2       |
| `builder/`    | Drag-and-drop workflow builder   | Phase 3       |
| `schedules/`  | Recurrence editor                | Phase 4       |
| `runs/`       | Run history + granular re-run    | Phase 5       |

Phase 0 ships the seam everything plugs into: the typed data contract
(`lib/contract`), the mock/http adapters (`lib/adapters`), and the app shell.
