# SecureStart

SecureStart is a full-stack cybersecurity training application for **NovaShield Learning**, a fictional digital training company. It helps junior developers and non-technical employees understand AI-related security risks through short modules, scenario-based quizzes and a progress dashboard.

## Project links

- **[Final Figma design](https://www.figma.com/design/1YWZ73QjdYHnsUwS8r77NQ/SecureStart-Design?node-id=10-6&p=f)**
- **[Interactive desktop prototype](https://www.figma.com/proto/1YWZ73QjdYHnsUwS8r77NQ/SecureStart-Design?node-id=93-34&starting-point-node-id=93%3A34&scaling=scale-down&content-scaling=fixed)**
- **[Interactive mobile prototype](https://www.figma.com/proto/1YWZ73QjdYHnsUwS8r77NQ/SecureStart-Design?node-id=93-1055&starting-point-node-id=93%3A1055&scaling=scale-down&content-scaling=fixed)**
- **Live application:** n/a

## Contents

1. [Product overview](#product-overview)
2. [Product-design approach](#product-design-approach)
3. [Why Figma was selected](#why-figma-was-selected)
4. [Component-based design](#component-based-design)
5. [Visual identity](#visual-identity)
6. [Accessibility decisions](#accessibility-decisions)
7. [Sustainability decisions](#sustainability-decisions)
8. [User journey and interactions](#user-journey-and-interactions)
9. [Responsive design and iteration](#responsive-design-and-iteration)
10. [Technical direction](#technical-direction)
11. [Environment variables](#environment-variables)

## Product overview

Organisations are increasingly adopting AI tools, but employees may not fully understand the risks of AI-generated code, phishing, weak authentication, data leakage or over-trusting AI output.

SecureStart addresses this through a focused learning journey:

- short cybersecurity modules
- realistic scenario-based quiz questions
- immediate results and feedback
- progress tracking through a personal dashboard
- authentication through Auth0 Universal Login.

The main users are junior developers using AI coding tools, non-technical staff using AI at work, and team leads who need lightweight visibility of training completion.

## Product-design approach

The design was developed as an iterative process rather than by drawing each screen independently. The work moved through five connected layers:

1. **Foundations** - brand colours, typography, spacing, radii, icon treatment and accessibility principles.
2. **Components** - reusable buttons, badges, progress indicators, navigation items, alerts and quiz controls.
3. **Patterns and templates** - combinations such as the product header, module card, quiz panel and authentication prompt.
4. **Responsive screens** - landing, dashboard, module, quiz and results layouts for desktop and mobile.
5. **Interactive prototype** - the happy path and key alternative states were connected and tested as one journey.

This approach allowed decisions to be checked at smaller levels before they were repeated across the full application. It also made later changes, such as the logo refinement, easier to apply consistently across the screen designs and prototype.

![SecureStart Figma foundations page showing the colour palette, typography, spacing and visual design rules](./assets/1-product-proposal-design/securestart-foundations.png)

*Figure 1. SecureStart foundations defining the shared visual and accessibility rules used by the later components and screens.*

## Why Figma was selected

Figma was selected because it supported my design process, of being able to setup reusable variables and configurations.

- **Reusable design system:** components, variants and variables could be defined once and reused.
- **Responsive exploration:** desktop and mobile frames could be compared in the same file.
- **Interactive prototyping:** screens could be linked into a realistic user journey without building the application first.
- **Iteration:** changes to branding, navigation and component states could be reviewed before implementation.
- **Clear hand-off to development:** named layers, components and design tokens provide a reference for frontend development.
- **Shareable evidence:** the final file and prototype can be opened by a reviewer.

Figma therefore acted as both a design tool and a documented source of design decisions.

## Component-based design

SecureStart uses a layered, component-based approach:

| Design layer | Examples                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Foundations  | colour variables, Manrope typography, spacing, border radius and icon rules                                                   |
| Components   | buttons, badges, progress bars, navigation items, alerts and quiz answers                                                     |
| Patterns     | `ProductHeader`, `ModuleCard`, `QuizProgressHeader`, `QuizQuestionPanel`, `ResultSummary` and Auth0 redirect prompt |
| Screens      | landing, dashboard, module, quiz and results pages                                                                            |
| Prototype    | connected desktop and mobile journeys with validation and selected-answer states                                              |

![SecureStart Figma components page showing reusable buttons, badges, navigation items, progress indicators and interface states](./assets/1-product-proposal-design/securestart-components-design.png)

*Figure 2. Reusable interface components created from the shared foundations before being applied to complete screens.*

The individual components were then combined into larger reusable patterns and templates. This provided an intermediate design layer between isolated controls and complete pages, allowing repeated structures such as product headers, module cards and quiz panels to remain consistent.

![SecureStart patterns and templates page showing assembled headers, module cards, quiz panels and authentication messaging](./assets/1-product-proposal-design/securestart-patternstemplates-design.png)

*Figure 3. Components combined into repeatable patterns and templates before full-screen design.*

The same component language is reused across different contexts. For example, status is shown through a badge, label and visual treatment rather than colour alone, while progress bars use the same structure on cards and summary panels. Reuse reduces visual inconsistency and provides a clearer route from the Figma design to React components.

## Visual identity

**NovaShield Learning** is the fictional parent company and **SecureStart** is its cybersecurity training product. The relationship is shown through an endorsement text “A NovaShield Learning product” or “by NovaShield”, while SecureStart remains the primary name inside the application.

The identity uses:

- **Manrope** for a clear and modern interface;
- a dark navy base to communicate trust and security;
- electric teal as the primary action and progress colour;
- violet as a supporting brand accent;
- simple geometric interface icons;
- a custom shield mark for product branding.

Three shield patterns were explored. The chosen minimalist version was selected because its strong outline, two large internal planes and central star remain recognisable at approximately 16–24 px. The final logo system includes:

- a full logo with the parent-brand endorsement;
- a standard icon-and-wordmark lock-up for headers;
- a compact shield mark for small spaces.

Functional interface actions continue to use simple icons, while the custom shield is reserved for SecureStart branding.

## Accessibility decisions

Accessibility was considered from the foundations stage rather than added only after the screens were complete.

- Text and controls use strong foreground/background contrast.
- Information is not communicated through colour alone; badges include labels and icons.
- Buttons use clear action wording such as **Start module**, **Continue** and **Submit answer**.
- Navigation placement and visual hierarchy remain consistent across authenticated screens.
- Focus, disabled, selected, completed and error states are designed to remain distinguishable.
- Content follows a logical order that is preserved when it stacks on mobile.
- The logo was kept simple so it remains legible at all sizes.
- Heavy motion and unnecessary animation are avoided.
- Auth0 Universal Login is treated as an external authentication step and should be configured with readable labels and accessible brand colours.

These choices support accessibility, although the implemented application will still require keyboard, screen-reader and automated contrast testing.

## Sustainability decisions

The design aims to avoid unnecessary digital and development overhead.

- Reusable components reduce duplicated design and frontend code.
- A focused MVP avoids designing and building unused features.
- Screens use simple shapes, typography and lightweight vector icons instead of large media assets.
- Unnecessary animation and heavy visual effects are avoided.
- The flat vector shield can scale without separate raster assets for each size.
- Responsive layouts reuse the same content and component structure rather than creating unrelated mobile experiences.
- Data is intended to be requested only when required for each screen.
- Auth0 reduces the amount of security-critical authentication code that must be built, tested and maintained.

Sustainability is therefore treated as a combination of efficient interface assets, maintainable implementation and controlled project scope.

## User journey and interactions

The primary journey is:

1. The user opens the SecureStart landing page.
2. They select **Log in** or **Get started**.
3. SecureStart redirects them to Auth0 Universal Login.
4. After authentication, the user returns to the dashboard.
5. They choose a training module.
6. They read the module and start the quiz.
7. They select answers and submit the quiz.
8. The results page shows the score, feedback and next recommendation.
9. The user returns to an updated dashboard showing new progress.

![SecureStart user journey diagram showing landing, Auth0 redirect, dashboard, module, quiz, results and updated dashboard](./assets/1-product-proposal-design/securestart-user-journey.png)

*Figure 4. Primary user journey, including the external Auth0 authentication step and the updated dashboard state.*

Key prototype interactions include:

- landing-page actions that open the represented Auth0 redirect step;
- module cards and calls to action that open the selected module;
- a module-to-quiz transition;
- answer selection;
- incomplete-quiz validation;
- quiz submission and results;
- return to the updated dashboard;
- separate desktop and mobile starting points.

![SecureStart interactive prototype overview showing the primary journey from landing page to updated dashboard](./assets/1-product-proposal-design/securestart-prototype-flow.png)

*Figure 5. Interactive prototype flow connecting the primary journey and allowing the key interactions to be reviewed before implementation.*

Authentication is deliberately shown as an external step because SecureStart does not collect or store passwords.

## Responsive design and iteration

Desktop layouts were designed around a 1280 px application viewport, with mobile checkpoints designed at 375 px.

The mobile designs do not simply shrink the desktop screens. They:

- stack cards and content into one reading column;
- simplify the product header;
- keep the most important progress information visible;
- retain the same content order and actions;
- increase wrapping where needed rather than reducing text to unreadable sizes;
- keep buttons large enough to remain clear touch targets.

![SecureStart responsive landing-page designs displayed at desktop and mobile widths](./assets/1-product-proposal-design/securestart-screens-design.png)

*Figure 6. Landing-page designs showing how the product introduction, branding and feature cards adapt between desktop and mobile layouts.*

Iteration is visible throughout the Figma file. Components were first checked in isolation, then placed into patterns and full screens. Desktop and mobile versions were compared, alternative quiz states were added, and the original detailed logo was replaced by a simplified mark after testing it at small sizes.

![SecureStart responsive dashboard designs showing desktop and mobile progress summaries and training module cards](./assets/1-product-proposal-design/securestart-dashboard-responsive.png)

*Figure 7. Dashboard iteration showing the same progress information and training modules reorganised for desktop and mobile layouts.*

## Technical direction

| Layer            | Technology                                          |
| ---------------- | --------------------------------------------------- |
| Frontend         | React + Vite                                        |
| Backend          | Rust + Axum                                         |
| Database         | MongoDB Atlas                                       |
| Authentication   | Auth0 using OIDC and hosted Universal Login         |
| Frontend testing | Vitest + React Testing Library                      |
| Backend testing  | Rust test framework with route-level test utilities |
| CI/CD            | GitHub Actions                                      |
| Frontend hosting | Vercel                                              |
| Backend hosting  | Render                                              |

The repository uses separate `frontend/` and `backend/` folders within one repository. It is a separated full-stack application, not a microservices architecture.

## Repository structure

```text
securestart/
├── assets/
│   └── 1-product-proposal-design/
│       ├── securestart-components-design.png
│       ├── securestart-dashboard-responsive.png
│       ├── securestart-foundations.png
│       ├── securestart-patternstemplates-design.png
│       ├── securestart-prototype-flow.png
│       ├── securestart-screens-design.png
│       └── securestart-user-journey.png
├── backend/
├── frontend/
├── architecture-notes.md
├── planning.md
├── product-notes.md
├── user-journey.md
└── README.md
```

## Environment variables

Each application folder includes a Git-tracked `.env.example` template. Copy each template and provide the real local values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Real `.env` files are ignored by Git; only the example templates are committed.

### `backend/.env.example`

```dotenv
AUTH0_DOMAIN=         # Auth0 tenant domain
AUTH0_AUDIENCE=       # Auth0 API identifier the token must match
MONGODB_URI=          # MongoDB Atlas connection string
PORT=                 # Port used by the Axum API
CORS_ORIGIN=          # Deployed frontend URL allowed by CORS
```

### `frontend/.env.example`

```dotenv
VITE_AUTH0_DOMAIN=    # Auth0 tenant domain
VITE_AUTH0_CLIENT_ID= # Auth0 SPA application client ID
VITE_AUTH0_AUDIENCE=  # Auth0 API identifier
VITE_API_URL=         # Backend API base URL
```

> Variable names will remain consistent with the implementation and deployment configuration.
