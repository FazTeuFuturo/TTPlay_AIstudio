-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.clubs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  logo text,
  admin_id uuid NOT NULL UNIQUE,
  subscription USER-DEFINED NOT NULL DEFAULT 'FREE'::subscription_plan,
  discount_rules jsonb,
  description text,
  address text,
  city text,
  state text,
  phone text,
  email text,
  website text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clubs_pkey PRIMARY KEY (id),
  CONSTRAINT fk_admin_id FOREIGN KEY (admin_id) REFERENCES public.users(id)
);
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category_id uuid NOT NULL,
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.tournament_categories(id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  category_id uuid NOT NULL,
  round integer NOT NULL,
  match_in_round integer NOT NULL,
  player1_id uuid,
  player2_id uuid,
  winner_id uuid,
  player1_score integer,
  player2_score integer,
  set_scores jsonb,
  status text NOT NULL DEFAULT 'SCHEDULED'::text,
  stage text NOT NULL,
  group_id uuid,
  player1_rating_before integer,
  player2_rating_before integer,
  player1_rating_after integer,
  player2_rating_after integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.tournament_categories(id),
  CONSTRAINT matches_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.users(id),
  CONSTRAINT matches_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.users(id),
  CONSTRAINT matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.users(id),
  CONSTRAINT matches_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.player_registrations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  status USER-DEFINED NOT NULL,
  registered_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT player_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT player_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT player_registrations_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.tournament_categories(id)
);
CREATE TABLE public.rating_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  match_id uuid NOT NULL,
  category_id uuid NOT NULL,
  rating_before integer NOT NULL,
  rating_after integer NOT NULL,
  change integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rating_history_pkey PRIMARY KEY (id),
  CONSTRAINT rating_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT rating_history_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT rating_history_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.tournament_categories(id)
);
CREATE TABLE public.tournament_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL,
  name text NOT NULL,
  format USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'REGISTRATION'::tournament_status,
  gender text,
  age_min integer,
  age_max integer,
  rating_min integer,
  rating_max integer,
  max_participants integer NOT NULL,
  entry_fee numeric NOT NULL DEFAULT 0,
  start_time time without time zone,
  players_per_group integer,
  k_factor integer DEFAULT 32,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tournament_categories_pkey PRIMARY KEY (id),
  CONSTRAINT tournament_categories_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.tournament_events(id)
);
CREATE TABLE public.tournament_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  start_date date NOT NULL,
  location text NOT NULL,
  club_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tournament_events_pkey PRIMARY KEY (id),
  CONSTRAINT tournament_events_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text UNIQUE,
  name text,
  avatar text,
  current_rating integer NOT NULL DEFAULT 1000,
  role USER-DEFINED NOT NULL DEFAULT 'PLAYER'::role,
  club_id uuid,
  birth_date date,
  gender USER-DEFINED,
  bio text,
  city text,
  phone text,
  updated_at timestamp with time zone DEFAULT now(),
  is_test_user boolean DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id)
);
