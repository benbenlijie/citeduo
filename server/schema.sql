create table if not exists papers (
  id                  text primary key,
  doi                 text unique,
  arxiv_id            text,
  semantic_scholar_id text unique,
  openalex_id         text unique,
  title               text not null,
  abstract            text,
  publication_year    integer,
  publication_date    text,
  citation_count      integer not null default 0,
  reference_count     integer not null default 0,
  authors_text        text not null default '',
  venue               text,
  journal             text,
  url                 text,
  pdf_url             text,
  fields_of_study     text not null default '[]',
  is_open_access      integer not null default 0,
  source              text,
  raw                 text,
  fetched_at          text not null default (datetime('now')),
  created_at          text not null default (datetime('now')),
  updated_at          text not null default (datetime('now'))
);
create index if not exists papers_doi_idx   on papers(doi);
create index if not exists papers_s2_idx    on papers(semantic_scholar_id);
create index if not exists papers_oalex_idx on papers(openalex_id);
create index if not exists papers_year_idx  on papers(publication_year);

create table if not exists authors (
  id                  integer primary key autoincrement,
  name                text not null,
  semantic_scholar_id text unique,
  h_index             integer not null default 0,
  paper_count         integer not null default 0,
  citation_count      integer not null default 0,
  affiliations        text not null default '[]',
  homepage            text,
  created_at          text not null default (datetime('now')),
  updated_at          text not null default (datetime('now'))
);

create table if not exists paper_authors (
  paper_id        text not null references papers(id) on delete cascade,
  author_id       integer not null references authors(id) on delete cascade,
  author_position integer not null default 0,
  primary key (paper_id, author_id)
);
create index if not exists paper_authors_author_idx on paper_authors(author_id);

create table if not exists citations (
  citing_paper_id text not null references papers(id) on delete cascade,
  cited_paper_id  text not null references papers(id) on delete cascade,
  is_influential  integer not null default 0,
  contexts        text not null default '[]',
  created_at      text not null default (datetime('now')),
  primary key (citing_paper_id, cited_paper_id)
);
create index if not exists citations_cited_idx  on citations(cited_paper_id);
create index if not exists citations_citing_idx on citations(citing_paper_id);

create table if not exists paper_networks (
  query_hash    text primary key,
  root_paper_id text not null,
  depth         integer not null default 1,
  max_nodes     integer not null default 100,
  graph_version integer not null default 1,
  network_data  text not null,
  node_count    integer not null default 0,
  edge_count    integer not null default 0,
  generated_at  text not null default (datetime('now')),
  expires_at    text not null
);
create index if not exists paper_networks_expires_idx on paper_networks(expires_at);
create index if not exists paper_networks_root_idx    on paper_networks(root_paper_id);

create table if not exists jobs (
  id          text primary key,
  kind        text not null,
  payload     text not null,
  status      text not null default 'pending',
  attempts    integer not null default 0,
  progress    text not null default '{}',
  result_hash text,
  error       text,
  created_at  text not null default (datetime('now')),
  updated_at  text not null default (datetime('now'))
);
create index if not exists jobs_status_idx on jobs(status, created_at);

create table if not exists search_queries (
  id                integer primary key autoincrement,
  query_text        text,
  query_type        text,
  results_count     integer not null default 0,
  execution_time_ms integer not null default 0,
  created_at        text not null default (datetime('now'))
);

create table if not exists translations (
  hash            text primary key,
  target_lang     text not null,
  source_text     text not null,
  translated_text text not null,
  provider        text,
  created_at      text not null default (datetime('now'))
);
create index if not exists translations_target_idx on translations(target_lang);

create table if not exists paper_relations (
  from_id    text not null,
  to_id      text not null,
  type       text not null,
  weight     real not null default 1,
  source     text,
  updated_at text not null default (datetime('now')),
  primary key (from_id, to_id, type)
);
create index if not exists paper_relations_from_idx on paper_relations(from_id, type);
create index if not exists paper_relations_to_idx   on paper_relations(to_id, type);

create table if not exists paper_embeddings (
  id         text primary key,
  model      text not null,
  vector     text not null,
  updated_at text not null default (datetime('now'))
);

create table if not exists paper_content (
  arxiv_id   text primary key,
  title      text not null default '',
  source     text not null default 'html',
  fetched_at text not null default (datetime('now')),
  expires_at text not null
);

create table if not exists paper_sections (
  arxiv_id text not null references paper_content(arxiv_id) on delete cascade,
  idx      integer not null,
  heading  text not null default '',
  text     text not null default '',
  primary key (arxiv_id, idx)
);

create table if not exists ai_sessions (
  arxiv_id   text primary key,
  session_id text not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create unique index if not exists ai_sessions_session_idx on ai_sessions(session_id);

-- First-party usage analytics. One row per meaningful client action; no raw
-- IPs, user agents or message bodies. `visitor_id` is a random first-party
-- cookie value, `session_id` is derived from it and a 30-minute window.
create table if not exists usage_events (
  id          integer primary key autoincrement,
  visitor_id  text not null,
  session_id  text not null,
  event       text not null,
  path        text,
  paper_id    text,
  query       text,
  referrer    text,
  browser     text,
  device      text,
  status      integer,
  meta        text not null default '{}',
  created_at  text not null default (datetime('now'))
);
create index if not exists usage_events_created_idx   on usage_events(created_at);
create index if not exists usage_events_event_idx     on usage_events(event, created_at);
create index if not exists usage_events_visitor_idx   on usage_events(visitor_id, created_at);
create index if not exists usage_events_paper_idx     on usage_events(paper_id, created_at);

-- Public-demo daily budget. `day` is the local calendar day; once `blocked`
-- flips, the rest of that day is refused without touching the counter again.
-- `demo_visitors` deduplicates the anonymous cookie id per day.
create table if not exists demo_daily (
  day         text primary key,
  requests    integer not null default 0,
  visitors    integer not null default 0,
  blocked     integer not null default 0,
  alerted_at  text,
  created_at  text not null default (datetime('now')),
  updated_at  text not null default (datetime('now'))
);

create table if not exists demo_visitors (
  day         text not null,
  visitor_id  text not null,
  created_at  text not null default (datetime('now')),
  primary key (day, visitor_id)
);
