import { optionsFor, request, save } from './common.js';
export const options=optionsFor('compute');
export default function() { request(true); }
export const handleSummary=save;
