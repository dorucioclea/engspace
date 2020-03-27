import { AuthToken } from '@engspace/core';
import { Db } from '@engspace/server-db';
import { EsServerConfig } from '..';
import { UserControl } from './user';
import { ProjectControl } from './project';
import {
    PartFamilyControl,
    PartBaseControl,
    PartControl,
    PartRevisionControl,
    PartControl2,
} from './part';
import { DocumentControl, DocumentRevisionControl } from './document';

export interface ApiContext {
    db: Db;
    auth: AuthToken;
    config: EsServerConfig;
}

export interface Pagination {
    offset: number;
    limit: number;
}

export interface ControllerSet {
    user: UserControl;
    project: ProjectControl;
    partFamily: PartFamilyControl;
    part2: PartControl2;
    partBase: PartBaseControl;
    part: PartControl;
    partRevision: PartRevisionControl;
    document: DocumentControl;
    documentRevision: DocumentRevisionControl;
}

export function buildControllerSet(custom: Partial<ControllerSet> = {}): ControllerSet {
    return {
        user: custom.user ?? new UserControl(),
        project: custom.project ?? new ProjectControl(),
        partFamily: custom.partFamily ?? new PartFamilyControl(),
        part2: custom.part2 ?? new PartControl2(),
        partBase: custom.partBase ?? new PartBaseControl(),
        part: custom.part ?? new PartControl(),
        partRevision: custom.partRevision ?? new PartRevisionControl(),
        document: custom.document ?? new DocumentControl(),
        documentRevision: custom.documentRevision ?? new DocumentRevisionControl(),
    };
}
