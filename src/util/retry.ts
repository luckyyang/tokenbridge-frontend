const getPromise = (fn, args) => {
  return new Promise((resolve, reject) => {
      if (!args) args = [];
      args.push((err, data) => {
          if (err) return reject(err);
          return resolve(data);
      });
      fn.apply(null, args);
  });
};

const clone = (obj) => {
  if (obj === null || typeof obj !== "object") {
      return obj;
  } else if (Array.isArray(obj)) {
      let clonedArr = [];
      for (const data of obj) {
          clonedArr.push(clone(data));
      }
      return clonedArr;
  } else {
      let clonedObj = {};
      const keys = Object.keys(obj);
      for (const key of keys) {
          clonedObj[key] = clone(obj[key]);
      }
      return clonedObj;
  }
}

/**
 * Retry system with async / await
 *
 * @param {Function} fn : function to execute
 * @param {Array} args : arguments of fn function
 * @param {Object} config : arguments of fn function
 * @property {Number} config.retriesMax : number of retries, by default 3
 * @property {Number} config.interval : interval (in ms) between retry, by default 0
 * @property {Boolean} config.exponential : use exponential retry interval, by default true
 * @property {Number} config.factor: interval incrementation factor
 * @property {Number} config.isCb: is fn a callback style function ?
 */

async function retry(fn, args = [], config = {} as any) {
  const retriesMax = config.retriesMax || 3;
  let interval = config.interval || 0;
  const exponential = config.hasOwnProperty('exponential') ? config.exponential : true;
  const factor = config.factor || 2;

  for (let i = 0; i < retriesMax; i++) {
    try {
      if (!config.isCb) {
        const val = await fn.apply(null, args);
        return val;
      } else {
        const val = await getPromise(fn, clone(args));
        return val;
      }
    } catch (error) {
      if (retriesMax === i + 1 || (error.hasOwnProperty('retryable') && !error.retryable)) throw error;

      interval = exponential ? interval * factor : interval;
      // if interval is set to zero, do not use setTimeout, gain 1 event loop tick
      if (interval) await new Promise(r => setTimeout(r, interval));
    }
  }
};
async function retry3Times(func, params = null) {
  return retry(func, params, { retriesMax: 3, interval: 1000, exponential: false });
}

export default retry3Times;
