import { Db, loginDao } from '@engspace/server-db';
import { DemoUserSet } from './user';

export async function createLogins(db: Db, users: Promise<DemoUserSet>): Promise<void> {
    const usrs = await users;
    for (const name in usrs) {
        await loginDao.create(db, usrs[name].id, name);
    }
}
