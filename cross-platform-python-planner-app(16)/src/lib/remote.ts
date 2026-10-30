/* Mobile app: optional "connect to a server" mode.
   When a remote address is saved, the app boots straight into it (see REMOTE_BOOT_SCRIPT). */
export const REMOTE_URL_KEY = "planner.remoteUrl";

export function getRemoteUrl(): string | null {
  try {
    return localStorage.getItem(REMOTE_URL_KEY);
  } catch {
    return null;
  }
}
export function setRemoteUrl(url: string | null) {
  try {
    if (url) localStorage.setItem(REMOTE_URL_KEY, url);
    else localStorage.removeItem(REMOTE_URL_KEY);
  } catch {
    /* ignore */
  }
}
/** Where the remote server should send the user to change the address later. */
export function shellHome(): string {
  return window.location.origin + "/";
}
export function remoteEntryUrl(url: string): string {
  return `${url.replace(/\/+$/, "")}/?shellHome=${encodeURIComponent(shellHome())}`;
}

/** Inline <head> script (mobile build only): redirect to the saved server before anything renders.
 *  `?change=1` (sent by the server's "change server" button) clears the saved address instead. */
export const REMOTE_BOOT_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search);if(q.get('change')==='1'){localStorage.removeItem(${JSON.stringify(REMOTE_URL_KEY)});history.replaceState(null,'',location.pathname);return;}var u=localStorage.getItem(${JSON.stringify(REMOTE_URL_KEY)});if(u){location.replace(u.replace(/\\/+$/,'')+'/?shellHome='+encodeURIComponent(location.origin+'/'));}}catch(e){}})();`;
