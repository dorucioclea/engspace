import {
    CycleState,
    Id,
    Part,
    PartBase,
    PartBaseInput,
    PartBaseUpdateInput,
    PartCreateNewInput,
    PartInput,
    PartRevision,
    PartUpdateInput,
    PartValidation,
    PartApproval,
} from '@engspace/core';
import {
    partBaseDao,
    partDao,
    partFamilyDao,
    partRevisionDao,
    partValidationDao,
    partApprovalDao,
} from '@engspace/server-db';
import { UserInputError } from 'apollo-server-koa';
import { ApiContext } from '.';
import { assertUserPerm } from './helpers';

export class PartControl {
    async createNew(ctx: ApiContext, input: PartCreateNewInput): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.create');

        const { userId } = ctx.auth;

        const baseRef = await ctx.db.transaction(async db => {
            const fam = await partFamilyDao.bumpCounterById(db, input.familyId);
            return ctx.config.refNaming.partBase.getBaseRef(fam);
        });

        const partBase = await partBaseDao.create(
            ctx.db,
            {
                familyId: input.familyId,
                designation: input.designation,
            },
            baseRef,
            userId
        );

        const ref = ctx.config.refNaming.part.getRef(partBase, input.initialVersion);

        const part = await partDao.create(ctx.db, {
            baseId: partBase.id,
            designation: input.designation,
            ref,
            userId,
        });

        return partRevisionDao.create(ctx.db, {
            partId: part.id,
            designation: input.designation,
            cycleState: CycleState.Edition,
            userId,
        });
    }

    baseById(ctx: ApiContext, baseId: Id): Promise<PartBase> {
        assertUserPerm(ctx, 'part.read');
        return partBaseDao.byId(ctx.db, baseId);
    }

    partById(ctx: ApiContext, partId: Id): Promise<Part> {
        assertUserPerm(ctx, 'part.read');
        return partDao.byId(ctx.db, partId);
    }

    revisionById(ctx: ApiContext, revisionId: Id): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.read');
        return partRevisionDao.byId(ctx.db, revisionId);
    }

    validationById(ctx: ApiContext, validationId: Id): Promise<PartValidation> {
        assertUserPerm(ctx, 'partval.read');
        return partValidationDao.byId(ctx.db, validationId);
    }

    approvalById(ctx: ApiContext, approvalId: Id): Promise<PartApproval> {
        assertUserPerm(ctx, 'partval.read');
        return partApprovalDao.byId(ctx.db, approvalId);
    }

    approvalsByValidationId(ctx: ApiContext, validationId: Id): Promise<PartApproval[]> {
        assertUserPerm(ctx, 'partval.read');
        return partApprovalDao.byValidationId(ctx.db, validationId);
    }

    updateBase(ctx: ApiContext, id: Id, partBase: PartBaseUpdateInput): Promise<PartBase> {
        assertUserPerm(ctx, 'part.update');
        return partBaseDao.updateById(ctx.db, id, partBase, ctx.auth.userId);
    }

    updatePart(ctx: ApiContext, id: Id, input: PartUpdateInput): Promise<Part> {
        assertUserPerm(ctx, 'part.update');
        return partDao.updateById(ctx.db, id, input, ctx.auth.userId);
    }
}

export class PartBaseControl1 {
    async create(ctx: ApiContext, partBase: PartBaseInput): Promise<PartBase> {
        assertUserPerm(ctx, 'part.create');
        const baseRef = await ctx.db.transaction(async db => {
            const fam = await partFamilyDao.bumpCounterById(db, partBase.familyId);
            return ctx.config.refNaming.partBase.getBaseRef(fam);
        });
        return partBaseDao.create(ctx.db, partBase, baseRef, ctx.auth.userId);
    }
}

export class PartControl1 {
    async create(ctx: ApiContext, input: PartInput): Promise<Part> {
        assertUserPerm(ctx, 'part.create');
        const base = await partBaseDao.byId(ctx.db, input.baseId);
        if (!base) {
            throw new UserInputError(`unexisting PartRef: "${input.baseId}"`);
        }
        return partDao.create(ctx.db, {
            baseId: input.baseId,
            designation: input.designation ?? base.designation,
            ref: ctx.config.refNaming.part.getRef(base, input.version),
            userId: ctx.auth.userId,
        });
    }
}
