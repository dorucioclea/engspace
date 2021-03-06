import { ChangePartChange, Id } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoBase, foreignKey, nullable, RowId, toId } from './base';

interface Row {
    id: RowId;
    requestId: RowId;
    partId: RowId;
    version: string;
    designation?: string;
    comments?: string;
}

function mapRow({ id, requestId, partId, version, designation, comments }: Row): ChangePartChange {
    return {
        id: toId(id),
        request: foreignKey(requestId),
        part: foreignKey(partId),
        version,
        designation,
        comments,
    };
}

const rowToken = sql`
    id,
    request_id,
    part_id,
    version,
    designation,
    comments
`;

export interface ChangePartChangeDaoInput {
    requestId: Id;
    partId: Id;
    version: string;
    designation?: string;
    comments?: string;
}

export class ChangePartChangeDao extends DaoBase<ChangePartChange, Row> {
    constructor() {
        super({
            table: 'change_part_change',
            mapRow,
            rowToken,
        });
    }

    async create(
        db: Db,
        { requestId, partId, version, designation, comments }: ChangePartChangeDaoInput
    ): Promise<ChangePartChange> {
        const row: Row = await db.one(sql`
            INSERT INTO change_part_change (
                request_id,
                part_id,
                version,
                designation,
                comments
            )
            VALUES (
                ${requestId},
                ${partId},
                ${version},
                ${nullable(designation)},
                ${nullable(comments)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async byRequestId(db: Db, requestId: Id): Promise<ChangePartChange[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${rowToken}
            FROM change_part_change
            WHERE request_id = ${requestId}
        `);
        return rows?.map(r => mapRow(r));
    }
}
