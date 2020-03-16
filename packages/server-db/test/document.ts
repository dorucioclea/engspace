import { Document } from '@engspace/core';
import { expect } from 'chai';
import { pool } from '.';
import { documentDao } from '../src';
import { cleanTable, createDoc, Dict, transacUsersAB } from '../src/test-helpers';

describe('documentDao', function() {
    let users;
    before('create users', async function() {
        users = await transacUsersAB(pool);
    });

    after('delete users', cleanTable(pool, 'user'));

    describe('Create', function() {
        const msBefore = Date.now();

        afterEach('delete documents', async function() {
            await pool.transaction(async db => documentDao.deleteAll(db));
        });

        it('should create a document with checkout', async function() {
            const result = await pool.transaction(async db => {
                return documentDao.create(
                    db,
                    {
                        name: 'docname',
                        description: 'doc description',
                        initialCheckout: true,
                    },
                    users.a.id
                );
            });
            expect(result.id).to.be.uuid();
            expect(result).to.deep.include({
                name: 'docname',
                description: 'doc description',
                createdBy: { id: users.a.id },
                checkout: { id: users.a.id },
            });
            expect(result.createdAt)
                .to.be.at.least(msBefore)
                .and.at.most(Date.now());
        });

        it('should create a document without checkout', async function() {
            const result = await pool.transaction(async db => {
                return documentDao.create(
                    db,
                    {
                        name: 'docname',
                        description: 'doc description',
                        initialCheckout: false,
                    },
                    users.a.id
                );
            });
            expect(result.id).to.be.uuid();
            expect(result).to.deep.include({
                name: 'docname',
                description: 'doc description',
                createdBy: { id: users.a.id },
                checkout: null,
            });
            expect(result.createdAt)
                .to.be.at.least(msBefore)
                .and.at.most(Date.now());
        });
    });

    describe('Read', function() {
        let docs: Dict<Document>;

        before('create documents', async function() {
            docs = await pool.transaction(async db => {
                return {
                    a: await createDoc(db, users.a, {
                        name: 'a',
                    }),
                    b: await createDoc(db, users.a, {
                        name: 'b',
                    }),
                };
            });
        });

        after('delete documents', async function() {
            return pool.transaction(async db => documentDao.deleteAll(db));
        });

        it('should read a document by id', async function() {
            const result = await pool.connect(async db => {
                return documentDao.byId(db, docs.a.id);
            });
            expect(result).to.deep.include(docs.a);
        });

        it('should read a checkout id by document id', async function() {
            const result = await pool.connect(async db => {
                return documentDao.checkoutIdById(db, docs.a.id);
            });
            expect(result).to.equal(docs.a.checkout.id);
        });

        it('should read a document batch by ids', async function() {
            const result = await pool.connect(async db => {
                return documentDao.batchByIds(db, [docs.b.id, docs.a.id]);
            });
            expect(result).to.eql([docs.b, docs.a]);
        });

        it('should search for documents', async function() {
            const result = await pool.connect(async db => {
                return documentDao.search(db, 'b', 0, 5);
            });
            expect(result).to.eql({
                count: 1,
                documents: [docs.b],
            });
        });

        it('should paginate document search', async function() {
            const { res1, res2 } = await pool.connect(async db => {
                const res1 = await documentDao.search(db, '', 0, 1);
                const res2 = await documentDao.search(db, '', 1, 1);
                return { res1, res2 };
            });
            expect([res1.count, res2.count]).to.eql([2, 2]);
            expect(res1.documents)
                .to.be.an('array')
                .with.lengthOf(1);
            expect(res2.documents)
                .to.be.an('array')
                .with.lengthOf(1);
            expect(res1.documents[0].id).to.satisfy(id => id === docs.a.id || id === docs.b.id);
            expect(res2.documents[0].id).to.satisfy(id => id === docs.a.id || id === docs.b.id);
            expect(res1.documents[0].id).to.not.eql(res2.documents[0].id);
        });
    });

    describe('Checkout', function() {
        afterEach('delete documents', async function() {
            return pool.transaction(async db => documentDao.deleteAll(db));
        });

        it('should checkout a free document', async function() {
            const doc = await pool.transaction(async db => {
                const doc = await documentDao.create(
                    db,
                    {
                        name: 'docname',
                        description: 'doc description',
                        initialCheckout: false,
                    },
                    users.a.id
                );

                return documentDao.checkout(db, doc.id, users.b.id);
            });
            expect(doc).to.deep.include({
                checkout: { id: users.b.id },
            });
        });

        it('shouldnt checkout a busy document', async function() {
            const doc = await pool.transaction(async db => {
                const doc = await documentDao.create(
                    db,
                    {
                        name: 'docname',
                        description: 'doc description',
                        initialCheckout: true,
                    },
                    users.a.id
                );

                return documentDao.checkout(db, doc.id, users.b.id);
            });
            expect(doc).to.deep.include({
                checkout: { id: users.a.id },
            });
        });

        it('should discard checkout a busy document', async function() {
            const doc = await pool.transaction(async db => {
                const doc = await documentDao.create(
                    db,
                    {
                        name: 'docname',
                        description: 'doc description',
                        initialCheckout: true,
                    },
                    users.a.id
                );

                return documentDao.discardCheckout(db, doc.id, users.a.id);
            });
            expect(doc).to.deep.include({
                checkout: null,
            });
        });

        it('shouldnt discard checkout with wrong user', async function() {
            const doc = await pool.transaction(async db => {
                const doc = await documentDao.create(
                    db,
                    {
                        name: 'docname',
                        description: 'doc description',
                        initialCheckout: true,
                    },
                    users.a.id
                );

                return documentDao.discardCheckout(db, doc.id, users.b.id);
            });
            expect(doc).to.deep.include({
                checkout: { id: users.a.id },
            });
        });
    });
});
