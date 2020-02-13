import { createLogins, createUsers, DemoUserSet, prepareUsers } from '@engspace/demo-data';
import chai from 'chai';
import config from 'config';
import http from 'http';
import { sql } from 'slonik';
import { api, pool } from '.';
import { auth } from './auth';
import { verifyJwt } from '../src/crypto';
import { authJwtSecret } from '../src/internal';

const { expect } = chai;

async function deleteAll(): Promise<void> {
    await pool.transaction(async db => db.query(sql`DELETE FROM "user"`));
}

describe('Login', () => {
    const users = prepareUsers();
    let dbUsers: DemoUserSet;
    let server: http.Server;

    before('Create users', async () => {
        dbUsers = await pool.transaction(async db => {
            const usrs = createUsers(db, users);
            await createLogins(db, usrs);
            return usrs;
        });
    });
    before('Start server', done => {
        const { port } = config.get('server');
        server = api.koa.listen(port, done);
    });
    // after('Close server', done => {
    //     server.close(done);
    // });

    after(deleteAll);

    it('should return bearer token', async () => {
        const resp = await chai
            .request(server)
            .post('/api/login')
            .send({
                nameOrEmail: 'gerard',
                password: 'gerard',
            });
        expect(resp.body).to.be.an('object');
        expect(resp.body.token).to.be.a('string');
        const authToken = await verifyJwt(resp.body.token, authJwtSecret);
        expect(authToken).to.deep.include(auth(dbUsers.gerard));
    });
});
