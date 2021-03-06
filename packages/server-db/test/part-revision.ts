import { CycleState, PartRevision } from '@engspace/core';
import { expect } from 'chai';
import { dao, pool, th } from '.';
import { idType, trackedBy } from '../src/test-helpers';

describe('PartRevisionDao', function() {
    let users;
    let fam;
    let part;
    before('create deps', async function() {
        return pool.transaction(async db => {
            users = await th.createUsersAB(db);
            fam = await th.createPartFamily(db);
            part = await th.createPart(db, fam, users.a, {});
        });
    });
    after('clean deps', th.cleanTables(['part', 'part_family', 'user']));

    describe('Create', function() {
        afterEach(th.cleanTable('part_revision'));

        it('should create part revision', async function() {
            const pr = await pool.transaction(async db => {
                return dao.partRevision.create(db, {
                    partId: part.id,
                    designation: 'Part 1',
                    cycleState: CycleState.Edition,
                    userId: users.a.id,
                });
            });
            expect(pr.id).to.be.a(idType);
            expect(pr).to.deep.include({
                part: { id: part.id },
                revision: 1,
                designation: 'Part 1',
                cycleState: CycleState.Edition,
                ...trackedBy(users.a),
            });
        });
    });

    describe('byPartId - lastByPartId', function() {
        let partRevs: PartRevision[];
        before(async function() {
            return pool.transaction(async db => {
                partRevs = [];
                partRevs.push(
                    await th.createPartRev(db, part, users.a, { cycleState: CycleState.Obsolete })
                );
                partRevs.push(
                    await th.createPartRev(db, part, users.a, { cycleState: CycleState.Cancelled })
                );
                partRevs.push(
                    await th.createPartRev(db, part, users.a, { cycleState: CycleState.Release })
                );
            });
        });
        after(th.cleanTable('part_revision'));

        it('should get all part revisions', async function() {
            const revs = await pool.connect(async db => {
                return dao.partRevision.byPartId(db, part.id);
            });
            expect(revs).to.eql(partRevs);
        });

        it('should get last part revision', async function() {
            const rev = await pool.connect(async db => {
                return dao.partRevision.lastByPartId(db, part.id);
            });
            expect(rev).to.eql(partRevs[2]);
        });
    });

    describe('Update', function() {
        let partRev;
        beforeEach(async function() {
            partRev = await th.transacPartRev(part, users.a, {
                cycleState: CycleState.Edition,
            });
        });
        afterEach(th.cleanTable('part_revision'));
        it('should update cycle state', async function() {
            const pr = await pool.transaction(async db => {
                return dao.partRevision.updateCycleState(db, partRev.id, CycleState.Release);
            });
            expect(pr).to.eql({
                ...partRev,
                cycleState: CycleState.Release,
            });
        });
    });
});
