import { expect } from 'chai';
import { sql } from 'slonik';
import gql from 'graphql-tag';
import { pool, buildGqlServer } from '.';
import { permsAuth } from './auth';
import {
    cleanTables,
    createSingleFamily,
    createSingleUser,
    cleanTable,
    resetFamilyCounters,
} from './helpers';
import { partBaseDao, partFamilyDao } from '@engspace/server-db';

const PARTBASE_FIELDS = gql`
    fragment PartBaseFields on PartBase {
        id
        baseRef
        designation
        family {
            id
        }
        createdBy {
            id
        }
        updatedBy {
            id
        }
        createdAt
        updatedAt
    }
`;

const PARTBASE_READ = gql`
    query ReadPartBase($id: ID!) {
        partBase(id: $id) {
            ...PartBaseFields
        }
    }
    ${PARTBASE_FIELDS}
`;

const PARTBASE_CREATE = gql`
    mutation CreatePartBase($partBase: PartBaseInput!) {
        partBaseCreate(partBase: $partBase) {
            ...PartBaseFields
        }
    }
    ${PARTBASE_FIELDS}
`;

const PARTBASE_UPDATE = gql`
    mutation UpdatePartBase($id: ID!, $partBase: PartBaseUpdateInput!) {
        partBaseUpdate(id: $id, partBase: $partBase) {
            ...PartBaseFields
        }
    }
    ${PARTBASE_FIELDS}
`;

describe('GraphQL PartBase', function() {
    let user;
    let family;
    before(async function() {
        [user, family] = await pool.transaction(async db => {
            return Promise.all([createSingleUser(db), createSingleFamily(db)]);
        });
    });
    after(cleanTables(['part_family', 'user']));

    describe('Query', function() {
        let parts;
        let bef;
        let aft;
        before('create parts', async function() {
            bef = Date.now();
            parts = await pool.transaction(async db => {
                return Promise.all(
                    [1, 2, 3, 4].map(n =>
                        partBaseDao.create(
                            db,
                            { familyId: family.id, designation: `Part ${n}` },
                            `P00${n}`,
                            user.id
                        )
                    )
                );
            });
            aft = Date.now();
        });
        after('delete parts', cleanTable('part_base'));

        it('should query a part', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(user, ['partfamily.read', 'user.read', 'part.read'])
                );
                return query({
                    query: PARTBASE_READ,
                    variables: {
                        id: parts[2].id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.partBase).to.deep.include({
                id: parts[2].id,
                baseRef: 'P003',
                designation: 'Part 3',
                family: { id: family.id },
                createdBy: { id: user.id },
                updatedBy: { id: user.id },
            });
            expect(data.partBase.createdAt)
                .to.be.gte(bef)
                .and.lte(aft);
            expect(data.partBase.updatedAt)
                .to.be.gte(bef)
                .and.lte(aft);
        });

        it('should not query a part without "part.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(user, ['partfamily.read', 'user.read'])
                );
                return query({
                    query: PARTBASE_READ,
                    variables: {
                        id: parts[2].id,
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('part.read');
            expect(data).to.be.null;
        });
    });

    describe('Mutation', function() {
        afterEach(cleanTable('part_base'));
        afterEach(resetFamilyCounters());

        it('should create a PartBase', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(user, ['partfamily.read', 'user.read', 'part.read', 'part.create'])
                );
                return mutate({
                    mutation: PARTBASE_CREATE,
                    variables: {
                        partBase: {
                            familyId: family.id,
                            designation: 'Part',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partBaseCreate).to.deep.include({
                family: { id: family.id },
                baseRef: 'P001',
                designation: 'Part',
                createdBy: { id: user.id },
                updatedBy: { id: user.id },
            });
            expect(data.partBaseCreate.id).to.be.uuid();
            expect(data.partBaseCreate.createdAt).to.be.a('number');
            expect(data.partBaseCreate.updatedAt).to.be.a('number');
        });

        it('should not create a PartBase without "part.create"', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(user, ['partfamily.read', 'user.read', 'part.read'])
                );
                return mutate({
                    mutation: PARTBASE_CREATE,
                    variables: {
                        partBase: {
                            familyId: family.id,
                            designation: 'Part',
                        },
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('part.create');
            expect(data).to.be.null;
        });

        it('can create PartBase up to maximum count', async function() {
            await pool.transaction(async db => {
                return db.query(sql`
                    UPDATE part_family SET counter=998
                `);
            });
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(user, ['partfamily.read', 'user.read', 'part.read', 'part.create'])
                );
                return mutate({
                    mutation: PARTBASE_CREATE,
                    variables: {
                        partBase: {
                            familyId: family.id,
                            designation: 'Part',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partBaseCreate).to.deep.include({
                family: { id: family.id },
                baseRef: 'P999',
                designation: 'Part',
                createdBy: { id: user.id },
                updatedBy: { id: user.id },
            });
            expect(data.partBaseCreate.id).to.be.uuid();
            expect(data.partBaseCreate.createdAt).to.be.a('number');
            expect(data.partBaseCreate.updatedAt).to.be.a('number');
        });

        it('should not create PartBase if family has reached maximum and have no side effect', async function() {
            await pool.transaction(async db => {
                return db.query(sql`
                    UPDATE part_family SET counter=999
                `);
            });
            // the "no side effect" relies on transaction, and should be double tested in end-to-end
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(user, ['partfamily.read', 'user.read', 'part.read', 'part.create'])
                );
                return mutate({
                    mutation: PARTBASE_CREATE,
                    variables: {
                        partBase: {
                            familyId: family.id,
                            designation: 'Part',
                        },
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message.toLowerCase()).to.contain(
                'reached the maximum number of references'
            );
            expect(data).to.be.null;
            const fam = await pool.connect(async db => {
                return partFamilyDao.byId(db, family.id);
            });
            expect(fam.counter).to.equal(999);
        });

        it('should update a PartBase', async function() {
            const part = await pool.transaction(async db => {
                return partBaseDao.create(
                    db,
                    { familyId: family.id, designation: 'A' },
                    'P001',
                    user.id
                );
            });
            const between = Date.now();
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(user, ['partfamily.read', 'user.read', 'part.read', 'part.update'])
                );
                return mutate({
                    mutation: PARTBASE_UPDATE,
                    variables: { id: part.id, partBase: { designation: 'B' } },
                });
            });
            const aft = Date.now();
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.partBaseUpdate).to.deep.include({
                id: part.id,
                family: { id: family.id },
                baseRef: 'P001',
                designation: 'B',
                createdBy: { id: user.id },
                createdAt: part.createdAt,
                updatedBy: { id: user.id },
            });
            expect(data.partBaseUpdate.updatedAt)
                .to.be.gt(data.partBaseUpdate.createdAt)
                .and.gt(between)
                .and.lt(aft);
        });

        it('should not update a PartBase without "part.update"', async function() {
            const part = await pool.transaction(async db => {
                return partBaseDao.create(
                    db,
                    { familyId: family.id, designation: 'A' },
                    'P001',
                    user.id
                );
            });
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(user, ['partfamily.read', 'user.read', 'part.read'])
                );
                return mutate({
                    mutation: PARTBASE_UPDATE,
                    variables: { id: part.id, partBase: { designation: 'B' } },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('part.update');
            expect(data).to.be.null;
        });
    });
});