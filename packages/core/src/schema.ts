export type Id = string;

export enum Role {
    User = 'user',
    Manager = 'manager',
    Admin = 'admin',
}

export enum ProjectRole {
    Leader = 'leader',
    Designer = 'designer',
}

export interface UserInput {
    name: string;
    email: string;
    fullName: string;
    roles?: Role[];
}

export interface User extends UserInput {
    id: Id;
}

export interface ProjectInput {
    name: string;
    code: string;
    description: string;
    members?: ProjectMember[];
}

export interface Project extends ProjectInput {
    id: Id;
}

export interface ProjectMember {
    user: { id: Id } | User;
    leader: boolean;
    designer: boolean;
}
