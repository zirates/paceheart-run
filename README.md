# PaceHeart

> **Run Faster. Run Fitter.**
> The only free web app that helps you hit both a pace goal *and* a heart rate goal — proving real cardiovascular improvement, not just speed.

🔗 **Live Demo:** [paceheart-run.vercel.app](https://paceheart-run.vercel.app)

---

## 🧠 The Problem

Most runners train for speed — but running faster doesn't mean you're getting fitter. True fitness means your heart works *less* to run the *same* pace over time.

PaceHeart tracks **both** metrics together, so you can see real cardiovascular improvement — not just a faster clock.

---

## ✨ Features

- **🎯 Dual Goal Tracking** — Set a target pace *and* a target heart rate. Track both, not just one.
- **📋 Smart Training Plans** — Auto-generated 5K–Marathon plans built around your current fitness level (Beginner / Intermediate / Advanced).
- **📊 HR Efficiency Tracking** — Same pace, lower HR over time = proof you're getting fitter.
- **📝 Run Logging** — Log every run with distance, pace, and heart rate.
- **🔐 Auth & Profiles** — Secure sign up / login with persistent user data.
- **📱 Responsive UI** — Works on desktop and mobile.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend / DB | [Supabase](https://supabase.com/) (PostgreSQL + Auth) |
| Deployment | [Vercel](https://vercel.com/) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com/) project

### Installation

```bash
# Clone the repo
git clone https://github.com/zirates/paceheart-run.git
cd paceheart-run

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Database Schema

```sql
-- Users store their goal and baseline on onboarding
profiles (id, user_name, goal_distance, deadline_weeks, target_pace, target_hr, pb_pace, pb_hr, level)

-- Training plan generated per user
training_plans (id, user_id, plan_json, created_at)

-- Each run logged by the user
run_logs (id, user_id, logged_at, distance_km, pace_min_per_km, avg_hr_bpm)
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── auth/         # Login & Signup pages
│   ├── dashboard/    # Main dashboard + training plan
│   ├── log/          # Run logging page
│   ├── onboarding/   # New user goal setup
│   └── page.tsx      # Landing page
├── lib/
│   ├── plan-engine/  # Training plan generation logic
│   ├── supabase/     # Supabase client & server helpers
│   └── utils.ts      # Shared utilities
└── middleware.ts      # Auth route protection
```

---

## 👤 Author

**Irham Raziqony (Zirates)**
- GitHub: [@zirates](https://github.com/zirates)
- Project built as part of a PM portfolio to demonstrate full-stack product thinking — from problem definition to shipped MVP.

---

## 📄 License

MIT License — feel free to use this as inspiration for your own projects.
