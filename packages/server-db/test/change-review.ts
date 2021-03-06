import { dao, pool, th } from '.';
import { expect } from 'chai';
import { trackedBy } from '../src';
import { ApprovalDecision } from '@engspace/core';

describe('ChangeReviewDao', function() {
    let users;
    let req;
    before(async function() {
        await pool.transaction(async db => {
            users = await th.createUsersAB(db);
            req = await th.createChangeRequest(db, users.a);
        });
    });
    after(th.cleanTables(['change_request', 'user']));

    describe('create', function() {
        this.afterEach(th.cleanTable('change_review'));

        it('should create a ChangeReview', async function() {
            const rev = await pool.transaction(async db => {
                return dao.changeReview.create(db, {
                    requestId: req.id,
                    assigneeId: users.b.id,
                    userId: users.a.id,
                });
            });
            expect(rev).to.deep.include({
                request: { id: req.id },
                assignee: { id: users.b.id },
                decision: ApprovalDecision.Pending,
                comments: null,
                ...trackedBy(users.a),
            });
        });

        it('should create a ChangeReview with decision', async function() {
            const rev = await pool.transaction(async db => {
                return dao.changeReview.create(db, {
                    requestId: req.id,
                    assigneeId: users.b.id,
                    userId: users.a.id,
                    decision: ApprovalDecision.Reserved,
                });
            });
            expect(rev).to.deep.include({
                request: { id: req.id },
                assignee: { id: users.b.id },
                decision: ApprovalDecision.Reserved,
                comments: null,
                ...trackedBy(users.a),
            });
        });

        it('should create a ChangeReview with decision and comments', async function() {
            const rev = await pool.transaction(async db => {
                return dao.changeReview.create(db, {
                    requestId: req.id,
                    assigneeId: users.b.id,
                    userId: users.a.id,
                    decision: ApprovalDecision.Reserved,
                    comments: 'Some comment',
                });
            });
            expect(rev).to.deep.include({
                request: { id: req.id },
                assignee: { id: users.b.id },
                decision: ApprovalDecision.Reserved,
                comments: 'Some comment',
                ...trackedBy(users.a),
            });
        });
    });

    describe('byRequestId', function() {
        let reviews;
        before(async function() {
            return pool.transaction(async db => {
                reviews = [await th.createChangeReview(db, req, users.a, users.b)];
            });
        });

        after(th.cleanTable('change_review'));

        it('should read ChangeReview by request id', async function() {
            const cr = await pool.connect(async db => {
                return dao.changeReview.byRequestId(db, req.id);
            });
            expect(cr).to.have.same.deep.members(reviews);
        });

        it('should return empty if no ChangeeReview', async function() {
            const cr = await pool.connect(async db => {
                return dao.changeReview.byRequestId(db, '-1');
            });
            expect(cr).to.be.empty;
        });
    });
});
