const { badRequest } = require("../utils/httpError");

// Validates and replaces req.body / req.params with the parsed result.
function validate({ body, params }) {
  return (req, res, next) => {
    for (const [key, schema] of Object.entries({ body, params })) {
      if (!schema) continue;
      const result = schema.safeParse(req[key] ?? {});
      if (!result.success) {
        const issue = result.error.issues[0];
        const field = issue.path.join(".");
        return next(badRequest(field ? `${field}: ${issue.message}` : issue.message));
      }
      if (key === "body") req.body = result.data;
      else Object.assign(req.params, result.data);
    }
    next();
  };
}

module.exports = validate;
