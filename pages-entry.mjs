import {browserLocalAPI} from './local-api.mjs?v=7';
import {browserTutor} from './may-ai.mjs?v=6';
import {browserSocialAuth} from './social-auth.mjs?v=2';
window.studySocial=browserSocialAuth();
window.studyAI=browserTutor();
window.studyLocal=browserLocalAPI(()=>window.studySocial?.identity());
await import('./app.js?v=17');
