export class ApiError extends Error {
  public readonly status: number;
  public readonly data?: unknown;

  constructor(
    message: string,
    status: number,
    data?: unknown
  ) {
    super(message);
    this.status = status;
    this.data = data;

    this.name = "ApiError";

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}