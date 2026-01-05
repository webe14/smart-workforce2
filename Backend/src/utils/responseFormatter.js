const formatResponse = (data, message = 'Success') => {
  return { success: true, message, data };
};

const formatError = (message = 'Error') => {
  return { success: false, message };
};

export { formatResponse, formatError };