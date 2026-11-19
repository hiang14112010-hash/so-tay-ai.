import {browserLocalAPI} from './local-api.mjs?v=3';
import {browserTutor} from './may-ai.mjs?v=4';
window.studyAI=browserTutor();
window.studyLocal=browserLocalAPI();
await import('./app.js?v=10');
