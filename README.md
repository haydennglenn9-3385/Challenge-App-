# Signup App 🚀

Complete Next.js authentication app with Supabase - ready to deploy on Vercel!

## Quick Deploy

### 1. Upload to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repo
4. Add these environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Click "Deploy"

### 3. Set Up Supabase Database
Run this SQL in Supabase SQL Editor:

```sql
-- Create users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup (recommended)
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'), NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
```

### 4. Configure Supabase Redirect URLs
In Supabase Dashboard → Authentication → URL Configuration:
```
Site URL: https://your-app.vercel.app
Redirect URLs:
  - https://your-app.vercel.app/auth/callback
  - https://your-app-*.vercel.app/auth/callback
```

## Features

- ✅ Secure signup with password validation
- ✅ Email verification
- ✅ Login/logout
- ✅ Protected dashboard
- ✅ Responsive design
- ✅ TypeScript
- ✅ Tailwind CSS

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
signup-app/
├── app/
│   ├── dashboard/page.tsx    # Protected dashboard
│   ├── login/page.tsx        # Login page
│   ├── signup/page.tsx       # Signup with validation
│   ├── verify-email/page.tsx # Email verification
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── utils/supabase/client.ts  # Supabase client
└── package.json
```

## Troubleshooting

**Build fails**: Check environment variables are set in Vercel
**404 errors**: Ensure folder structure is correct
**Email not sending**: Enable email confirmation in Supabase settings

## License

MIT
