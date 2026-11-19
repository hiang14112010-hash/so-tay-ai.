import {browserLocalAPI} from './local-api.mjs?v=2';
import {browserTutor} from './may-ai.mjs?v=2';
window.studyAI=browserTutor();
window.studyLocal=browserLocalAPI();
await import('./app.js?v=8');
