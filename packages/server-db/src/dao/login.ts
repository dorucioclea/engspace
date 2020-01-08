import { Id } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { UserDao } from './user';

export interface LoginResult {
    id: Id;
    name: string;
    roles: string[];
}

/**
 * Interface to the "user_login" table that is used for
 * local username+password authentication
 *
 * The password is seperated from the "user" table to
 * allow an Engspace application to have more advanced
 * authentication strategy
 */
export class LoginDao {
    static async create(db: Db, userId: Id, password: string): Promise<void> {
        await db.query(sql`
            INSERT INTO user_login(user_id, password, updated_on)
            VALUES(${userId}, crypt(${password}, gen_salt('bf')), NOW())
        `);
    }

    static async login(db: Db, nameOrEmail: string, password: string): Promise<LoginResult | null> {
        interface Result {
            id: Id;
            name: string;
            ok: boolean;
        }
        const result: Result = await db.maybeOne(sql`
            SELECT u.id, u.name, (ul.password = crypt(${password}, ul.password)) AS ok
            FROM "user" AS u
            LEFT OUTER JOIN user_login AS ul ON u.id = ul.user_id
            WHERE u.name = ${nameOrEmail} OR u.email = ${nameOrEmail}
        `);
        // null: wrong username or email
        // ok = false: wrong password
        if (result && result.ok) {
            return {
                id: result.id,
                name: result.name,
                roles: await UserDao.rolesById(db, result.id),
            };
        } else {
            return null;
        }
    }

    static async checkById(db: Db, userId: Id, password: string): Promise<boolean> {
        const ok = await db.maybeOneFirst(sql`
            SELECT (password = crypt(${password}, password)) as ok
            FROM user_login WHERE user_id = ${userId}
        `);
        return (ok || false) as boolean;
    }

    static async patch(db: Db, userId: Id, password: string): Promise<void> {
        await db.query(sql`
            UPDATE user_login SET
                password = crypt(${password}, gen_salt('bf')),
                updated_on = NOW()
            WHERE
                user_id = ${userId}
        `);
    }

    static async deleteById(db: Db, userId: Id): Promise<void> {
        await db.query(sql`
            DELETE FROM user_login WHERE user_id = ${userId}
        `);
    }

    static async deleteAll(db: Db): Promise<void> {
        await db.query(sql`
            DELETE FROM user_login
        `);
    }
}
