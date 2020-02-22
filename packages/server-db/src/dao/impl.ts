import { HasId, Id } from '@engspace/core';
import { sql, SqlTokenType } from 'slonik';
import { Db } from '..';
import { Dao } from '.';

export function idsFindMap<T extends HasId>(ids: readonly Id[], objs: T[]): T[] {
    return ids.map(id => objs.find(o => o.id == id));
}

export interface DaoConfigIdent {
    table: string;
    rowToken: SqlTokenType;
}

export class DaoIdent<T extends HasId> implements Dao<T> {
    public readonly table: string;
    public readonly rowToken: SqlTokenType;

    constructor(config: DaoConfigIdent) {
        this.table = config.table;
        this.rowToken = config.rowToken;
    }

    async byId(db: Db, id: Id): Promise<T> {
        const row: T = await db.maybeOne(sql`
            SELECT ${this.rowToken} FROM ${sql.identifier([this.table])}
            WHERE id = ${id}
        `);
        return row;
    }

    async batchByIds(db: Db, ids: readonly Id[]): Promise<T[]> {
        const rows: T[] = await db.any(sql`
            SELECT ${this.rowToken} FROM ${sql.identifier([this.table])}
            WHERE id = ANY(${sql.array(ids as Id[], sql`uuid[]`)})
        `);
        return idsFindMap(ids, rows);
    }

    async deleteById(db: Db, id: Id): Promise<T> {
        const row: T = await db.maybeOne(sql`
            DELETE FROM ${sql.identifier([this.table])}
            WHERE id = ${id}
            RETURNING ${this.rowToken}
        `);
        return row;
    }

    async deleteAll(db: Db): Promise<number> {
        const q = await db.query(sql`
            DELETE FROM ${sql.identifier([this.table])}
        `);
        return q.rowCount;
    }
}

export interface DaoConfigRowMap<T extends HasId, R> {
    table: string;
    rowToken: SqlTokenType;
    mapRow: (row: R) => T;
}

export class DaoRowMap<T extends HasId, R> implements Dao<T> {
    public readonly table: string;
    public readonly mapRow: (row: R) => T;
    public readonly rowToken: SqlTokenType;

    constructor(config: DaoConfigRowMap<T, R>) {
        this.table = config.table;
        this.rowToken = config.rowToken;
        this.mapRow = config.mapRow;
    }

    async byId(db: Db, id: Id): Promise<T> {
        const row: R = await db.maybeOne(sql`
            SELECT ${this.rowToken} FROM ${sql.identifier([this.table])}
            WHERE id = ${id}
        `);
        return this.mapRow(row);
    }

    async batchByIds(db: Db, ids: readonly Id[]): Promise<T[]> {
        const rows: R[] = await db.any(sql`
            SELECT ${this.rowToken} FROM ${sql.identifier([this.table])}
            WHERE id = ANY(${sql.array(ids as Id[], sql`uuid[]`)})
        `);
        return idsFindMap(
            ids,
            rows.map(r => this.mapRow(r))
        );
    }

    async deleteById(db: Db, id: Id): Promise<T> {
        const row: R = await db.maybeOne(sql`
            DELETE FROM ${sql.identifier([this.table])}
            WHERE id = ${id}
            RETURNING ${this.rowToken}
        `);
        return this.mapRow(row);
    }

    async deleteAll(db: Db): Promise<number> {
        const q = await db.query(sql`
            DELETE FROM ${sql.identifier([this.table])}
        `);
        return q.rowCount;
    }
}
