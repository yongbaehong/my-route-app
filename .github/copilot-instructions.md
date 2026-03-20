To ensure VS Code Copilot builds this exactly how you want it without "guessing" or making up outdated patterns, use this highly structured prompt. It is designed to act as a **System Specification** that forces Copilot to adhere to your specific stack (Expo SDK 55) and the 2026 SQLite API.

### **The "Bulletproof" Master Prompt for Copilot**

**Instructions:** Copy the text below and paste it into your VS Code Chat (or Cursor).

---

> **Role:** You are a Senior Expo & React Native Developer specializing in local persistence and route optimization.
>
> **Project Context:**
> We are building a **Route Optimization App** for South Korea (specifically targeting Paju Geomsan-dong logistics).
>
> **Tech Stack (Strict Adherence Required):**
>
> 1. **Framework:** Expo SDK 55 (New Architecture) with Expo Router.
> 2. **Database:** `expo-sqlite` using the modern `SQLiteProvider` and `useSQLiteContext` (2026 API).
> 3. **Styling:** `Nativewind v4` (Tailwind) and `Lucide-react-native` for icons.
> 4. **Interactions:** `react-native-draggable-flatlist` for reordering and `Reanimated 3`.
> 5. **Localization:** `i18next` with `react-i18next` for English/Korean switching.
>
> **Data Model (SQLite Schema):**
> Create a table named `stops` with these exact columns:
>
> - `id`: TEXT (UUID)
> - `address`: TEXT
> - `nickname`: TEXT (Editable)
> - `lat`: REAL, `lng`: REAL
> - `is_important`: INTEGER (0 or 1) - To prioritize in optimization.
> - `is_completed`: INTEGER (0 or 1) - To track tasks.
> - `display_order`: INTEGER - To persist the drag-and-drop sequence.
>
> **Implementation Requirements:**
>
> 1. **Database Module:** Create a `db/schema.ts` that initializes the table and handles migrations.
> 2. **Address Management Component:** Build a UI that allows:
>    - Adding a new address (with lat/lng from search).
>    - Inline editing of the `nickname`.
>    - Toggling `is_important` (Star icon) and `is_completed` (Checkmark).
>    - Deleting a stop from the database.
> 3. **Persistence Logic:** Ensure that every drag-and-drop action updates the `display_order` column in SQLite so the order is saved permanently.
> 4. **Route Optimization Logic:** Write a function `prepareTmapPayload()` that queries the SQLite database, sorts by `display_order`, and formats the data for the Tmap 2026 Optimization API (WGS84GEO coordinates).
> 5. **Multilingual UI:** All labels (Optimize, Add Stop, Complete, Priority) must use `t()` from `react-i18next` for EN/KO support.
>
> **Output Style:** Provide clean, modular TypeScript code. Do not use deprecated Expo APIs.

---

### **Preparation Checklist for You**

Before you run that prompt, make sure your project environment has these specific things ready so Copilot doesn't fail:

1.  **Environment Setup:** You should have already run `npx expo install expo-sqlite expo-location`.
2.  **Nativewind Config:** Ensure your `tailwind.config.js` and `metro.config.js` are already set up for Nativewind v4, or Copilot might try to give you old v2 styling logic.
3.  **Tmap Key:** Have your Tmap AppKey ready to paste into the `.env` file that Copilot will likely ask you to create.

Would you like me to create a **Tmap API Service Class** separately that you can feed into Copilot as context for the routing logic?
