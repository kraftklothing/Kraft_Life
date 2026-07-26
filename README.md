# Kraft Life

Extremely simple one-page daily task app. Lists everything you want to complete today.

**This app is separate from Kraft Klothing.** It runs on port **5180** so it does not override the dress app.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5180](http://localhost:5180).

## Features

- Add tasks with required repetition + category (works on PC and phone)
- Repetition: Daily, Weekly, Monthly, Yearly, Custom, Does not repeat
- Default categories: General, Personal, Work — plus custom add/delete
- Top right `$X` increases by 1 each completion
- Top left completed / remaining; tap to toggle percent complete
- Swipe left/right to change days
- Drag the blue 3-bar handle to reorder
- Task badges for repetition + category
- Bottom-right profile → settings / my account

Data is stored in the browser (`localStorage`).
