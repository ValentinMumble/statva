/** Thrown when Statva's server cannot be reached: the app opens with no network (see sw/sw.js). */
class NoConnectionError extends Error {}

/** fetch, with a plain message when there is no network rather than the browser's own. */
const call = async (input: string, init?: RequestInit): Promise<Response> => {
  try {
    return await fetch(input, init);
  } catch {
    throw new NoConnectionError('No connection to Statva');
  }
};

/**
 * An answer's JSON. A page instead (a café's or a hotel's Wi-Fi login) is an error, never empty
 * data shown or kept on this device.
 */
const readJson = async <T>(response: Response): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error('No answer from Statva: check the connection');
  }
};

export {call, NoConnectionError, readJson};
