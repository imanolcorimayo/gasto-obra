# Gasto Obra - Web (Frontend)

Nuxt 3 web app for renovation expense management. Providers manage projects and expenses, clients get read-only view.

## Technical Stack

- **Framework**: Nuxt 3 (Vue 3) with TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Firebase (Firestore, Auth, Storage)
- **State Management**: Pinia
- **Icons**: unplugin-icons (Mdi, Lucide)
- **Dates**: DayJS (Spanish locale)
- **Notifications**: Vue3-Toastify

## Pages

### Provider (authenticated)
- `/` - Landing page with Google Auth login
- `/projects` - Project list (card grid)
- `/projects/new` - Create project form
- `/projects/[id]` - Project detail with expense history
- `/settings/general` - General settings (WhatsApp linking, management fee)

### Client (authenticated via Google)
- `/view/[token]` - Project preview + join as client (public)
- `/client` - Client project list
- `/client/project/[id]` - Full project view with KPIs and expense history
- `/client/project/[id]/resumen` - Detailed project summary

## Firestore Collections
- `projects` - Renovation projects (provider-scoped)
- `expenses` - Expense records (project-scoped)
- `whatsappLinks` - WhatsApp account linking

## Language
Spanish (Argentine). Currency: ARS with `es-AR` locale.

## Casquito Components
`CasquitoNeutral` (idle), `CasquitoHappy` (success), `CasquitoConfused` (errors/FAQ), `CasquitoWorking` (loading), `CasquitoAlert` (warnings), `CasquitoSleeping` (maintenance). Pure SVG, `size` prop. See root `CLAUDE.md` for details.

## Expense Categories
Materiales, Herramientas, Transporte, Mano de obra, Comida, Otros
