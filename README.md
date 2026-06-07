# Splitly — Simple, Elegant Expense Splitting

🚀 **Live Production Demo:** [https://splitly-chandana-3482.netlify.app](https://splitly-chandana-3482.netlify.app)

Splitly is a production-ready, high-fidelity expense splitting web app mimicking the core flow of Splitwise but with a highly polished glassmorphism dark theme, optimized mobile-first layouts, and automatic greedy debt minimization.

## 🚀 Key Features
1. **User ID + Password Auth:** The user logs in using a public username like `@moonpie8472` and a password. Behind the scenes, a secure virtual mapping layer converts this to a virtual email address for standard Supabase Auth, keeping user sessions robust, native, and secure.
2. **Greedy Debt Minimization:** Reduces noise by calculating the net balance of all members in a group and determining the absolute minimum number of settlement payments needed.
3. **Flexible Splitting:** Split by Equal amount, Exact amount, or Percentage, with reactive form validation (sum check, 100% check, etc.).
4. **Secure Optional Receipt Uploads:** Upload receipt images or PDFs directly into a private Supabase Storage bucket. Access is secured using storage policies linked to group memberships.
5. **Interactive Settlements:** Instantly log a payment settlement to wipe out debts.

---

## 🛠️ Technology Stack
- **Framework:** Next.js 15 (App Router, Server & Client Components)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Custom CSS, Framer Motion
- **Icons:** Lucide React
- **Backend/Database:** Supabase (Auth, Postgres DB, Row Level Security, Storage Buckets)

---

## 📂 Project Directory Structure
```
splitly/
├── migration.sql           # Complete Database schema, RLS, triggers, and Storage policies
├── README.md               # Setup and documentation
├── package.json            # NPM dependencies
├── postcss.config.mjs
├── tsconfig.json
├── next.config.ts
├── .env.local              # Local environment credentials (already configured)
└── src/
    ├── middleware.ts       # Next.js auth guard router redirect middleware
    ├── app/
    │   ├── globals.css     # CSS variables, gradients, and custom components styles
    │   ├── layout.tsx      # Root html & page metadata
    │   ├── page.tsx        # Fallback router redirect page
    │   ├── (auth)/         # Auth routes (Login, Signup)
    │   │   ├── login/
    │   │   └── signup/
    │   └── (protected)/    # Protected dashboard routes (Dashboard, Groups, Group Details, Profile, New Expense)
    │       ├── layout.tsx
    │       ├── SideNav.tsx
    │       ├── dashboard/
    │       ├── groups/
    │       ├── group/[id]/
    │       └── expense/new/
    ├── components/         # Shared React components (AuthForm, ExpenseForm, SummaryCards, etc.)
    └── utils/
        ├── auth-map.ts     # User ID to virtual email mapper
        ├── balance-simplifier.ts # Debt minimization engine
        ├── dashboard-data.ts     # Aggregated server database fetcher
        └── supabase/       # SSR server and client creators
            ├── client.ts
            ├── server.ts
            └── middleware.ts
```

---

## ⚙️ Setup and Installation

### 1. Database & Storage Setup
You need to run the contents of [migration.sql](file:///Users/chandanajuttu/.gemini/antigravity/scratch/splitly/migration.sql) inside your Supabase project's SQL Editor:
1. Log in to the [Supabase Dashboard](https://supabase.com).
2. Go to your project, open the **SQL Editor**, and click **New Query**.
3. Copy the entire contents of `migration.sql` and click **Run**.
This creates all tables (`profiles`, `groups`, `group_members`, `expenses`, `expense_splits`, `settlements`), registers the new user triggers, sets up Row Level Security (RLS) policies on every table, initializes the private `receipts` storage bucket, and activates RLS on the storage bucket!

### 2. Environment Configurations
Configure your local environment variables inside a `.env.local` file at the root of the project:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Run the Development Server
From the project root directory, install npm packages (if you cloned or reset) and run the dev server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to run the app.
