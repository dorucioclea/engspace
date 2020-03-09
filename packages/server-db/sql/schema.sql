CREATE TABLE metadata (
    schema_version integer,
    application_id text
);

CREATE TABLE "user" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v1mc(),
    name text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE,
    full_name text NOT NULL
);

CREATE TABLE user_login (
    user_id uuid PRIMARY KEY,
    password text NOT NULL,

    FOREIGN KEY(user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE user_role (
    user_id uuid,
    role text NOT NULL,

    PRIMARY KEY(user_id, role),
    FOREIGN KEY(user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE project (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v1mc(),
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    description text
);

CREATE TABLE project_member (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v1mc(),
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,

    UNIQUE(project_id, user_id),
    FOREIGN KEY(project_id) REFERENCES project(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES "user"(id)
);

CREATE TABLE project_member_role (
    member_id uuid NOT NULL,
    role text NOT NULL,

    PRIMARY KEY(member_id, role),
    FOREIGN KEY(member_id) REFERENCES project_member(id)
            ON DELETE CASCADE
);

CREATE TABLE document (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v1mc(),
    name text NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL,
    checkout uuid,

    FOREIGN KEY(created_by) REFERENCES "user"(id),
    FOREIGN KEY(checkout) REFERENCES "user"(id)
);

CREATE TABLE document_revision (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v1mc(),
    document_id uuid NOT NULL,
    revision integer NOT NULL,
    filename text NOT NULL,
    filesize integer NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL,
    change_description text,

    uploaded integer NOT NULL DEFAULT 0,
    sha1 bytea, -- initially null, set after check on both client and server

    CHECK(filesize > 0),
    CHECK(uploaded >= 0 AND uploaded <= filesize),
    UNIQUE(document_id, revision),
    FOREIGN KEY(document_id) REFERENCES document(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id)
);

CREATE TABLE part_family (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v1mc(),
    name text NOT NULL,
    code text NOT NULL,
    counter integer NOT NULL DEFAULT 0
);

CREATE TABLE part_base (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v1mc(),
    family_id uuid NOT NULL,
    base_ref text NOT NULL,
    designation text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL,
    updated_by uuid,
    updated_at timestamptz,

    UNIQUE(base_ref),
    FOREIGN KEY(family_id) REFERENCES part_family(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id),
    FOREIGN KEY(updated_by) REFERENCES "user"(id)
);