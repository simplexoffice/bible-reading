create table if not exists sessions (
  n integer primary key,
  done boolean not null default false
);

create table if not exists chapters (
  key text primary key
);

create table if not exists sync_key (
  id integer primary key,
  salt text not null,
  key_hash text not null
);
