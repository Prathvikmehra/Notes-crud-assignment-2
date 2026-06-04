const notFound = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null,
  });
};

const errorHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error(error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
    data: null,
  });
};

module.exports = {
  notFound,
  errorHandler,
};

