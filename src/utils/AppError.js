class ApiError extends Error {
  constructor(
    statusCode,
    message = "something went wrong",  // typo fixed
    errors = [],                       // comma missing, added
    stack = ""
  ) {
    super(message);                    // 'message' spelling fixed
    this.statusCode = statusCode;     // camelCase consistency
    this.data = null;
    this.message = message;            // spelling fixed and matched
    this.success = false;
    this.errors = errors;              // this.errors = this.errors  -> wrong, fixed

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}


export{ApiError}