# WeIntern Authentication Setup Instructions

This document provides step-by-step instructions to configure **Email/Password Authentication** and **Google OAuth 2.0 Single Sign-On** using Supabase in your WeIntern application.

---

## Part 1: Supabase Database Configuration

If you want to use the cloud database rather than the local storage fallback, follow these setup steps:

1. **Create a Supabase Project:**
   - Go to [Supabase](https://supabase.com/) and create a new project.

2. **Run SQL Schema Setup:**
   - In the Supabase dashboard, navigate to the **SQL Editor** tab.
   - Run the following SQL to create a `users` table and hook it up to Supabase Auth's user registrations automatically:

```sql
-- Create a table for public profiles
create table users (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table users enable row level security;

-- Create policies to secure user profiles
create policy "Public profiles are viewable by everyone" on users for select using (true);
create policy "Users can insert their own profile" on users for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on users for update using (auth.uid() = id);

-- Trigger to automatically create profile record when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## Part 2: Google OAuth 2.0 Credentials Setup

1. **Google Cloud Console Registration:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project or select an existing one.
   - Search for **OAuth consent screen**, set User Type to **External**, fill in required developer contact info, and publish the app.

2. **Create OAuth Client ID:**
   - Go to **Credentials** -> **+ Create Credentials** -> **OAuth client ID**.
   - Set Application Type to **Web application**.
   - Under **Authorized redirect URIs**, add your Supabase project callback URL:
     `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback`
   - Click **Create** and copy the generated **Client ID** and **Client Secret**.

3. **Configure Google Provider in Supabase:**
   - In the Supabase Dashboard, go to **Authentication** -> **Providers** -> **Google**.
   - Toggle Google authentication to **Enabled**.
   - Paste your **Client ID** and **Client Secret**.
   - Save changes.

---

## Part 3: Redirect URLs Configuration

In the Supabase Dashboard:
1. Go to **Authentication** -> **URL Configuration**.
2. Set **Site URL** to:
   `http://localhost:3000` (or your production domain).
3. Under **Redirect URLs**, add:
   `http://localhost:3000/dashboard`
   `http://localhost:3000/login/reset-password`

---

## Part 4: Environment Variables

Update your `.env.local` file in the root of the project with the following lines:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_PUBLIC_KEY>
```

*Note: If these environment variables are absent, WeIntern will gracefully fallback to **Guest/LocalStorage Mode**, simulating registrations, password comparisons, password resets, and Google Login automatically.*
