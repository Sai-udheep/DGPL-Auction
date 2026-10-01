const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg ? (err.errmsg.match(/(["'])(\\?.)*?\1/) || [''])[0] : '';
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors || {}).map((el) => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your session has expired! Please log in again.', 401);

const handleDevError = (err, res) => {
  if (err.statusCode === 401) {
    return res.status(401).json({ status: 'fail', message: err.message });
  }
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const handleProdError = (err, res) => {
  if (err.statusCode === 401) {
    return res.status(401).json({ status: 'fail', message: err.message });
  }
  if (!err.isOperational) {
    console.error('ERROR 💣: ', err);
    res.status(500).json({
      status: 'Error',
      message: err.message || 'Something went very wrong',
    });
  } else {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
};

const catchError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (err.name === 'CastError') err = handleCastErrorDB(err);
  if (err.code === 11000) err = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') err = handleValidationErrorDB(err);
  if (err.name === 'JsonWebTokenError') err = handleJWTError();
  if (err.name === 'TokenExpiredError') err = handleJWTExpiredError();

  if (process.env.NODE_ENV === 'development') handleDevError(err, res);
  else {
    handleProdError(err, res);
  }
};

module.exports = catchError;
