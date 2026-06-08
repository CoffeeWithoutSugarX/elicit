import { describe, it, expect } from 'vitest';
import { BaseResponse } from '@/types/response/BaseResponse';

describe('BaseResponse', () => {
    describe('ofSuccess', () => {
        it('creates a response with status 200 and "Success" message', () => {
            const res = BaseResponse.ofSuccess({ foo: 'bar' });
            expect(res.status).toBe(200);
            expect(res.message).toBe('Success');
        });

        it('stores the provided data', () => {
            const data = { id: 1, name: 'test' };
            const res = BaseResponse.ofSuccess(data);
            expect(res.data).toBe(data);
        });

        it('works with primitive data (string)', () => {
            const res = BaseResponse.ofSuccess('hello');
            expect(res.data).toBe('hello');
        });

        it('works with null data', () => {
            const res = BaseResponse.ofSuccess(null);
            expect(res.data).toBeNull();
        });

        it('works with array data', () => {
            const arr = [1, 2, 3];
            const res = BaseResponse.ofSuccess(arr);
            expect(res.data).toEqual([1, 2, 3]);
        });
    });

    describe('ofError', () => {
        it('creates a response with status -1', () => {
            const res = BaseResponse.ofError('Something went wrong');
            expect(res.status).toBe(-1);
        });

        it('stores the provided error message', () => {
            const res = BaseResponse.ofError('Not found');
            expect(res.message).toBe('Not found');
        });

        it('has null data', () => {
            const res = BaseResponse.ofError('error');
            expect(res.data).toBeNull();
        });

        it('works with empty error message', () => {
            const res = BaseResponse.ofError('');
            expect(res.message).toBe('');
            expect(res.status).toBe(-1);
        });
    });

    describe('isSuccess', () => {
        it('returns true for a success response', () => {
            const res = BaseResponse.ofSuccess('data');
            expect(BaseResponse.isSuccess(res)).toBe(true);
        });

        it('returns false for an error response', () => {
            const res = BaseResponse.ofError('error');
            expect(BaseResponse.isSuccess(res)).toBe(false);
        });

        it('returns true only when status is exactly 200', () => {
            // Manually create a response-like object with status != 200
            const notSuccess = BaseResponse.ofError('x');
            expect(BaseResponse.isSuccess(notSuccess)).toBe(false);

            const success = BaseResponse.ofSuccess(42);
            expect(BaseResponse.isSuccess(success)).toBe(true);
        });
    });
});
