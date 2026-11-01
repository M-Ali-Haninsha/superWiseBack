// An error that carries the HTTP status to send back to the client.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (message = "Bad request") => new HttpError(400, message);
const unauthorized = (message = "Unauthorized") => new HttpError(401, message);
const forbidden = (message = "Forbidden") => new HttpError(403, message);
const notFound = (message = "Not found") => new HttpError(404, message);
const conflict = (message = "Conflict") => new HttpError(409, message);
const unprocessable = (message) => new HttpError(422, message);

module.exports = {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
};
