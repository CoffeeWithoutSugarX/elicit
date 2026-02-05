export class BaseResponse<T> {
    status: number;
    message: string;
    data: T;

    private constructor(status: number, message: string, data: T) {
        this.status = status;
        this.message = message;
        this.data = data;
    }

    static ofSuccess<T>(data: T): BaseResponse<T> {
        return new BaseResponse(200, "Success", data);
    }

    static ofError(message: string): BaseResponse<null> {
        return new BaseResponse(-1, message, null);
    }

    isSuccess(): boolean {
        return this.status === 200;
    }
}