import { expect } from 'chai';
import { pool } from '.';
import { partRevisionDao } from '../src';
import {
    cleanTable,
    cleanTables,
    createPart,
    createPartBase,
    createPartFamily,
    createUsersAB,
    transacPartRev,
    trackedBy,
} from '../src/test-helpers';
import { CycleState } from '@engspace/core';

describe('partRevisionDao', function() {
    let users;
    let fam;
    let partBase;
    let part;
    before('create deps', async function() {
        return pool.transaction(async db => {
            users = await createUsersAB(db);
            fam = await createPartFamily(db, { code: 'P' });
            partBase = await createPartBase(db, fam, users.a, 'P01');
            part = await createPart(db, partBase, users.a, 'P01.A');
        });
    });
    after('clean deps', cleanTables(pool, ['part', 'part_base', 'part_family', 'user']));

    describe('Create', function() {
        afterEach(cleanTable(pool, 'part_revision'));

        it('should create part revision', async function() {
            const pr = await pool.transaction(async db => {
                return partRevisionDao.create(db, {
                    partId: part.id,
                    designation: 'Part 1',
                    cycleState: CycleState.Edition,
                    userId: users.a.id,
                });
            });
            expect(pr.id).to.be.uuid();
            expect(pr).to.deep.include({
                part: { id: part.id },
                revision: 1,
                designation: 'Part 1',
                cycleState: CycleState.Edition,
                ...trackedBy(users.a),
            });
        });
    });

    describe('Update', function() {
        let partRev;
        beforeEach(async function() {
            partRev = await transacPartRev(pool, part, users.a, {
                cycleState: CycleState.Edition,
            });
        });
        afterEach(cleanTable(pool, 'part_revision'));
        it('should update cycle state', async function() {
            const pr = await pool.transaction(async db => {
                return partRevisionDao.updateCycleState(db, partRev.id, CycleState.Release);
            });
            expect(pr).to.eql({
                ...partRev,
                cycleState: CycleState.Release,
            });
        });
    });
});
