function getTimestamp() {
  const now = new Date().toLocaleString("sv-SE", {
    timeZone: "Europe/Berlin",
  });
  return now.replace("T", " ");
}

const originalLog = console.log;
console.log = (...args) => {
  originalLog(`[${getTimestamp()}]`, ...args);
};

const originalError = console.error;
console.error = (...args) => {
  originalError(`[${getTimestamp()}]`, ...args);
};
