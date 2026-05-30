const makeRequestId = () =>
  `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getMeta = (req) => {
  const requestId =
    req.adminRequestId ||
    req.get("x-request-id") ||
    req.headers["x-request-id"] ||
    makeRequestId();

  if (!req.adminRequestId) {
    req.adminRequestId = requestId;
  }

  return {
    requestId,
    timestamp: new Date().toISOString(),
  };
};

export const attachAdminRequestMeta = (req, _res, next) => {
  req.adminRequestId =
    req.get("x-request-id") ||
    req.headers["x-request-id"] ||
    makeRequestId();
  next();
};

export const sendAdminSuccess = (
  req,
  res,
  data = {},
  message = "Operation successful.",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: getMeta(req),
  });
};

export const sendAdminError = (
  req,
  res,
  message = "Internal server error.",
  statusCode = 500,
  errors
) => {
  const body = {
    success: false,
    message,
    meta: getMeta(req),
  };

  if (errors && Object.keys(errors).length > 0) {
    body.errors = errors;
  }

  return res.status(statusCode).json(body);
};
