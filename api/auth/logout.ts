import {redirect} from '../_lib/http.js';
import {clearSessionCookie} from '../_lib/session.js';

export const GET = (): Response => redirect('/', {'Set-Cookie': clearSessionCookie()});
