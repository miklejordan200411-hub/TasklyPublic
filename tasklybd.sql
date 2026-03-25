--
-- PostgreSQL database dump
--

\restrict Lscc4lyJLmHwUAoIhlqIcBw6H9wdzKZZWuiYS5O7a0SHdfPaOfmaseUytltNDqL

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.0

-- Started on 2026-03-17 16:11:14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 17736)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5175 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 267 (class 1255 OID 17951)
-- Name: log_task_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_task_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_user UUID;
BEGIN
  -- Читаем текущего пользователя из сессионной переменной
  BEGIN
    v_user := current_setting('app.current_user_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_user := NULL;
  END;

  IF v_user IS NULL THEN
    RETURN NEW;  -- не логируем если нет пользователя
  END IF;

  -- Логируем каждое изменённое поле отдельной строкой
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    INSERT INTO history(task_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'name', OLD.name, NEW.name, v_user);
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO history(task_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, v_user);
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO history(task_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'assigned_to', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT, v_user);
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO history(task_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'priority', OLD.priority::TEXT, NEW.priority::TEXT, v_user);
  END IF;

  IF OLD.deadline_days IS DISTINCT FROM NEW.deadline_days THEN
    INSERT INTO history(task_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'deadline_days', OLD.deadline_days::TEXT, NEW.deadline_days::TEXT, v_user);
  END IF;

  IF OLD.duration IS DISTINCT FROM NEW.duration THEN
    INSERT INTO history(task_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'duration', OLD.duration::TEXT, NEW.duration::TEXT, v_user);
  END IF;

  IF OLD.skill IS DISTINCT FROM NEW.skill THEN
    INSERT INTO history(task_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'skill', OLD.skill, NEW.skill, v_user);
  END IF;

  -- Обновляем updated_at автоматически
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_task_changes() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 225 (class 1259 OID 17894)
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    text text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 17918)
-- Name: history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    field_changed character varying(64) NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid NOT NULL,
    changed_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.history OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 17809)
-- Name: project_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(16) NOT NULL,
    skills text[] DEFAULT '{}'::text[] NOT NULL,
    hours_per_day numeric(4,1) DEFAULT 8 NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL,
    removed_at timestamp without time zone,
    CONSTRAINT project_members_role_check CHECK (((role)::text = ANY ((ARRAY['manager'::character varying, 'worker'::character varying])::text[])))
);


ALTER TABLE public.project_members OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 17790)
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    creator_id uuid NOT NULL,
    invite_code character varying(16) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    owner_id uuid,
    data jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 17988)
-- Name: schedule_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schedule_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    task_id uuid,
    assigned_to uuid,
    start_hour numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.schedule_entries OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 17872)
-- Name: task_dependencies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    depends_on_id uuid NOT NULL,
    CONSTRAINT task_dependencies_check CHECK ((task_id <> depends_on_id))
);


ALTER TABLE public.task_dependencies OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 17840)
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(256) NOT NULL,
    duration numeric(5,1) NOT NULL,
    skill character varying(64) DEFAULT ''::character varying NOT NULL,
    priority smallint DEFAULT 3 NOT NULL,
    deadline_days smallint,
    assigned_to uuid,
    status character varying(16) DEFAULT 'To Do'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    start_day smallint,
    end_day smallint,
    CONSTRAINT tasks_priority_check CHECK (((priority >= 1) AND (priority <= 5))),
    CONSTRAINT tasks_status_check CHECK (((status)::text = ANY ((ARRAY['To Do'::character varying, 'In Progress'::character varying, 'Done'::character varying])::text[])))
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 17958)
-- Name: user_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    skill character varying NOT NULL
);


ALTER TABLE public.user_skills OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 17975)
-- Name: user_work_schedule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_work_schedule (
    user_id uuid NOT NULL,
    work_start smallint DEFAULT 9,
    work_end smallint DEFAULT 18
);


ALTER TABLE public.user_work_schedule OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 17774)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(64) NOT NULL,
    email character varying(128) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_login timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 4991 (class 2606 OID 17907)
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- TOC entry 4994 (class 2606 OID 17931)
-- Name: history history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_pkey PRIMARY KEY (id);


--
-- TOC entry 4974 (class 2606 OID 17827)
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- TOC entry 4976 (class 2606 OID 17829)
-- Name: project_members project_members_project_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_user_id_key UNIQUE (project_id, user_id);


--
-- TOC entry 4968 (class 2606 OID 17803)
-- Name: projects projects_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_invite_code_key UNIQUE (invite_code);


--
-- TOC entry 4970 (class 2606 OID 17801)
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- TOC entry 5005 (class 2606 OID 17998)
-- Name: schedule_entries schedule_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_entries
    ADD CONSTRAINT schedule_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 4987 (class 2606 OID 17881)
-- Name: task_dependencies task_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_pkey PRIMARY KEY (id);


--
-- TOC entry 4989 (class 2606 OID 17883)
-- Name: task_dependencies task_dependencies_task_id_depends_on_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_depends_on_id_key UNIQUE (task_id, depends_on_id);


--
-- TOC entry 4982 (class 2606 OID 17861)
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 4998 (class 2606 OID 17967)
-- Name: user_skills user_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_pkey PRIMARY KEY (id);


--
-- TOC entry 5000 (class 2606 OID 17969)
-- Name: user_skills user_skills_user_id_skill_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_user_id_skill_key UNIQUE (user_id, skill);


--
-- TOC entry 5002 (class 2606 OID 17982)
-- Name: user_work_schedule user_work_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_work_schedule
    ADD CONSTRAINT user_work_schedule_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4961 (class 2606 OID 17789)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4963 (class 2606 OID 17785)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4965 (class 2606 OID 17787)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4992 (class 1259 OID 17947)
-- Name: idx_comments_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_task_id ON public.comments USING btree (task_id);


--
-- TOC entry 4995 (class 1259 OID 17948)
-- Name: idx_history_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_history_task_id ON public.history USING btree (task_id);


--
-- TOC entry 4971 (class 1259 OID 17945)
-- Name: idx_pm_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pm_project_id ON public.project_members USING btree (project_id);


--
-- TOC entry 4972 (class 1259 OID 17946)
-- Name: idx_pm_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pm_user_id ON public.project_members USING btree (user_id);


--
-- TOC entry 4966 (class 1259 OID 18014)
-- Name: idx_projects_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_owner ON public.projects USING btree (owner_id);


--
-- TOC entry 5003 (class 1259 OID 18017)
-- Name: idx_schedule_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_project ON public.schedule_entries USING btree (project_id);


--
-- TOC entry 4983 (class 1259 OID 18016)
-- Name: idx_task_deps_task; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_deps_task ON public.task_dependencies USING btree (task_id);


--
-- TOC entry 4977 (class 1259 OID 17943)
-- Name: idx_tasks_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);


--
-- TOC entry 4978 (class 1259 OID 18015)
-- Name: idx_tasks_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_project ON public.tasks USING btree (project_id);


--
-- TOC entry 4979 (class 1259 OID 17942)
-- Name: idx_tasks_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_project_id ON public.tasks USING btree (project_id);


--
-- TOC entry 4980 (class 1259 OID 17944)
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- TOC entry 4984 (class 1259 OID 17950)
-- Name: idx_td_depends_on_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_td_depends_on_id ON public.task_dependencies USING btree (depends_on_id);


--
-- TOC entry 4985 (class 1259 OID 17949)
-- Name: idx_td_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_td_task_id ON public.task_dependencies USING btree (task_id);


--
-- TOC entry 4996 (class 1259 OID 18018)
-- Name: idx_user_skills_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_skills_user ON public.user_skills USING btree (user_id);


--
-- TOC entry 5022 (class 2620 OID 17952)
-- Name: tasks trg_task_changes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_task_changes BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.log_task_changes();


--
-- TOC entry 5013 (class 2606 OID 17908)
-- Name: comments comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 5014 (class 2606 OID 17913)
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5015 (class 2606 OID 17937)
-- Name: history history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5016 (class 2606 OID 17932)
-- Name: history history_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 5007 (class 2606 OID 17830)
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5008 (class 2606 OID 17835)
-- Name: project_members project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5006 (class 2606 OID 17804)
-- Name: projects projects_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5019 (class 2606 OID 18009)
-- Name: schedule_entries schedule_entries_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_entries
    ADD CONSTRAINT schedule_entries_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- TOC entry 5020 (class 2606 OID 17999)
-- Name: schedule_entries schedule_entries_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_entries
    ADD CONSTRAINT schedule_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5021 (class 2606 OID 18004)
-- Name: schedule_entries schedule_entries_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_entries
    ADD CONSTRAINT schedule_entries_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 5011 (class 2606 OID 17889)
-- Name: task_dependencies task_dependencies_depends_on_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_depends_on_id_fkey FOREIGN KEY (depends_on_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 5012 (class 2606 OID 17884)
-- Name: task_dependencies task_dependencies_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 5009 (class 2606 OID 17867)
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5010 (class 2606 OID 17862)
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5017 (class 2606 OID 17970)
-- Name: user_skills user_skills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5018 (class 2606 OID 17983)
-- Name: user_work_schedule user_work_schedule_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_work_schedule
    ADD CONSTRAINT user_work_schedule_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-03-17 16:11:14

--
-- PostgreSQL database dump complete
--

\unrestrict Lscc4lyJLmHwUAoIhlqIcBw6H9wdzKZZWuiYS5O7a0SHdfPaOfmaseUytltNDqL

