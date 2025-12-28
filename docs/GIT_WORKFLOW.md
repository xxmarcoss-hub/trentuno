# Git Workflow

Procedura da seguire per ogni nuova modifica al progetto.

## 1. Creare un nuovo branch

Prima di iniziare qualsiasi modifica, creare un branch dedicato:

```bash
git checkout -b feature/nome-descrittivo
```

Convenzioni per i nomi dei branch:
- `feature/` - nuove funzionalità
- `fix/` - correzione bug
- `refactor/` - refactoring del codice
- `docs/` - modifiche alla documentazione

## 2. Sviluppare la funzionalità

- Fare commit frequenti e atomici
- Messaggi di commit chiari e descrittivi
- Testare le modifiche localmente con `npm start`

## 3. Commit delle modifiche

```bash
git add .
git commit -m "Descrizione chiara della modifica"
```

## 4. Merge nel branch principale

Una volta completata e testata la funzionalità:

```bash
git checkout main
git merge feature/nome-descrittivo
```

## 5. Cleanup

Dopo il merge, eliminare il branch di feature:

```bash
git branch -d feature/nome-descrittivo
```
