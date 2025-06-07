// log-patch.js
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace("T", " ").split(".")[0];
}

const originalLog = console.log;
console.log = (...args) => {
  originalLog(`[${getTimestamp()}]`, ...args);
};

const originalError = console.error;
console.error = (...args) => {
  originalError(`[${getTimestamp()}]`, ...args);
};
