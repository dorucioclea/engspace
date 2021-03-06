export class CharIterator {
    private _pos = 0;
    constructor(public readonly input: string) {}

    get peek(): string {
        if (this.done) {
            throw new Error('cannot peek on done interator');
        }
        return this.input[this._pos];
    }

    get done(): boolean {
        return this._pos >= this.input.length;
    }

    get pos(): number {
        return this._pos;
    }

    next(): string {
        if (this.done) {
            throw new Error('cannot call next on done iterator');
        }
        const c = this.input[this._pos];
        this._pos++;
        return c;
    }

    back(): void {
        if (this._pos <= 0) {
            throw new Error('cannot go back');
        }
        this._pos--;
    }

    lookAhead(n: number): string {
        if (n > this.input.length - this._pos) {
            n = this.input.length - this._pos;
        }
        return this.input.slice(this._pos, this._pos + n);
    }

    read(n: number): string {
        if (n > this.input.length - this._pos) {
            n = this.input.length - this._pos;
        }
        const r = this.input.slice(this._pos, this._pos + n);
        this._pos += n;
        return r;
    }

    readUntil(s: string, { throws, including } = { throws: true, including: true }): string {
        const ind = this.input.indexOf(s, this._pos);
        const start = this._pos;
        if (ind === -1 && throws) {
            throw new Error(`"${s}" not found in ${this.input.slice(start)}`);
        } else if (ind === -1) {
            this._pos = this.input.length;
            return this.input.slice(start);
        }
        this._pos = including ? ind + s.length : ind;
        return this.input.slice(start, this._pos);
    }
}

export function replaceAt(input: string, index: number, repl: string): string {
    return input.substring(0, index) + repl + input.substring(index + repl.length);
}

export function arraysHaveSameMembers<T>(arr1: readonly T[], arr2: readonly T[]): boolean {
    if (arr1.length !== arr2.length) return false;
    const a1 = arr1.concat().sort();
    const a2 = arr2.concat().sort();
    for (let i = 0; i < a1.length; ++i) {
        if (a1[i] !== a2[i]) return false;
    }
    return true;
}

export function arraysHaveSameMembersMut<T>(arr1: T[], arr2: T[]): boolean {
    if (arr1.length !== arr2.length) return false;
    arr1.sort();
    arr2.sort();
    for (let i = 0; i < arr1.length; ++i) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}
