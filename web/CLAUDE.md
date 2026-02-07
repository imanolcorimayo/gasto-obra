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
- `/settings/whatsapp` - WhatsApp linking

### Client (public, no auth)
- `/view/[token]` - Read-only expense view via shareToken

## Firestore Collections
- `projects` - Renovation projects (provider-scoped)
- `expenses` - Expense records (project-scoped)
- `whatsappLinks` - WhatsApp account linking

## Language
Spanish (Argentine). Currency: ARS with `es-AR` locale.

## Expense Categories
Materiales, Herramientas, Transporte, Mano de obra, Comida, Otros
