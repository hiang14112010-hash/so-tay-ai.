import {browserLocalAPI} from './local-api.mjs';
import {browserTutor} from './may-ai.mjs?v=1';
window.studyAI=browserTutor();
window.studyLocal=browserLocalAPI();
await import('./app.js?v=7');
