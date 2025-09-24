# React-testauksen pikaopas (Vitest + RTL + MSW + Playwright + jest-axe)

Tämä opas asentaa ja konfiguroi **Vitest**, **React Testing Library**, **MSW**, **Playwright** (E2E ja/tai Component Testing) sekä **jest-axe** (a11y). Mukana myös Storybook + Chromatic -osio valinnaisena.

> **Oletukset**: Projektissa on React + TypeScript (Vite/CRA/Next käy). Pakettien asennusesimerkit `npm`:lle. Jos käytät `pnpm` tai `yarn`, komennot vastaavasti.

---

## 1) Asennukset

### Perus: Vitest + RTL + jest-dom + user-event
```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Verkon mockaus: MSW
```bash
npm i -D msw
```

### Saavutettavuus: jest-axe
```bash
npm i -D jest-axe axe-core
```

### E2E: Playwright (selaintesteihin)
```bash
npm i -D @playwright/test
npx playwright install --with-deps
# (Linux CI: voit käyttää ilman --with-deps ja asentaa depsit imageen)
```

### (Valinnainen) Component Testing Playwrightilla
Playwright tukee komponenttitestausta Reactille.
```bash
npm i -D @playwright/experimental-ct-react
```

### (Valinnainen) Storybook + Chromatic (visuaalinen regressio)
```bash
npx storybook init
npm i -D chromatic
```

---

## 2) Peruskonfiguraatio

### 2.1 Vitest-konfigi (`vitest.config.ts`)
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: true,
  },
});
```

### 2.2 Vitestin setup (`vitest.setup.ts`)
```ts
import "@testing-library/jest-dom";

// (Valinnainen) MSW testejä varten
// Käytä MSW:n node-serveriä yksikkö/integration -testeissä.
import { beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { rest } from "msw";

// Luo oma handlers.ts ja importoi se tähän. Tässä esimerkki:
export const server = setupServer(
  rest.get("/api/items", (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json([{ id: 1, name: "Foo" }]));
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

> **Vinkki**: Siirrä MSW `handlers` omiin tiedostoihin (esim. `src/mocks/handlers.ts`) ja tuo ne `vitest.setup.ts`:ään.

### 2.3 NPM-skriptit (`package.json`)
```json
{
  "scripts": {
    "test": "vitest run",
    "test:ui": "vitest",
    "format": "prettier --write .",
    "lint": "eslint .",
    "typecheck": "tsc -p tsconfig.json --noEmit",

    "qa": "npm run format && npm run lint && npm run typecheck && npm run test",

    "e2e": "playwright test",
    "e2e:headed": "playwright test --headed --project=chromium",
    "e2e:report": "playwright show-report",

    "ct": "playwright test -c playwright-ct.config.ts"
  }
}
```

---

## 3) Esimerkkitesti (RTL + Vitest)

**`src/components/Counter.tsx`**
```tsx
import { useState } from "react";

export function Counter() {
  const [n, setN] = useState(0);
  return (
    <div>
      <p role="status">Count: {n}</p>
      <button onClick={() => setN(n + 1)}>Add</button>
    </div>
  );
}
```

**`src/components/Counter.test.tsx`**
```tsx
import { render, screen } from "@testing-library/react";
import user from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Counter } from "./Counter";

describe("Counter", () => {
  it("kasvattaa arvoa napista", async () => {
    render(<Counter />);
    await user.click(screen.getByRole("button", { name: /add/i }));
    expect(screen.getByRole("status")).toHaveTextContent("Count: 1");
  });
});
```

---

## 4) jest-axe a11y-tsekki

**`src/components/Counter.a11y.test.tsx`**
```tsx
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { expect, it } from "vitest";
import { Counter } from "./Counter";

expect.extend(toHaveNoViolations);

it("ei a11y-virheitä", async () => {
  const { container } = render(<Counter />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 5) Playwright E2E

**`playwright.config.ts`**
```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    // Mobiiliprofiilit
    { name: "Mobile Safari", use: { ...devices["iPhone 13"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 7"] } }
  ]
});
```

**`e2e/counter.spec.ts`**
```ts
import { test, expect } from "@playwright/test";

test("käyttäjä voi lisätä laskuria", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /add/i }).click();
  await expect(page.getByRole("status")).toHaveTextContent("Count: 1");
});
```

> **Vinkki**: mockkaa verkko Playwrightissa `page.route("**/api/**", ...)` tai käytä MSW:n selainmoodia erikseen (MSW@browser).

---

## 6) Playwright Component Testing (valinnainen)

**`playwright-ct.config.ts`**
```ts
import { defineConfig, devices } from "@playwright/experimental-ct-react";

export default defineConfig({
  testDir: "./ct",
  use: {
    ctPort: 3100,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
```

**`ct/Counter.ct.tsx`**
```tsx
import { test, expect } from "@playwright/experimental-ct-react";
import { Counter } from "../src/components/Counter";

test("renderöityy ja napin klikkaus kasvattaa arvoa", async ({ mount }) => {
  const component = await mount(<Counter />);
  await component.getByRole("button", { name: /add/i }).click();
  await expect(component.getByRole("status")).toHaveTextContent("Count: 1");
});
```

---

## 7) MSW selaimessa (valinnainen)

Luo `src/mocks/browser.ts`:
```ts
import { setupWorker } from "msw";
import { handlers } from "./handlers";
export const worker = setupWorker(...handlers);
```

Käynnistä devissä (esim. `main.tsx`):  
```ts
if (import.meta.env.DEV) {
  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}
```

Ja testissä (Vitestissä) käytä `setupServer`-versiota, kuten kohdassa 2.2.

---

## 8) (Valinnainen) Storybook + Chromatic

**Chromatic** (CI-visuaalit):
```bash
npx chromatic --project-token=<YOUR_TOKEN>
```
Lisää GitHub Actions -workflowiin job, joka ajaa `chromatic` PR:ssä.

---

## 9) GitHub Actions ‑esimerkki (CI)

**`.github/workflows/ci.yml`**
```yml
name: CI

on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run qa

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run e2e
      - run: npm run e2e:report
        if: always()
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report
```

---

## 10) Troubleshooting

- **JSDOM virheet / `TextEncoder` puuttuu**: päivitä Node 18+ / lisää polyfill.
- **MSW “onUnhandledRequest: error”**: lisää handler tai muuta asetukseksi `bypass` devissä.
- **Playwright ajurit**: muista `npx playwright install` CI:ssä; Linuxissa voi tarvita lisäksi kirjastot (—with-deps).
- **Flakit**: käytä `await expect(...).toBeVisible()` (autowait), vältä kovakoodattuja `sleeppejä`.

---

## 11) Seuraavat askeleet

- Lisää **saavutettavuuslintit** (eslint-plugin-jsx-a11y).
- Lisää **Coverage-raportti**: `vitest --coverage` ja tallenna CI-artefaktina.
- Lisää **Playwright sharding** isoihin testimääriin: `--shard=1/4` jne.

Onnea matkaan! ✨
