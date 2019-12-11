import chai from 'chai';
import config from 'config';
import { sql } from 'slonik';
import { createDbPool, DbConfig } from '../src';

const { expect } = chai;

describe('Pool creation', async () => {
    const dbConf: DbConfig = config.get('db');
    const localConf = {
        ...dbConf,
        name: 'engspace_db_test2',
        formatDb: true,
    };
    it('should create a pool with schema', async function() {
        this.timeout(5000);
        const pool = await createDbPool(localConf);
        const tables = await pool.connect(db =>
            db.manyFirst(sql`
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
            `)
        );
        expect(tables).to.have.members([
            'metadata',
            'user',
            'user_login',
            'user_role',
            'project',
            'project_member',
            'project_member_role',
        ]);
    });
});
