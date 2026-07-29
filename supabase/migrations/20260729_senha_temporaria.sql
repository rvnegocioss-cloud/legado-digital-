alter table usuarios add column if not exists senha_temporaria boolean not null default false;
comment on column usuarios.senha_temporaria is 'true = conta criada por convite com senha gerada; forca troca no 1o acesso.';
